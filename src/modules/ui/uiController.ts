import { Sentence, ProcessedText } from '../../types/interfaces';
import { helpText } from '../../constants/helpText';
import { DiagramGenerator } from '../diagram/diagramGenerator';
import { SyntaxHighlighter } from './syntaxHighlighter';
import { ValidationService, ValidationWarnings } from '../utils/validation';
import { SVGExporter } from '../utils/svgExporter';
import { ValidationError, DiagramError, RenderError } from '../../types/errors';
import { ok, err, Result } from 'neverthrow';
import mermaid from 'mermaid';
import { umlPatterns } from '../diagram/diagramPatterns';

type DiagramType = keyof typeof helpText;

export class UIController {
    private diagramGenerator: DiagramGenerator;
    private syntaxHighlighter: SyntaxHighlighter;
    private validationService: ValidationService;
    private svgExporter: SVGExporter;
    private sentences: Sentence[] = [];
    private mermaidCode: string = '';
    private currentDiagramType: DiagramType = 'activity';

    // DOM Elements
    private readonly textInput: HTMLTextAreaElement;
    private readonly sentencesList: HTMLElement;
    private readonly diagramDiv: HTMLElement;
    private readonly downloadButton: HTMLButtonElement;
    private readonly diagramType: HTMLSelectElement;
    private readonly relationshipType: HTMLSelectElement;
    private readonly inputHighlighter: HTMLElement;

    constructor() {
        // Initialize DOM elements first
        const elements = this.initializeElements();
        if (!elements) {
            throw new Error('Required DOM elements not found');
        }
        
        // Initialize services
        this.diagramGenerator = new DiagramGenerator();
        this.syntaxHighlighter = new SyntaxHighlighter();
        this.validationService = new ValidationService();
        this.svgExporter = new SVGExporter();

        // Assign DOM elements
        this.textInput = elements.textInput;
        this.sentencesList = elements.sentencesList;
        this.diagramDiv = elements.diagramDiv;
        this.downloadButton = elements.downloadButton;
        this.diagramType = elements.diagramType;
        this.relationshipType = elements.relationshipType;
        this.inputHighlighter = elements.inputHighlighter;
    }

    private initializeElements(): {
        textInput: HTMLTextAreaElement;
        sentencesList: HTMLElement;
        diagramDiv: HTMLElement;
        downloadButton: HTMLButtonElement;
        diagramType: HTMLSelectElement;
        relationshipType: HTMLSelectElement;
        inputHighlighter: HTMLElement;
    } | null {
        const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
        const sentencesList = document.getElementById('sentences-list');
        const diagramDiv = document.getElementById('diagram');
        const downloadButton = document.getElementById('download-svg') as HTMLButtonElement;
        const diagramType = document.getElementById('diagram-type') as HTMLSelectElement;
        const relationshipType = document.getElementById('relationship-type') as HTMLSelectElement;
        const inputHighlighter = document.querySelector('.input-highlighter');

        if (!textInput || !sentencesList || !diagramDiv || !downloadButton || 
            !diagramType || !relationshipType || !inputHighlighter) {
            return null;
        }

        return {
            textInput,
            sentencesList,
            diagramDiv,
            downloadButton,
            diagramType,
            relationshipType,
            inputHighlighter: inputHighlighter as HTMLElement
        };
    }

    public initialize(): void {
        this.initializeEventListeners();
        this.initializeMermaidCodeEditor();
        this.updateHelpText();
        this.textInput.disabled = false;
        this.keepInputFocused();
    }

    private initializeEventListeners(): void {
        this.textInput.addEventListener('input', this.handleInput.bind(this));
        this.textInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.diagramType.addEventListener('change', this.handleDiagramTypeChange.bind(this));
        this.downloadButton.addEventListener('click', this.handleDownload.bind(this));
        document.body.addEventListener('click', this.handleBodyClick.bind(this));
        
        // Sentence list event listeners
        this.sentencesList.addEventListener('click', this.handleSentenceAction.bind(this));
        this.initializeDragAndDrop();
        
        this.sentencesList.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('sentence-edit-action')) {
                const input = target.closest('.sentence-edit')?.querySelector('.sentence-edit-input') as HTMLInputElement;
                if (input) {
                    if (target.classList.contains('save')) {
                        this.handleEditSave(input);
                    } else {
                        this.updateSentencesList(); // Cancel - just revert
                    }
                }
            }
        });
        
        this.sentencesList.addEventListener('keydown', (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('sentence-edit-input')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleEditSave(target as HTMLInputElement);
                } else if (e.key === 'Escape') {
                    this.updateSentencesList();
                }
            }
        });
    }

    private initializeDragAndDrop(): void {
        let draggedItem: HTMLElement | null = null;
        let draggedIndex: number = -1;

        this.sentencesList.addEventListener('dragstart', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (!target.classList.contains('sentence-item')) return;
            
            draggedItem = target;
            draggedIndex = Array.from(this.sentencesList.children).indexOf(target);
            target.classList.add('dragging');
            
            // Set drag image to the entire sentence item
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedIndex.toString());
            }
        });

        this.sentencesList.addEventListener('dragend', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (!target.classList.contains('sentence-item')) return;
            
            target.classList.remove('dragging');
            draggedItem = null;
            draggedIndex = -1;
        });

        this.sentencesList.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            if (!draggedItem) return;

            const target = e.target as HTMLElement;
            const sentenceItem = target.closest('.sentence-item');
            if (!sentenceItem || sentenceItem === draggedItem) return;

            const currentItems = Array.from(this.sentencesList.children);
            const draggedRect = draggedItem.getBoundingClientRect();
            const targetRect = sentenceItem.getBoundingClientRect();
            const dropIndex = currentItems.indexOf(sentenceItem);
            
            if (dropIndex > draggedIndex) {
                sentenceItem.parentNode?.insertBefore(draggedItem, sentenceItem.nextSibling);
            } else {
                sentenceItem.parentNode?.insertBefore(draggedItem, sentenceItem);
            }
        });

        this.sentencesList.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            if (!draggedItem) return;

            const newIndex = Array.from(this.sentencesList.children).indexOf(draggedItem);
            if (newIndex !== draggedIndex && newIndex !== -1) {
                // Update the sentences array
                const [movedSentence] = this.sentences.splice(draggedIndex, 1);
                this.sentences.splice(newIndex, 0, movedSentence);
                
                // Update the diagram
                this.updateDiagram();
            }
        });
    }

    private updateHelpText(): void {
        const type = this.diagramType.value as DiagramType;
        const helpDiv = document.getElementById('help-text');
        if (helpDiv) {
            helpDiv.innerHTML = `
                <h3>Example inputs for ${type} diagram:</h3>
                <ul>
                    ${helpText[type].map(text => `<li>${text}</li>`).join('')}
                </ul>
            `;
        }
    }

    private updateRelationshipVisibility(): void {
        const type = this.diagramType.value;
        const relationshipDiv = document.querySelector('.relationship-type') as HTMLElement;
        if (relationshipDiv) {
            relationshipDiv.style.display = type === 'class' ? 'block' : 'none';
        }
    }

    private keepInputFocused(): void {
        this.textInput.focus();
    }

    private handleInput = (e: Event): void => {
        const target = e.target as HTMLTextAreaElement;
        this.inputHighlighter.innerHTML = this.syntaxHighlighter.highlightSyntax(target.value);
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };

    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const value = target.value.trim();
            if (value) {
                this.processInput(value);
            }
        }
    };

    private processInput(text: string): void {
        try {
            const type = this.diagramType.value;
            const umlElements = this.processUMLText(text, type);
            const uml: ProcessedText = {
                type,
                elements: umlElements
            };

            this.sentences.push({ text, uml });
            
            this.updateDiagram();
            this.updateSentencesList();
            this.resetInput();
        } catch (error) {
            console.error('Error processing input:', error);
        }
    }

    private processUMLText(text: string, type: string): any[] {
        const patterns = umlPatterns[type]?.patterns || [];
        const elements: any[] = [];

        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                if (pattern.type === 'decision') {
                    elements.push({
                        type: pattern.type,
                        name: match[1],      // condition
                        related: match[2],    // then part
                        else: match[3],       // else part
                        text: text
                    });
                } else if (pattern.type === 'flow') {
                    elements.push({
                        type: pattern.type,
                        name: match[1],
                        related: match[2],
                        text: text
                    });
                } else {
                    elements.push({
                        type: pattern.type,
                        name: match[1],
                        related: match[2] || undefined,
                        text: text
                    });
                }
                break;
            }
        }

        return elements;
    }

    private resetInput(): void {
        this.textInput.value = '';
        this.inputHighlighter.innerHTML = '';
        this.textInput.focus();
        this.textInput.style.height = 'auto';
    }

    private async updateDiagram(): Promise<void> {
        let diagram = '';
        
        switch (this.currentDiagramType) {
            case 'activity':
                const validationResult = this.validationService.validateActivityDiagram(this.sentences);
                
                if (validationResult.isErr()) {
                    this.showError(validationResult.error.message);
                    return;
                }

                const { warnings } = validationResult.value;
                this.showWarnings(warnings);

                const diagramResult = this.diagramGenerator.generateActivityDiagram(this.sentences);
                
                if (diagramResult.isErr()) {
                    this.showError(diagramResult.error.message);
                    return;
                }

                diagram = diagramResult.value;
                break;

            case 'class':
                // Add other diagram type handlers
                break;
            case 'sequence':
                // Add other diagram type handlers
                break;
        }
        
        this.updateMermaidCode(diagram);
        
        const diagramElement = document.getElementById('diagram');
        if (diagramElement) {
            diagramElement.innerHTML = '';
            try {
                const { svg } = await mermaid.render('diagram-svg', diagram);
                diagramElement.innerHTML = svg;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.showError(`Failed to render diagram: ${message}`);
            }
        }
    }

    private updateSentencesList(): void {
        this.sentencesList.innerHTML = this.sentences
            .map((sentence, index) => this.createSentenceElement(sentence))
            .join('');
    }

    private createSentenceElement(sentence: Sentence): string {
        const icon = this.getIconForType(sentence.uml.elements[0]?.type);
        return `
            <div class="sentence-item" draggable="true">
                <div class="sentence-content">
                    <span class="sentence-icon drag-handle" title="Drag to reorder">⋮⋮</span>
                    <span class="sentence-type-icon">${icon}</span>
                    <div class="sentence-text">
                        ${this.syntaxHighlighter.highlightSyntax(sentence.text)}
                    </div>
                </div>
                <div class="sentence-actions">
                    <button class="sentence-action edit" title="Edit">✎</button>
                    <button class="sentence-action delete" title="Delete">✕</button>
                </div>
            </div>
        `;
    }

    private createEditableElement(text: string, index: number): string {
        return `
            <div class="sentence-edit">
                <input type="text" class="sentence-edit-input" value="${text}" data-index="${index}">
                <div class="sentence-edit-actions">
                    <button class="sentence-edit-action save">Save</button>
                    <button class="sentence-edit-action cancel">Cancel</button>
                </div>
            </div>
        `;
    }

    private getIconForType(type?: string): string {
        switch (type) {
            case 'start':
                return '⭐';
            case 'process':
                return '⬚';
            case 'decision':
                return '◇';
            case 'flow':
                return '→';
            case 'document':
                return '📄';
            case 'connection':
                return '⭕';
            case 'end':
                return '🔚';
            default:
                return '•';
        }
    }

    private handleDiagramTypeChange(): void {
        this.updateHelpText();
        this.updateRelationshipVisibility();
    }

    private handleDownload(): void {
        this.svgExporter.exportSVG(this.diagramDiv);
    }

    private handleBodyClick(e: MouseEvent): void {
        // Don't refocus if text is selected
        if (window.getSelection()?.toString() ||
            document.activeElement?.classList.contains('mermaid-code-editor')) {
            return;
        }
        
        const target = e.target as HTMLElement;
        if (target !== this.downloadButton && 
            !target.closest('select') && 
            !target.closest('.glossary-sidebar') &&
            !target.closest('.help-text') &&
            !target.closest('#sentences-list')) {
            this.keepInputFocused();
        }
    }

    private handleSentenceAction(e: Event): void {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('sentence-action')) return;

        const sentenceItem = target.closest('.sentence-item') as HTMLElement;
        const index = Array.from(this.sentencesList.children).indexOf(sentenceItem);

        if (target.classList.contains('delete')) {
            this.sentences.splice(index, 1);
            this.updateDiagram();
            this.updateSentencesList();
        } else if (target.classList.contains('edit')) {
            const textElement = sentenceItem.querySelector('.sentence-text');
            if (textElement) {
                const text = this.sentences[index].text;
                textElement.innerHTML = this.createEditableElement(text, index);
                const input = textElement.querySelector('.sentence-edit-input') as HTMLInputElement;
                input?.focus();
                input?.select();
            }
        }
    }

    private handleEditSave(input: HTMLInputElement): void {
        const index = parseInt(input.dataset.index || '0', 10);
        const newText = input.value.trim();
        
        if (newText) {
            const type = this.diagramType.value;
            const umlElements = this.processUMLText(newText, type);
            this.sentences[index] = {
                text: newText,
                uml: {
                    type,
                    elements: umlElements
                }
            };
            this.updateDiagram();
            this.updateSentencesList();
        }
    }

    private initializeMermaidCodeEditor(): void {
        const codeEditor = document.getElementById('mermaid-code') as HTMLTextAreaElement;
        const copyButton = document.getElementById('copy-code');
        const applyButton = document.getElementById('apply-code');

        if (codeEditor && copyButton && applyButton) {
            copyButton.addEventListener('click', () => this.copyMermaidCode());
            applyButton.addEventListener('click', () => this.applyMermaidCodeChanges());
            codeEditor.addEventListener('input', () => this.handleCodeEditorInput());
        }
    }

    private updateMermaidCode(code: string): void {
        this.mermaidCode = code;
        const codeEditor = document.getElementById('mermaid-code') as HTMLTextAreaElement;
        if (codeEditor) {
            codeEditor.value = code;
        }
    }

    private async copyMermaidCode(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.mermaidCode);
            // Optional: Show a success message
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    }

    private async applyMermaidCodeChanges(): Promise<void> {
        const codeEditor = document.getElementById('mermaid-code') as HTMLTextAreaElement;
        if (!codeEditor) return;

        try {
            // Validate the Mermaid syntax
            await mermaid.parse(codeEditor.value);
            
            // If valid, update the diagram
            const diagram = document.getElementById('diagram');
            if (diagram) {
                diagram.innerHTML = '';
                const { svg } = await mermaid.render('diagram-svg', codeEditor.value);
                diagram.innerHTML = svg;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.showError(`Invalid Mermaid syntax: ${message}`);
        }
    }

    private handleCodeEditorInput(): void {
        // Optional: Add real-time validation or other features
    }

    private showError(message: string): void {
        const diagramElement = document.getElementById('diagram');
        if (diagramElement) {
            diagramElement.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    private showWarnings(warnings: string[]): void {
        const diagramContainer = document.querySelector('.diagram-container');
        const existingWarnings = diagramContainer?.querySelector('.warnings-message');
        
        // Always remove existing warnings
        if (existingWarnings) {
            existingWarnings.remove();
        }

        // Only add new warnings if there are any
        if (warnings.length > 0) {
            const warningsElement = document.createElement('div');
            warningsElement.className = 'warnings-message';
            warningsElement.innerHTML = `
                <h3>Warnings</h3>
                <ul>
                    ${warnings.map(warning => `<li>${warning}</li>`).join('')}
                </ul>
            `;

            if (diagramContainer) {
                diagramContainer.insertBefore(warningsElement, diagramContainer.firstChild);
            }
        }
    }
} 
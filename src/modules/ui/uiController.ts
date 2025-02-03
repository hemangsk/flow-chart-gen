import { Sentence, ProcessedText } from '../../types/interfaces';
import { helpText } from '../../constants/helpText';
import { DiagramGenerator } from '../diagram/diagramGenerator';
import { SyntaxHighlighter } from './syntaxHighlighter';
import { ValidationService } from '../utils/validation';
import { SVGExporter } from '../utils/svgExporter';
import mermaid from 'mermaid';
import { umlPatterns } from '../diagram/diagramPatterns';

type DiagramType = keyof typeof helpText;

export class UIController {
    private sentences: Sentence[] = [];
    private diagramGenerator: DiagramGenerator;
    private syntaxHighlighter: SyntaxHighlighter;
    private validationService: ValidationService;
    private svgExporter: SVGExporter;

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
        this.setupEventListeners();
        this.updateHelpText();
        this.updateRelationshipVisibility();
        this.textInput.disabled = false;
        this.keepInputFocused();
    }

    private setupEventListeners(): void {
        this.textInput.addEventListener('input', this.handleInput.bind(this));
        this.textInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.diagramType.addEventListener('change', this.handleDiagramTypeChange.bind(this));
        this.downloadButton.addEventListener('click', this.handleDownload.bind(this));
        document.body.addEventListener('click', this.handleBodyClick.bind(this));
        this.sentencesList.addEventListener('click', this.handleSentenceAction.bind(this));
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
        try {
            const diagram = this.diagramGenerator.generateActivityDiagram(this.sentences);
            this.diagramDiv.innerHTML = `<pre class="mermaid">${diagram}</pre>`;
            await mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        } catch (error) {
            console.error('Error updating diagram:', error);
            this.diagramDiv.innerHTML = '<div class="error">Error rendering diagram</div>';
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
            <div class="sentence-item">
                <div class="sentence-content">
                    <span class="sentence-icon">${icon}</span>
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
        if (window.getSelection()?.toString()) {
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
} 
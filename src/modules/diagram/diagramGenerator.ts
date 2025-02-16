import { Sentence } from '../../types/interfaces';
import { DiagramError, DiagramResult } from '../../types/errors';
import { ok, err } from 'neverthrow';
import mermaid from 'mermaid';

export class DiagramGenerator {
    private nodeCount = 0;
    private linkCount = 0;
    private nodeMap = new Map<string, string>();

    public generateActivityDiagram(sentences: Sentence[]): DiagramResult<string> {
        try {
            if (!sentences.length) {
                return err(new DiagramError('No sentences provided to generate diagram'));
            }

            this.nodeCount = 0;
            this.linkCount = 0;
            this.nodeMap.clear();

            let diagram = this.generateDiagramHeader();
            let lastNode: string | null = null;

            // Process all nodes
            for (const sentence of sentences) {
                const element = sentence.uml.elements[0];
                if (!element) {
                    return err(new DiagramError(`Invalid sentence structure: ${sentence.text}`));
                }

                const result = this.processElement(element, lastNode);
                if (result.isErr()) {
                    return err(result.error);
                }

                const { diagramPart, newLastNode } = result.value;
                diagram += diagramPart;
                lastNode = newLastNode;
            }

            // If the last node isn't already connected to an End node, connect it
            if (lastNode && !sentences.some(s => s.uml.elements[0]?.type === 'end')) {
                diagram += `    ${lastNode} --> End([End])\n`;
                diagram += `    class End start-end\n`;
            }

            return ok(diagram);
        } catch (error) {
            return err(new DiagramError(`Failed to generate diagram: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
    }

    private generateDiagramHeader(): string {
        return `
            %%{
                init: {
                    'flowchart': {
                        'curve': 'monotoneX',
                        'nodeSpacing': 50,
                        'rankSpacing': 70,
                        'defaultRenderer': 'dagre'
                    },
                    'theme': 'base',
                    'themeVariables': {
                        'edgeLabelBackground': '#fff',
                        'fontSize': '15px',
                        'fontFamily': 'Spline Sans',
                        'primaryColor': '#404040',
                        'primaryTextColor': '#1a1a1a',
                        'lineColor': '#404040',
                        'arrowheadColor': '#404040'
                    }
                }
            }%%
            flowchart TD
            classDef default fill:#fff,stroke:#404040,stroke-width:1.5px,rx:6,ry:6,font-family:Spline Sans,font-weight:400;
            classDef decision fill:#f5f5f5,stroke:#404040,stroke-width:2px,rx:2,ry:2,font-family:Spline Sans,font-weight:500;
            classDef start-end fill:#f5f5f5,stroke:#1a1a1a,stroke-width:2px,rx:20,ry:20,font-family:Spline Sans,font-weight:600;
            classDef process fill:#fff,stroke:#666,stroke-width:1.5px,rx:6,ry:6,font-family:Spline Sans,font-weight:400;
            classDef document fill:#fff,stroke:#666,stroke-width:1.5px,font-family:Spline Sans,font-weight:400;
            classDef connection fill:#f3f4f6,stroke:#666,stroke-width:1.5px,font-family:Spline Sans,font-weight:500;
        \n`;
    }

    private processElement(element: any, lastNode: string | null): DiagramResult<{ diagramPart: string; newLastNode: string | null }> {
        let diagramPart = '';
        let newLastNode = lastNode;

        try {
            switch (element.type) {
                case 'start':
                    const startNodeId = this.getNodeId(element.name);
                    diagramPart += `    Start([Start])\n`;
                    diagramPart += `    class Start start-end\n`;
                    diagramPart += `    Start --> ${startNodeId}[${element.name}]\n`;
                    diagramPart += `    class ${startNodeId} process\n`;
                    this.linkCount++;
                    newLastNode = startNodeId;
                    break;

                case 'process':
                    const processId = this.getNodeId(element.name);
                    diagramPart += `    ${processId}[${element.name}]\n`;
                    diagramPart += `    class ${processId} process\n`;
                    if (lastNode) {
                        diagramPart += `    ${lastNode} --> ${processId}\n`;
                        diagramPart += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    newLastNode = processId;
                    break;

                case 'decision':
                    if (!element.related) {
                        return err(new DiagramError('Decision node missing "then" branch'));
                    }

                    const decisionId = this.getNodeId(element.name);
                    const thenId = this.getNodeId(element.related);
                    const elseId = element.else ? this.getNodeId(element.else) : null;
                    
                    diagramPart += `    ${decisionId}{${element.name}}\n`;
                    diagramPart += `    class ${decisionId} decision\n`;
                    if (lastNode) {
                        diagramPart += `    ${lastNode} --> ${decisionId}\n`;
                        this.linkCount++;
                    }
                    
                    diagramPart += `    ${thenId}[${element.related}]\n`;
                    diagramPart += `    ${decisionId} -->|Yes| ${thenId}\n`;
                    this.linkCount++;
                    
                    if (elseId && element.else) {
                        diagramPart += `    ${elseId}[${element.else}]\n`;
                        diagramPart += `    ${decisionId} -->|No| ${elseId}\n`;
                        this.linkCount++;
                        diagramPart += `    linkStyle ${this.getLinkIndex()} stroke:#f44336,stroke-width:2px\n`;
                    }
                    
                    newLastNode = decisionId;
                    break;

                case 'flow':
                    if (!element.related) {
                        return err(new DiagramError('Flow node missing target'));
                    }

                    const fromId = this.getNodeId(element.name);
                    const toId = this.getNodeId(element.related);
                    diagramPart += `    ${fromId}[${element.name}]\n`;
                    diagramPart += `    ${toId}[${element.related}]\n`;
                    diagramPart += `    ${fromId} --> ${toId}\n`;
                    this.linkCount++;
                    newLastNode = toId;
                    break;

                case 'document':
                    const docId = this.getNodeId(element.name);
                    diagramPart += `    ${docId}[/${element.name}/]\n`;
                    diagramPart += `    class ${docId} document\n`;
                    if (lastNode) {
                        diagramPart += `    ${lastNode} --> ${docId}\n`;
                        diagramPart += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    newLastNode = docId;
                    break;

                case 'connection':
                    const connId = this.getNodeId(element.name);
                    diagramPart += `    ${connId}((${element.name}))\n`;
                    diagramPart += `    class ${connId} connection\n`;
                    if (lastNode) {
                        diagramPart += `    ${lastNode} --> ${connId}\n`;
                        diagramPart += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    newLastNode = connId;
                    break;

                case 'end':
                    const endNodeId = this.getNodeId(element.name);
                    diagramPart += `    ${endNodeId}[${element.name}]\n`;
                    diagramPart += `    class ${endNodeId} process\n`;
                    if (lastNode && lastNode !== endNodeId) {
                        diagramPart += `    ${lastNode} --> ${endNodeId}\n`;
                        diagramPart += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    diagramPart += `    ${endNodeId} --> End([End])\n`;
                    diagramPart += `    class End start-end\n`;
                    this.linkCount++;
                    newLastNode = null; // Prevent further connections after end
                    break;

                default:
                    return err(new DiagramError(`Unknown element type: ${element.type}`));
            }

            return ok({ diagramPart, newLastNode });
        } catch (error) {
            return err(new DiagramError(`Error processing element ${element.type}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
    }

    private getNodeId(name: string): string {
        if (!name) {
            throw new Error('Node name cannot be empty');
        }

        if (!this.nodeMap.has(name)) {
            this.nodeCount++;
            this.nodeMap.set(name, `N${this.nodeCount}`);
        }
        return this.nodeMap.get(name)!;
    }

    private getLinkIndex(): number {
        return this.linkCount - 1;
    }
} 
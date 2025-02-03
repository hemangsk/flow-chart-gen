import { Sentence } from '../../types/interfaces';
import mermaid from 'mermaid';

export class DiagramGenerator {
    private nodeCount = 0;
    private linkCount = 0;
    private nodeMap = new Map<string, string>();

    public generateActivityDiagram(sentences: Sentence[]): string {
        this.nodeCount = 0;
        this.linkCount = 0;
        this.nodeMap.clear();
        let diagram = `
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
        let lastNode: string | null = null;

        sentences.forEach((sentence) => {
            const element = sentence.uml.elements[0];
            if (!element) return;

            switch (element.type) {
                case 'start':
                    const startNodeId = this.getNodeId(element.name);
                    diagram += `    Start([🟢 Start])\n`;
                    diagram += `    class Start start-end\n`;
                    diagram += `    Start --> ${startNodeId}[${element.name}]\n`;
                    diagram += `    class ${startNodeId} process\n`;
                    this.linkCount++;
                    lastNode = startNodeId;
                    break;

                case 'process':
                    const processId = this.getNodeId(element.name);
                    diagram += `    ${processId}[${element.name}]\n`;
                    diagram += `    class ${processId} process\n`;
                    if (lastNode) {
                        diagram += `    ${lastNode} --> ${processId}\n`;
                        diagram += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    lastNode = processId;
                    break;

                case 'decision':
                    const decisionId = this.getNodeId(element.name);
                    const thenId = this.getNodeId(element.related || '');
                    const elseId = element.else ? this.getNodeId(element.else) : null;
                    
                    // Add the decision node
                    diagram += `    ${decisionId}{${element.name}}\n`;
                    diagram += `    class ${decisionId} decision\n`;
                    if (lastNode) {
                        diagram += `    ${lastNode} --> ${decisionId}\n`;
                        this.linkCount++;
                    }
                    
                    // Add 'then' path
                    diagram += `    ${thenId}[${element.related}]\n`;
                    diagram += `    ${decisionId} -->|Yes| ${thenId}\n`;
                    this.linkCount++;
                    
                    // Add 'else' path if it exists
                    if (elseId && element.else) {
                        diagram += `    ${elseId}[${element.else}]\n`;
                        diagram += `    ${decisionId} -->|No| ${elseId}\n`;
                        this.linkCount++;
                        diagram += `    linkStyle ${this.getLinkIndex()} stroke:#f44336,stroke-width:2px\n`;
                    }
                    
                    lastNode = decisionId;
                    break;

                case 'flow':
                    const fromId = this.getNodeId(element.name);
                    const toId = this.getNodeId(element.related || '');
                    diagram += `    ${fromId}[${element.name}]\n`;
                    diagram += `    ${toId}[${element.related}]\n`;
                    diagram += `    ${fromId} --> ${toId}\n`;
                    this.linkCount++;
                    lastNode = toId;
                    break;

                case 'document':
                    const docId = this.getNodeId(element.name);
                    diagram += `    ${docId}[/${element.name}/]\n`;
                    diagram += `    class ${docId} document\n`;
                    if (lastNode) {
                        diagram += `    ${lastNode} --> ${docId}\n`;
                        diagram += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    lastNode = docId;
                    break;

                case 'connection':
                    const connId = this.getNodeId(element.name);
                    diagram += `    ${connId}((${element.name}))\n`;
                    diagram += `    class ${connId} connection\n`;
                    if (lastNode) {
                        diagram += `    ${lastNode} --> ${connId}\n`;
                        diagram += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    lastNode = connId;
                    break;

                case 'end':
                    const endNodeId = this.getNodeId(element.name);
                    diagram += `    ${endNodeId}[${element.name}]\n`;
                    diagram += `    class ${endNodeId} process\n`;
                    if (lastNode) {
                        diagram += `    ${lastNode} --> ${endNodeId}\n`;
                        diagram += `    linkStyle ${this.linkCount} stroke:#666,stroke-width:2px\n`;
                        this.linkCount++;
                    }
                    diagram += `    ${endNodeId} --> End([🔴 End])\n`;
                    diagram += `    class End start-end\n`;
                    this.linkCount++;
                    lastNode = endNodeId;
                    break;
            }
        });

        return diagram;
    }

    private getNodeId(name: string): string {
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
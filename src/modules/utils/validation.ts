import { Sentence } from '../../types/interfaces';
import { ValidationError, ValidationResult } from '../../types/errors';
import { ok, err } from 'neverthrow';

export interface ValidationWarnings {
    warnings: string[];
}

export class ValidationService {
    public validateActivityDiagram(sentences: Sentence[]): ValidationResult<ValidationWarnings> {
        const warnings: string[] = [];
        
        // Check if diagram starts with 'start with'
        const hasStart = sentences.some(s => s.uml.elements[0]?.type === 'start');
        if (!hasStart) {
            return err(new ValidationError("Diagram must start with 'start with' statement"));
        }

        // Check if diagram has an end statement
        const hasEnd = sentences.some(s => s.uml.elements[0]?.type === 'end');
        if (!hasEnd) {
            warnings.push("Diagram should end with an 'end with' statement");
        }
        console.log(hasEnd, sentences);
        // Check for simple start-end diagram
        if (sentences.length === 2 && hasStart && hasEnd) {
            warnings.push("Simple start-end diagram detected. A direct connection will be created between the nodes. Add more steps to create a more detailed flow.");
        }

        // Build graph representation
        const nodes = new Set<string>();
        const incomingConnections = new Set<string>();
        const outgoingConnections = new Map<string, Set<string>>();

        // First pass: Collect all nodes and their connections
        sentences.forEach((s, index) => {
            const element = s.uml.elements[0];
            if (!element) return;

            nodes.add(element.name);

            // Handle different types of connections
            switch (element.type) {
                case 'start':
                    // Start node connects to the next node if it exists
                    if (index < sentences.length - 1) {
                        const nextElement = sentences[index + 1].uml.elements[0];
                        if (nextElement) {
                            this.addConnection(element.name, nextElement.name, outgoingConnections);
                            incomingConnections.add(nextElement.name);
                        }
                    }
                    break;

                case 'process':
                    // Process node connects to the next node if it exists
                    if (index < sentences.length - 1) {
                        const nextElement = sentences[index + 1].uml.elements[0];
                        if (nextElement) {
                            this.addConnection(element.name, nextElement.name, outgoingConnections);
                            incomingConnections.add(nextElement.name);
                        }
                    }
                    break;

                case 'decision':
                    if (element.related) {
                        this.addConnection(element.name, element.related, outgoingConnections);
                        incomingConnections.add(element.related);
                        nodes.add(element.related);
                    }
                    if (element.else) {
                        this.addConnection(element.name, element.else, outgoingConnections);
                        incomingConnections.add(element.else);
                        nodes.add(element.else);
                    }
                    break;

                case 'flow':
                    if (element.related) {
                        this.addConnection(element.name, element.related, outgoingConnections);
                        incomingConnections.add(element.related);
                        nodes.add(element.related);
                    }
                    break;
            }
        });

        // Check for disconnected nodes
        if (sentences.length > 2) {
            nodes.forEach(node => {
                const isStartNode = sentences.some(s => s.uml.elements[0]?.type === 'start' && s.uml.elements[0]?.name === node);
                const hasIncoming = incomingConnections.has(node);
                const hasOutgoing = outgoingConnections.has(node);

                if (!isStartNode && !hasIncoming && !hasOutgoing) {
                    warnings.push(`Node "${node}" appears to be disconnected from the flow`);
                }
            });
        }

        // Check for circular references
        const visited = new Set<string>();
        const checkCircular = (node: string, path: Set<string>): boolean => {
            if (path.has(node)) {
                warnings.push(`Possible circular reference detected involving "${node}"`);
                return true;
            }
            if (visited.has(node)) return false;
            
            visited.add(node);
            path.add(node);
            
            const connections = outgoingConnections.get(node);
            if (connections) {
                connections.forEach(nextNode => {
                    checkCircular(nextNode, new Set(path));
                });
            }
            
            return false;
        };

        nodes.forEach(node => checkCircular(node, new Set()));

        console.log(warnings);
        return ok({ warnings });
    }

    private addConnection(from: string, to: string, connections: Map<string, Set<string>>): void {
        if (!connections.has(from)) {
            connections.set(from, new Set());
        }
        connections.get(from)!.add(to);
    }
} 
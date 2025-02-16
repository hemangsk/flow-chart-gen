export interface DiagramElement {
    type: string;
    name: string;
    related?: string;
    else?: string;
    text: string;
}

export interface ProcessedText {
    type: string;
    elements: DiagramElement[];
}

export interface Sentence {
    text: string;
    uml: ProcessedText;
}

export interface Pattern {
    regex: RegExp;
    type: string;
}

export interface DiagramPatterns {
    patterns: Pattern[];
}

export interface SyntaxPattern {
    pattern: RegExp;
    class: string;
} 
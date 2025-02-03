import { DiagramPatterns } from '../../types/interfaces';

export const umlPatterns: Record<string, DiagramPatterns> = {
    activity: {
        patterns: [
            { regex: /^start\s+with\s+(.+)$/i, type: 'start' },
            { regex: /^if\s+(.+?)\s+then\s+(.+?)(?:\s+else\s+(.+))?$/i, type: 'decision' },
            { regex: /^(.+?)\s+leads?\s+to\s+(.+)$/i, type: 'flow' },
            { regex: /^document\s+(.+)$/i, type: 'document' },
            { regex: /^process\s+(.+)$/i, type: 'process' },
            { regex: /^connect\s+to\s+(.+)$/i, type: 'connection' },
            { regex: /^end\s+with\s+(.+)$/i, type: 'end' }
        ]
    }
};

export const syntaxPatterns = [
    { pattern: /\b(start with|end with)\b/g, class: 'keyword' },
    { pattern: /\b(if|then|else)\b/g, class: 'condition' },
    { pattern: /\b(process|document)\b/g, class: 'action' },
    { pattern: /\b(leads to|connect to)\b/g, class: 'connection' },
    { pattern: /".+?"/g, class: 'flow-text' }
]; 
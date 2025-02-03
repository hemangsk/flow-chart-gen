import { syntaxPatterns } from '../diagram/diagramPatterns';

export class SyntaxHighlighter {
    public highlightSyntax(text: string): string {
        let highlightedText = text;
        syntaxPatterns.forEach(({ pattern, class: className }) => {
            highlightedText = highlightedText.replace(pattern, match => 
                `${match}`
            );
        });
        return highlightedText;
    }
} 
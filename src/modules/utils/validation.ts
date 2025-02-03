import { Sentence, ValidationResult } from '../../types/interfaces';

export class ValidationService {
    private errors: string[] = [];
    private warnings: string[] = [];

    public validateActivityDiagram(sentences: Sentence[]): ValidationResult {
        this.reset();
        
        // Check if diagram starts with 'start with'
        const hasStart = sentences.some(s => s.uml.elements[0]?.type === 'start');
        if (!hasStart) {
            this.errors.push("Diagram must start with 'start with' statement");
        }

        // Add more validation as needed...

        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    private reset(): void {
        this.errors = [];
        this.warnings = [];
    }
} 
import { Result } from 'neverthrow';

// Base error class for our application
export class AppError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'AppError';
    }
}

// Specific error types
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class DiagramError extends AppError {
    constructor(message: string) {
        super(message, 'DIAGRAM_ERROR');
        this.name = 'DiagramError';
    }
}

export class ParsingError extends AppError {
    constructor(message: string) {
        super(message, 'PARSING_ERROR');
        this.name = 'ParsingError';
    }
}

export class RenderError extends AppError {
    constructor(message: string) {
        super(message, 'RENDER_ERROR');
        this.name = 'RenderError';
    }
}

// Result types using neverthrow
export type AppResult<T> = Result<T, AppError>;
export type ValidationResult<T> = Result<T, ValidationError>;
export type DiagramResult<T> = Result<T, DiagramError>;
export type ParsingResult<T> = Result<T, ParsingError>;
export type RenderResult<T> = Result<T, RenderError>; 
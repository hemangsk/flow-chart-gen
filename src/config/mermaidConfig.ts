import mermaid from 'mermaid';

export const initializeMermaid = (): void => {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'linear'
        },
        securityLevel: 'loose'
    });
}; 
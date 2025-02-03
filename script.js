// Initialize mermaid with proper configuration
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

// Initialize variables
const textInput = document.getElementById('text-input');
const sentencesList = document.getElementById('sentences-list');
const diagramDiv = document.getElementById('diagram');
const downloadButton = document.getElementById('download-svg');
const diagramType = document.getElementById('diagram-type');
const relationshipType = document.getElementById('relationship-type');
const inputHighlighter = document.querySelector('.input-highlighter');

let sentences = [];

// Define patterns for different diagram types
const umlPatterns = {
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

// Define help text for different diagram types
const helpText = {
    activity: [
        "start with Login Screen",
        "process User enters credentials",
        "if credentials valid then Dashboard else Error Message",
        "document Generate user report",
        "Dashboard leads to User Profile",
        "connect to Payment Process",
        "end with Logout"
    ],
    class: [
        "class User",
        "User has a String called name",
        "User can login",
        "Account extends User"
    ],
    sequence: [
        "User calls Authentication",
        "Authentication responds to User",
        "User sends data to Database"
    ]
};

// Add syntax highlighting patterns
const syntaxPatterns = [
    { pattern: /\b(start with|end with)\b/g, class: 'keyword' },
    { pattern: /\b(if|then|else)\b/g, class: 'condition' },
    { pattern: /\b(process|document)\b/g, class: 'action' },
    { pattern: /\b(leads to|connect to)\b/g, class: 'connection' },
    { pattern: /".+?"/g, class: 'flow-text' }
];

// Function to highlight syntax
function highlightSyntax(text) {
    let highlightedText = text;
    syntaxPatterns.forEach(({ pattern, class: className }) => {
        highlightedText = highlightedText.replace(pattern, match => 
            `${match}`
        );
    });
    return highlightedText;
}

// Process text into diagram elements
function processUMLText(text, type) {
    const patterns = umlPatterns[type] || umlPatterns.activity;
    let result = {
        type: type,
        elements: []
    };

    if (patterns) {
        patterns.patterns.forEach(pattern => {
            const match = text.match(pattern.regex);
            if (match) {
                result.elements.push({
                    type: pattern.type,
                    name: match[1],
                    related: match[2],
                    text: text
                });
            }
        });
    }

    return result;
}

// Generate activity diagram
function generateActivityDiagram() {
    let diagram = 'flowchart TD\n';
    let nodeCount = 0;
    let nodeMap = new Map();
    let lastNode = null;
    
    function getNodeId(name) {
        if (!nodeMap.has(name)) {
            nodeCount++;
            nodeMap.set(name, `N${nodeCount}`);
        }
        return nodeMap.get(name);
    }

    sentences.forEach((sentence) => {
        const element = sentence.uml.elements[0];
        if (!element) return;

        switch (element.type) {
            case 'start':
                const startNodeId = getNodeId(element.name);
                diagram += `    Start([Start])\n`;
                diagram += `    Start --> ${startNodeId}[${element.name}]\n`;
                lastNode = startNodeId;
                break;

            case 'process':
                const processId = getNodeId(element.name);
                diagram += `    ${processId}[${element.name}]\n`;
                if (lastNode) {
                    diagram += `    ${lastNode} --> ${processId}\n`;
                }
                lastNode = processId;
                break;

            case 'decision':
                const decisionId = getNodeId(element.name);
                const thenId = getNodeId(element.related);
                diagram += `    ${decisionId}{${element.name}}\n`;
                if (lastNode) {
                    diagram += `    ${lastNode} --> ${decisionId}\n`;
                }
                diagram += `    ${decisionId} -->|Yes| ${thenId}[${element.related}]\n`;
                
                if (element.text.includes('else')) {
                    const elsePart = element.text.split('else')[1].trim();
                    const elseId = getNodeId(elsePart);
                    diagram += `    ${decisionId} -->|No| ${elseId}[${elsePart}]\n`;
                }
                lastNode = thenId;
                break;

            case 'document':
                const docId = getNodeId(element.name);
                diagram += `    ${docId}[/${element.name}/]\n`;
                if (lastNode) {
                    diagram += `    ${lastNode} --> ${docId}\n`;
                }
                lastNode = docId;
                break;

            case 'connection':
                const connId = getNodeId(element.name);
                diagram += `    ${connId}((${element.name}))\n`;
                if (lastNode) {
                    diagram += `    ${lastNode} --> ${connId}\n`;
                }
                lastNode = connId;
                break;

            case 'flow':
                const sourceId = getNodeId(element.name);
                const targetId = getNodeId(element.related);
                diagram += `    ${sourceId}[${element.name}] --> ${targetId}[${element.related}]\n`;
                lastNode = targetId;
                break;

            case 'end':
                const lastNodeId = getNodeId(element.name);
                diagram += `    ${lastNodeId}[${element.name}]\n`;
                diagram += `    ${lastNodeId} --> End([End])\n`;
                break;
        }
    });

    return diagram;
}

// Update diagram display
function updateDiagram() {
    const type = diagramType.value;
    let diagram = generateActivityDiagram();

    try {
        diagramDiv.innerHTML = `<pre class="mermaid">${diagram}</pre>`;
        mermaid.init('.mermaid');
        downloadButton.disabled = false;
    } catch (error) {
        console.error('Error rendering diagram:', error);
        diagramDiv.innerHTML = '<div class="error">Error rendering diagram</div>';
        downloadButton.disabled = true;
    }
}

// Update the relationship type visibility based on diagram type
function updateRelationshipVisibility() {
    const type = diagramType.value;
    const relationshipDiv = document.querySelector('.relationship-type');
    relationshipDiv.style.display = type === 'class' ? 'block' : 'none';
}

// Update help text display
function updateHelpText() {
    const type = diagramType.value;
    const helpDiv = document.getElementById('help-text');
    helpDiv.innerHTML = `
        <h3>Example inputs for ${type} diagram:</h3>
        <ul>
            ${helpText[type].map(text => `<li>${text}</li>`).join('')}
        </ul>
    `;
}

// Add auto-resize functionality
textInput.addEventListener('input', function() {
    inputHighlighter.innerHTML = highlightSyntax(this.value);
    // Auto-resize
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Update keypress handler to handle textarea
textInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent default newline
        if (this.value.trim() !== '') {
            const text = this.value.trim();
            const type = diagramType.value;
            
            try {
                const umlElements = processUMLText(text, type);
                sentences.push({
                    text: text,
                    uml: umlElements
                });
                
                updateDiagram();
                updateSentencesList();
                this.value = '';
                inputHighlighter.innerHTML = '';
                this.focus();
                // Reset height
                this.style.height = 'auto';
            } catch (error) {
                console.error('Error processing text:', error);
            }
        }
    }
});

// Keep input focused
function keepInputFocused() {
    textInput.focus();
}

// Update initializePipeline
function initializePipeline() {
    textInput.disabled = false;
    updateRelationshipVisibility();
    updateHelpText();
    updateDiagram();
    keepInputFocused();
}

// Add click handler to body to maintain focus
document.body.addEventListener('click', function(e) {
    // Don't refocus if text is selected
    if (window.getSelection().toString()) {
        return;
    }
    
    if (e.target !== downloadButton && 
        !e.target.closest('select') && 
        !e.target.closest('.glossary-sidebar') &&
        !e.target.closest('.help-text') &&
        !e.target.closest('#sentences-list')) {
        keepInputFocused();
    }
});

// Update focus handler to be less aggressive
textInput.addEventListener('blur', function() {
    setTimeout(() => {
        // Don't refocus if text is selected
        if (window.getSelection().toString()) {
            return;
        }
        const activeElement = document.activeElement;
        if (activeElement === document.body || activeElement === document.documentElement) {
            keepInputFocused();
        }
    }, 10);
});

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    initializePipeline();
});

// Add event listener for diagram type change
diagramType.addEventListener('change', () => {
    updateHelpText();
    updateRelationshipVisibility();
});

// Add download functionality
downloadButton.addEventListener('click', async function() {
    try {
        // Get the existing SVG element
        const svg = diagramDiv.querySelector('svg');
        if (!svg) {
            console.error('No SVG found');
            return;
        }

        // Create a clone of the SVG to modify
        const svgClone = svg.cloneNode(true);
        
        // Add required namespaces
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        // Get the computed style of the original SVG
        const computedStyle = window.getComputedStyle(svg);
        
        // Set dimensions
        const width = computedStyle.width;
        const height = computedStyle.height;
        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        
        // Ensure viewBox is set
        if (!svgClone.getAttribute('viewBox')) {
            const bbox = svg.getBBox();
            svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        }
        
        // Add styles inline
        const styleElement = document.createElement('style');
        const styles = Array.from(document.styleSheets)
            .filter(sheet => {
                try {
                    return sheet.cssRules && (sheet.href === null || sheet.href.startsWith(window.location.origin));
                } catch (e) {
                    return false;
                }
            })
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
                } catch (e) {
                    return '';
                }
            })
            .join('\n');
            
        styleElement.textContent = styles;
        svgClone.insertBefore(styleElement, svgClone.firstChild);
        
        // Convert SVG to string with proper XML declaration
        const svgData = '<?xml version="1.0" encoding="UTF-8"?>\n' + 
                       new XMLSerializer().serializeToString(svgClone);
        
        // Create blob and download link
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `flowchart_${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading SVG:', error);
    }
});

// Update the updateSentencesList function
function updateSentencesList() {
    sentencesList.innerHTML = sentences.map((sentence, index) => `
        <div class="sentence-item">
            <span class="sentence-number">${index + 1}.</span>
            ${highlightSyntax(sentence.text)}
        </div>
    `).join('');
} 
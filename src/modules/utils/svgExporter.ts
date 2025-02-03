export class SVGExporter {
    public exportSVG(diagramDiv: HTMLElement): void {
        try {
            const svg = diagramDiv.querySelector('svg');
            if (!svg) {
                throw new Error('No SVG found');
            }

            const svgClone = svg.cloneNode(true) as SVGSVGElement;
            this.prepareSVGForExport(svgClone, svg as SVGSVGElement);
            this.downloadSVG(svgClone);
        } catch (error) {
            console.error('Error exporting SVG:', error);
        }
    }

    private prepareSVGForExport(svg: SVGSVGElement, originalSvg: SVGSVGElement): void {
        // Add required namespaces
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        // Get dimensions from original SVG
        const bbox = originalSvg.getBBox();
        const viewBox = originalSvg.viewBox.baseVal;
        
        // Add some padding
        const padding = 20;
        svg.setAttribute('width', `${viewBox.width + padding * 2}px`);
        svg.setAttribute('height', `${viewBox.height + padding * 2}px`);
        svg.setAttribute('viewBox', `${viewBox.x - padding} ${viewBox.y - padding} ${viewBox.width + padding * 2} ${viewBox.height + padding * 2}`);

        // Add styles
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .node rect, .node circle, .node ellipse, .node polygon, .node path {
                stroke: #333;
                fill: #fff;
            }
            .edgePath path {
                stroke: #333;
                fill: #333;
                stroke-width: 1.5px;
            }
            .node text {
                font-family: Arial, sans-serif;
            }
        `;
        svg.insertBefore(styleElement, svg.firstChild);
    }

    private downloadSVG(svg: SVGSVGElement): void {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `flowchart_${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
} 
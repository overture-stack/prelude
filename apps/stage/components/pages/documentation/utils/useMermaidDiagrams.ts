import { RefObject, useEffect } from 'react';
import { DocumentationSection } from '../../../../lib/documentation';

export function useMermaidDiagrams(
	contentRef: RefObject<HTMLDivElement>,
	currentSection: DocumentationSection | null,
): void {
	useEffect(() => {
		if (!contentRef.current || !currentSection) return;

		const codeBlocks = contentRef.current.querySelectorAll<HTMLElement>('pre > code.language-mermaid');
		if (codeBlocks.length === 0) return;

		let cancelled = false;

		(async () => {
			const { default: mermaid } = await import('mermaid');

			if (cancelled) return;

			mermaid.initialize({ startOnLoad: false, theme: 'default' });

			for (let i = 0; i < codeBlocks.length; i++) {
				if (cancelled) break;

				const code = codeBlocks[i];
				const pre = code.parentElement;
				if (!pre || pre.dataset.mermaidRendered === 'true') continue;

				const definition = code.textContent ?? '';
				const id = `mermaid-diagram-${currentSection.id}-${i}`;

				try {
					const { svg } = await mermaid.render(id, definition);

					if (cancelled) break;

					const container = document.createElement('div');
					container.className = 'mermaid-diagram';
					container.innerHTML = svg;

					// Remove the fixed height Mermaid sets on the SVG so the
					// viewBox drives sizing and nothing gets clipped.
					const svgEl = container.querySelector('svg');
					if (svgEl) {
						svgEl.removeAttribute('height');
						svgEl.style.width = '100%';
						svgEl.style.height = 'auto';
					}

					pre.replaceWith(container);
				} catch (err) {
					console.warn(`Mermaid render failed for block ${i}:`, err);
					pre.dataset.mermaidRendered = 'error';
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [currentSection]);
}

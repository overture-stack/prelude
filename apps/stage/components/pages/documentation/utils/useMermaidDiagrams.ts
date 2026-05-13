import { RefObject, useEffect } from 'react';
import { DocumentationSection } from '../../../../lib/documentation';

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;

function clamp(val: number, min: number, max: number): number {
	return Math.min(Math.max(val, min), max);
}

function attachInteractions(viewer: HTMLElement, canvas: HTMLElement): () => void {
	let tx = 0,
		ty = 0,
		scale = 1;
	let dragging = false;
	let startMouseX = 0,
		startMouseY = 0;
	let startTx = 0,
		startTy = 0;

	const update = () => {
		canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
	};

	const zoomAt = (factor: number, originX: number, originY: number) => {
		const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
		const localX = (originX - tx) / scale;
		const localY = (originY - ty) / scale;
		tx = originX - localX * newScale;
		ty = originY - localY * newScale;
		scale = newScale;
		update();
	};

	const reset = () => {
		tx = 0;
		ty = 0;
		scale = 1;
		update();
	};

	// Toolbar
	const toolbar = document.createElement('div');
	toolbar.className = 'mermaid-toolbar';

	const makeBtn = (label: string, title: string, onClick: () => void): HTMLButtonElement => {
		const btn = document.createElement('button');
		btn.className = 'mermaid-toolbar-btn';
		btn.textContent = label;
		btn.title = title;
		btn.type = 'button';
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			onClick();
		});
		return btn;
	};

	toolbar.appendChild(
		makeBtn('+', 'Zoom in', () => zoomAt(1.25, viewer.offsetWidth / 2, viewer.offsetHeight / 2)),
	);
	toolbar.appendChild(
		makeBtn('−', 'Zoom out', () => zoomAt(0.8, viewer.offsetWidth / 2, viewer.offsetHeight / 2)),
	);
	toolbar.appendChild(makeBtn('⟳', 'Reset view', reset));

	viewer.insertBefore(toolbar, canvas);

	// Mouse drag
	const onMouseDown = (e: MouseEvent) => {
		if (e.button !== 0) return;
		dragging = true;
		startMouseX = e.clientX;
		startMouseY = e.clientY;
		startTx = tx;
		startTy = ty;
		canvas.style.cursor = 'grabbing';
		e.preventDefault();
	};

	const onMouseMove = (e: MouseEvent) => {
		if (!dragging) return;
		tx = startTx + (e.clientX - startMouseX);
		ty = startTy + (e.clientY - startMouseY);
		update();
	};

	const onMouseUp = () => {
		if (!dragging) return;
		dragging = false;
		canvas.style.cursor = 'grab';
	};

	canvas.addEventListener('mousedown', onMouseDown);
	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('mouseup', onMouseUp);

	return () => {
		canvas.removeEventListener('mousedown', onMouseDown);
		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('mouseup', onMouseUp);
	};
}

export function useMermaidDiagrams(
	contentRef: RefObject<HTMLDivElement>,
	currentSection: DocumentationSection | null,
): void {
	useEffect(() => {
		if (!contentRef.current || !currentSection) return;

		const cleanups: Array<() => void> = [];

		const renderMermaidDiagrams = async () => {
			try {
				const { default: mermaid } = await import('mermaid');

				mermaid.initialize({
					startOnLoad: false,
					theme: 'default',
					securityLevel: 'loose',
				});

				const codeBlocks = contentRef.current?.querySelectorAll('pre code.language-mermaid');
				if (!codeBlocks || codeBlocks.length === 0) return;

				const diagramNodes: HTMLElement[] = [];

				codeBlocks.forEach((codeBlock, index) => {
					const preElement = codeBlock.parentElement;
					if (!preElement || preElement.tagName !== 'PRE') return;

					// textContent decodes HTML entities (e.g. &quot; → ") that mermaid needs as raw chars
					const code = codeBlock.textContent || '';

					const viewer = document.createElement('div');
					viewer.className = 'mermaid-viewer';

					const canvas = document.createElement('div');
					canvas.className = 'mermaid-canvas';

					const diagramDiv = document.createElement('div');
					diagramDiv.className = 'mermaid-diagram';
					diagramDiv.id = `mermaid-diagram-${index}`;
					diagramDiv.textContent = code;

					canvas.appendChild(diagramDiv);
					viewer.appendChild(canvas);

					preElement.parentNode?.replaceChild(viewer, preElement);
					diagramNodes.push(diagramDiv);
				});

				if (diagramNodes.length > 0) {
					await mermaid.run({
						nodes: diagramNodes,
						suppressErrors: true,
					});

					diagramNodes.forEach((node) => {
						const svg = node.querySelector('svg');
						if (!svg) return;
						svg.removeAttribute('width');
						svg.removeAttribute('height');
						svg.style.width = '100%';
						svg.style.height = 'auto';

						const canvasEl = node.closest('.mermaid-canvas') as HTMLElement | null;
						const viewerEl = node.closest('.mermaid-viewer') as HTMLElement | null;
						if (canvasEl && viewerEl) {
							cleanups.push(attachInteractions(viewerEl, canvasEl));
						}
					});
				}
			} catch (error) {
				console.warn('Error rendering mermaid diagrams:', error);
			}
		};

		renderMermaidDiagrams();

		return () => {
			cleanups.forEach((fn) => fn());
		};
	}, [currentSection]);
}

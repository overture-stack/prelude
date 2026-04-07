import { RefObject, useEffect } from 'react';
import { DocumentationSection } from '../../../../lib/documentation';

export function useCodeBlockCopyButtons(
	contentRef: RefObject<HTMLDivElement>,
	currentSection: DocumentationSection | null,
): void {
	useEffect(() => {
		if (!contentRef.current || !currentSection) return;

		const preElements = contentRef.current.querySelectorAll('pre');
		const cleanups: Array<() => void> = [];

		preElements.forEach((pre) => {
			if (pre.querySelector('.copy-code-button')) return;

			const button = document.createElement('button');
			button.className = 'copy-code-button';
			button.textContent = 'Copy';
			button.setAttribute('aria-label', 'Copy code to clipboard');

			const handleClick = async () => {
				const code = pre.querySelector('code');
				const text = code?.textContent ?? pre.textContent ?? '';
				try {
					if (navigator.clipboard && window.isSecureContext) {
						await navigator.clipboard.writeText(text);
					} else {
						const textarea = document.createElement('textarea');
						textarea.value = text;
						textarea.style.cssText = 'position:fixed;opacity:0';
						document.body.appendChild(textarea);
						textarea.select();
						document.execCommand('copy');
						document.body.removeChild(textarea);
					}
				} catch {
					// silently ignore
				}
				button.textContent = 'Copied!';
				button.classList.add('copied');
				setTimeout(() => {
					button.textContent = 'Copy';
					button.classList.remove('copied');
				}, 2000);
			};

			button.addEventListener('click', handleClick);
			cleanups.push(() => button.removeEventListener('click', handleClick));

			pre.appendChild(button);
		});

		return () => cleanups.forEach((fn) => fn());
	}, [currentSection]);
}

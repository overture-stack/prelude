import { RefObject, useEffect } from 'react';
import { DocumentationSection } from '../../../../lib/documentation';

export function useCodeBlockLineNumbers(
	contentRef: RefObject<HTMLDivElement>,
	currentSection: DocumentationSection | null,
): void {
	useEffect(() => {
		if (!contentRef.current || !currentSection) return;

		contentRef.current.querySelectorAll('pre code').forEach((codeEl) => {
			if (codeEl.querySelector('.line')) return;

			const lines = codeEl.innerHTML.split('\n');
			if (lines[lines.length - 1] === '') lines.pop();

			codeEl.innerHTML = lines
				.map((line) => `<span class="line">${line}</span>`)
				.join('\n');
		});
	}, [currentSection]);
}

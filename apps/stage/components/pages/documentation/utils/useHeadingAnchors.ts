import { RefObject, useEffect } from 'react';
import { DocumentationSection } from '../../../../lib/documentation';

async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		}
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.cssText = 'position:fixed;opacity:0';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		const ok = document.execCommand('copy');
		document.body.removeChild(textarea);
		return ok;
	} catch {
		return false;
	}
}

export function useHeadingAnchors(
	contentRef: RefObject<HTMLDivElement>,
	currentSection: DocumentationSection | null,
): void {
	useEffect(() => {
		if (!contentRef.current || !currentSection) return;

		const cleanups: Array<() => void> = [];

		contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
			if (heading.querySelector('.heading-link')) return;

			const id = heading.getAttribute('id');
			if (!id) return;

			const link = document.createElement('a');
			link.className = 'heading-link';
			link.textContent = '#';
			link.setAttribute('aria-label', `Copy link to ${heading.textContent}`);

			const handleClick = async (e: Event) => {
				e.preventDefault();
				const url = `${window.location.origin}${window.location.pathname}#${id}`;
				const ok = await copyToClipboard(url);
				if (ok) {
					window.history.pushState(null, '', `#${id}`);
					link.textContent = '✓';
					setTimeout(() => { link.textContent = '#'; }, 1000);
				} else {
					window.location.hash = id;
				}
			};

			if (heading instanceof HTMLElement) heading.style.cursor = 'pointer';
			heading.addEventListener('click', handleClick);
			cleanups.push(() => heading.removeEventListener('click', handleClick));
			heading.appendChild(link);
		});

		return () => cleanups.forEach((fn) => fn());
	}, [currentSection]);
}

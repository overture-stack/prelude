import { RefObject, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createElement } from 'react';
import { DocumentationSection } from '../../../../lib/documentation';
import { DictionaryTableOnly, DictionaryViewer } from '../../dictionary';

export function useDictionaryHydration(
	contentRef: RefObject<HTMLDivElement>,
	currentSection: DocumentationSection | null,
): void {
	useEffect(() => {
		if (!contentRef.current || !currentSection) return;

		const tableContainers = contentRef.current.querySelectorAll('[data-component="DictionaryTable"]');
		tableContainers.forEach((container) => {
			const url = container.getAttribute('data-url') || '';
			const showSchemaNames = container.getAttribute('data-show-schema-names') === 'true';
			ReactDOM.render(
				createElement('div', null, createElement(DictionaryTableOnly, { dictionaryUrl: url, showSchemaNames })),
				container,
			);
		});

		const viewerContainers = contentRef.current.querySelectorAll('[data-component="DictionaryViewerFull"]');
		viewerContainers.forEach((container) => {
			const url = container.getAttribute('data-url') || '';
			ReactDOM.render(
				createElement('div', null, createElement(DictionaryViewer, { dictionaryUrl: url })),
				container,
			);
		});

		return () => {
			tableContainers.forEach((container) => ReactDOM.unmountComponentAtNode(container));
			viewerContainers.forEach((container) => ReactDOM.unmountComponentAtNode(container));
		};
	}, [currentSection]);
}

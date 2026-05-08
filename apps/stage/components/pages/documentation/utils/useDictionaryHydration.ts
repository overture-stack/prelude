import { RefObject } from 'react';
import { DocumentationSection } from '../../../../lib/documentation';

// Dictionary components removed — this hook is a no-op
export function useDictionaryHydration(
	_contentRef: RefObject<HTMLDivElement>,
	_currentSection: DocumentationSection | null,
): void {}

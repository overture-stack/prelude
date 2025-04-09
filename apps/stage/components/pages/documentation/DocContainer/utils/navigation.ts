// DocsContainer/utils/navigation.ts
/**
 * Updates the active hash in the state
 */
export function updateActiveHash(setActiveHash: (hash: string) => void): void {
	setActiveHash(window.location.hash);
}

// DocsContainer/DocsContainer.tsx
/** @jsxImportSource @emotion/react */
import { marked } from 'marked';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './styles';
import { Section } from './types';
import { extractHeadings, extractOrder, extractTitle, generateId, renderMarkdown } from './utils/markdown';
import { updateActiveHash } from './utils/navigation';

const DocsContainer = () => {
	const [sections, setSections] = useState<Section[]>([]);
	const [activeHash, setActiveHash] = useState<string>('');
	const [activeTocItem, setActiveTocItem] = useState<string>('');
	const [isClient, setIsClient] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [tocOpen, setTocOpen] = useState(false);
	const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
	const [currentSection, setCurrentSection] = useState<Section | null>(null);

	const sidebarRef = useRef<HTMLDivElement>(null);
	const mainRef = useRef<HTMLDivElement>(null);
	const tocRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Save scroll position when sidebar opens
		const handleSidebarToggle = (isOpen: boolean) => {
			if (isOpen) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		};

		// Update whenever sidebar state changes
		handleSidebarToggle(sidebarOpen);

		return () => {
			document.body.style.overflow = '';
		};
	}, [sidebarOpen]);

	// Set up marked with error handling
	useEffect(() => {
		marked.setOptions({
			breaks: true,
			gfm: true,
		});
	}, []);

	// Load markdown files
	useEffect(() => {
		const loadMarkdownFiles = async () => {
			setLoading(true);
			try {
				// Fetch the list of markdown files
				const response = await fetch('/api/docs');

				if (!response.ok) {
					throw new Error(`Failed to fetch documentation list: ${response.statusText}`);
				}

				const files = await response.json();

				if (!files || files.length === 0) {
					setError('No documentation files found.');
					setLoading(false);
					return;
				}

				// Process each markdown file
				const sectionsPromises = files.map(async (filename: string) => {
					try {
						const response = await fetch(`/docs/${filename}`);

						if (!response.ok) {
							throw new Error(`Failed to load ${filename}: ${response.statusText}`);
						}

						const content = await response.text();
						const title = extractTitle(content);

						return {
							title,
							markdownPath: `/docs/${filename}`,
							content,
							order: extractOrder(filename),
							id: generateId(title),
						};
					} catch (error) {
						console.error(`Error loading markdown for ${filename}:`, error);
						return null;
					}
				});

				const loadedSections = (await Promise.all(sectionsPromises))
					.filter((section): section is Section => section !== null)
					.sort((a, b) => a.order - b.order);

				setSections(loadedSections);

				// Set current section based on hash or default to first section
				if (window.location.hash) {
					const sectionId = window.location.hash.substring(1);
					const section = loadedSections.find((s) => s.id === sectionId);
					if (section) {
						setCurrentSection(section);
						// Extract headings from the current section
						setHeadings(extractHeadings(section.content || ''));
					}
				} else if (loadedSections.length > 0) {
					setCurrentSection(loadedSections[0]);
					// Extract headings from the first section
					setHeadings(extractHeadings(loadedSections[0].content || ''));
				}
			} catch (error) {
				console.error('Error loading markdown files:', error);
				setError(`Failed to load documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
			} finally {
				setLoading(false);
			}
		};

		loadMarkdownFiles();
	}, []);

	// Client-side navigation and scroll effects
	useEffect(() => {
		setIsClient(true);
		setActiveHash(window.location.hash);

		const handleHashChange = () => {
			updateActiveHash(setActiveHash);
			setSidebarOpen(false);

			// Update current section based on hash
			const sectionId = window.location.hash.substring(1);
			const section = sections.find((s) => s.id === sectionId);
			if (section) {
				setCurrentSection(section);
				// Extract headings from the current section
				setHeadings(extractHeadings(section.content || ''));
			}
		};

		const handleScroll = () => {
			// Check which heading is currently in view
			const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
			const scrollPosition = window.scrollY + 100; // Add offset for better UX

			let currentHeading = '';

			headingElements.forEach((element) => {
				const { top } = element.getBoundingClientRect();
				const position = window.scrollY + top;

				if (position <= scrollPosition) {
					const id = element.id;
					if (id) {
						currentHeading = id;
					}
				}
			});

			if (currentHeading) {
				setActiveTocItem(currentHeading);
			}
		};

		window.addEventListener('hashchange', handleHashChange);
		window.addEventListener('scroll', handleScroll);

		// Initial scroll check
		setTimeout(handleScroll, 100);

		return () => {
			window.removeEventListener('hashchange', handleHashChange);
			window.removeEventListener('scroll', handleScroll);
		};
	}, [sections]);

	// Safe markdown rendering function
	const safeMdRender = useCallback((content: string) => renderMarkdown(content, marked), []);

	// Handle click outside of sidebar to close it
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && sidebarOpen) {
				setSidebarOpen(false);
			}

			if (tocRef.current && !tocRef.current.contains(event.target as Node) && tocOpen) {
				setTocOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [sidebarOpen, tocOpen]);

	// Get previous and next sections
	const getPrevSection = () => {
		if (!currentSection) return null;
		const currentIndex = sections.findIndex((s) => s.id === currentSection.id);
		return currentIndex > 0 ? sections[currentIndex - 1] : null;
	};

	const getNextSection = () => {
		if (!currentSection) return null;
		const currentIndex = sections.findIndex((s) => s.id === currentSection.id);
		return currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;
	};

	const prevSection = getPrevSection();
	const nextSection = getNextSection();

	return (
		<div css={styles.container}>
			<div
				css={styles.sidebarOverlay}
				className={sidebarOpen ? 'active visible' : sidebarOpen === false ? 'visible' : ''}
				onClick={() => setSidebarOpen(false)}
			/>

			<aside css={styles.sidebar} className={sidebarOpen ? 'active' : ''} ref={sidebarRef}>
				<div css={styles.sidebarHeader}>
					<span>Contents</span>
					<button className="close-button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<nav css={styles.nav}>
					<ul>
						{sections.map((section) => (
							<li key={section.id}>
								<a
									href={`#${section.id}`}
									className={isClient && activeHash === `#${section.id}` ? 'active' : ''}
									onClick={() => setSidebarOpen(false)}
								>
									{section.title}
								</a>
							</li>
						))}
					</ul>
				</nav>
			</aside>

			<button css={styles.sidebarToggle} onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<line x1="3" y1="12" x2="21" y2="12"></line>
					<line x1="3" y1="6" x2="21" y2="6"></line>
					<line x1="3" y1="18" x2="21" y2="18"></line>
				</svg>
			</button>

			<div css={styles.contentWrapper}>
				<main css={styles.main} ref={mainRef}>
					{loading ? (
						<div css={styles.loadingContainer}>
							<div css={styles.loader}></div>
						</div>
					) : error ? (
						<div css={styles.errorContainer}>
							<h2>Error Loading Documentation</h2>
							<p>{error}</p>
						</div>
					) : sections.length === 0 ? (
						<div css={styles.noContent}>
							<h2>No Documentation Available</h2>
							<p>Documentation is currently being prepared. Please check back later.</p>
						</div>
					) : (
						<>
							{currentSection && (
								<div css={styles.breadcrumbs}>
									<span>
										<a href="/">Home</a>
									</span>
									<span>
										<a href="/documentation">Documentation</a>
									</span>
									<span>{currentSection.title}</span>
								</div>
							)}

							{sections.map((section) => (
								<article
									key={section.id}
									css={styles.content}
									id={section.id}
									className={currentSection && currentSection.id === section.id ? 'visible' : 'hidden'}
									style={{ display: currentSection && currentSection.id === section.id ? 'block' : 'none' }}
								>
									<div css={styles.docHeader}>
										<div dangerouslySetInnerHTML={safeMdRender(section.content || '')} />
									</div>

									<div css={styles.docFooter}>
										<div className="prev-link">
											{prevSection && (
												<a href={`#${prevSection.id}`}>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<line x1="19" y1="12" x2="5" y2="12"></line>
														<polyline points="12 19 5 12 12 5"></polyline>
													</svg>
													Previous: {prevSection.title}
												</a>
											)}
										</div>
										<div className="next-link">
											{nextSection && (
												<a href={`#${nextSection.id}`}>
													Next: {nextSection.title}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<line x1="5" y1="12" x2="19" y2="12"></line>
														<polyline points="12 5 19 12 12 19"></polyline>
													</svg>
												</a>
											)}
										</div>
									</div>
								</article>
							))}
						</>
					)}
				</main>

				{!loading && !error && headings.length > 0 && (
					<>
						<div css={styles.tocSidebar} className={tocOpen ? 'active' : ''} ref={tocRef}>
							<div css={styles.sidebarHeader}>
								<span>On This Page</span>
								<button className="close-button" onClick={() => setTocOpen(false)} aria-label="Close table of contents">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<line x1="18" y1="6" x2="6" y2="18"></line>
										<line x1="6" y1="6" x2="18" y2="18"></line>
									</svg>
								</button>
							</div>

							<div>
								<ul>
									{headings.map((heading) => (
										<li
											key={heading.id}
											className={activeTocItem === heading.id ? 'active' : ''}
											style={{
												paddingLeft: `${heading.level * 0.5}rem`,
												marginLeft: `${(heading.level - 1) * 0.5}rem`,
											}}
										>
											<a
												href={`#${heading.id}`}
												className={activeTocItem === heading.id ? 'active' : ''}
												onClick={() => setTocOpen(false)}
											>
												{heading.text}
											</a>
										</li>
									))}
								</ul>
							</div>
						</div>

						<button
							css={styles.tableOfContentsToggle}
							onClick={() => setTocOpen(true)}
							aria-label="Show table of contents"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<line x1="21" y1="10" x2="7" y2="10"></line>
								<line x1="21" y1="6" x2="3" y2="6"></line>
								<line x1="21" y1="14" x2="3" y2="14"></line>
								<line x1="21" y1="18" x2="7" y2="18"></line>
							</svg>
						</button>

						<div css={styles.toc}>
							<h4>On This Page</h4>
							<ul>
								{headings.map((heading) => (
									<li
										key={heading.id}
										className={activeTocItem === heading.id ? 'active' : ''}
										style={{
											paddingLeft: `${heading.level * 0.5}rem`,
											marginLeft: `${(heading.level - 1) * 0.5}rem`,
										}}
									>
										<a href={`#${heading.id}`} className={activeTocItem === heading.id ? 'active' : ''}>
											{heading.text}
										</a>
									</li>
								))}
							</ul>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default DocsContainer;

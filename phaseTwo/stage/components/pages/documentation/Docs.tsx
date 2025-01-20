import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { marked } from 'marked';

interface Section {
  title: string;
  markdownPath: string;
  content?: string;
  order: number;
}

// Theme configuration
const theme = {
  colors: {
    sidebar: '#f5f6f7',
    primary: '#0B75A2',
    text: '#1c1e21',
    textSecondary: '#606770',
    border: '#dadde1',
    white: '#ffffff',
    hover: 'rgba(0, 0, 0, 0.05)',
  },
  fonts: {
    base: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
};

const styles = {
  container: css`
    width: 100%;
    background: ${theme.colors.white};
    position: relative;
    padding-bottom: 50px;
  `,

  contentWrapper: css`
    display: flex;
    width: 100%;
    position: relative;
    gap: 0;

    @media (max-width: 768px) {
      flex-direction: column;
    }
  `,
  
  sidebar: css`
    width: 250px;
    background: ${theme.colors.sidebar};
    border-right: 1px solid ${theme.colors.border};
    position: sticky;
    top: 0;
    height: calc(110vh - 70px);
    overflow-y: auto;
    z-index: 1;

    .sidebar-title {
      padding: 2rem 2rem;
      margin-top: 0;
      font-size: 1rem;
      font-weight: 900;
      color: ${theme.colors.primary};
      border-bottom: 1px solid ${theme.colors.border};
    }

    @media (max-width: 768px) {
      position: relative;
      width: 100%;
      height: auto;
      border-right: none;
      border-bottom: 1px solid ${theme.colors.border};
      padding: 0;

      .sidebar-title {
        padding: 1rem;
      }
    }
  `,

  nav: css`
    padding: 1rem 0;

    ul {
      list-style: none;
      padding: 0 1rem;
      margin: 0;
    }

    li {
      margin: 0.25rem 0;
    }

    a {
      display: block;
      padding: 0.5rem 1rem;
      color: ${theme.colors.textSecondary};
      text-decoration: none;
      font-size: 0.875rem;
      line-height: 1.4;
      border-left: 2px solid transparent;
      transition: all 0.2s;

      &:hover {
        color: ${theme.colors.primary};
        background: ${theme.colors.hover};
      }

      &.active {
        color: ${theme.colors.primary};
        border-left-color: ${theme.colors.primary};
        background: ${theme.colors.hover};
        font-weight: 500;
      }
    }

    @media (max-width: 768px) {
      padding: 0.5rem;

      ul {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0;
      }

      li {
        margin: 0;
        width: auto;
      }

      a {
        padding: 0.5rem 1rem;
        border: 1px solid ${theme.colors.border};
        border-radius: 2rem;
        white-space: nowrap;
        border-left-width: 1px;

        &.active {
          border-color: ${theme.colors.primary};
          background: ${theme.colors.hover};
        }
      }
    }
  `,

  main: css`
    flex: 1;
    padding: 2rem 3rem;
    box-sizing: border-box;

    @media (max-width: 1024px) {
      padding: 2rem;
    }

    @media (max-width: 768px) {
      padding: 1rem;
    }
  `,

  content: css`
    max-width: 100%;

    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid ${theme.colors.border};

      @media (max-width: 768px) {
        font-size: 1.75rem;
        margin: 0 0 1.5rem;
      }
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 2rem 0 1rem;

      @media (max-width: 768px) {
        font-size: 1.25rem;
      }
    }

    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 1.5rem 0 1rem;
    }

    p {
      font-size: 1rem;
      line-height: 1.7;
      margin: 1rem 0;
    }

    li {
      line-height: 1.7;
    }

    a {
      font-weight: 900;
      color: ${theme.colors.primary};
      text-decoration: none;

      &:hover {
        color: ${theme.colors.textSecondary};
      }
    }

    b {
      font-weight: 900;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.875rem;
      display: block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;

      th {
        background: ${theme.colors.sidebar};
        font-weight: 600;
        text-align: left;
        white-space: nowrap;
      }

      th,
      td {
        padding: 0.75rem;
        border: 1px solid ${theme.colors.border};
      }

      @media (max-width: 768px) {
        font-size: 0.8125rem;

        th,
        td {
          padding: 0.5rem;
        }
      }
    }

    img {
      max-width: 100%;
      height: auto;
      margin: 1.5rem 0;
      border-radius: 0.5rem;
      border: 1px solid ${theme.colors.border};

      @media (max-width: 768px) {
        margin: 1rem 0;
      }
    }

    pre {
      margin: 1rem -1rem;
      padding: 1rem;
      background: ${theme.colors.sidebar};
      border-radius: 0.5rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;

      @media (max-width: 768px) {
        border-radius: 0;
      }

      code {
        background: none;
        padding: 0;
        font-size: 0.875rem;
        color: ${theme.colors.text};
      }
    }

    code {
      background: ${theme.colors.sidebar};
      padding: 0.2rem 0.4rem;
      border-radius: 0.3rem;
      font-size: 0.875em;
      font-family: ${theme.fonts.mono};
      color: ${theme.colors.text};
    }
  `,
};


const Documentation: React.FC = () => {
	const [sections, setSections] = useState<Section[]>([]);
	const [activeHash, setActiveHash] = useState<string>('');
	const [isClient, setIsClient] = useState(false);
  
	// Function to extract title from markdown content
	const extractTitle = (content: string): string => {
	  const titleMatch = content.match(/^#\s+(.+)$/m);
	  return titleMatch ? titleMatch[1].trim() : 'Untitled Section';
	};
  
	// Function to extract order from filename
	const extractOrder = (filename: string): number => {
	  const match = filename.match(/^(\d+)/);
	  return match ? parseInt(match[1], 10) : 999;
	};
  
	useEffect(() => {
	  const loadMarkdownFiles = async () => {
		try {
		  // First, fetch the list of markdown files
		  const response = await fetch('/api/docs');
		  const files = await response.json();
		  
		  // Process each markdown file
		  const sectionsPromises = files.map(async (filename: string) => {
			try {
			  const response = await fetch(`/docs/${filename}`);
			  const content = await response.text();
			  
			  return {
				title: extractTitle(content),
				markdownPath: `/docs/${filename}`,
				content,
				order: extractOrder(filename)
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
		} catch (error) {
		  console.error('Error loading markdown files:', error);
		}
	  };
  
	  loadMarkdownFiles();
	}, []);
  
	useEffect(() => {
	  setIsClient(true);
	  setActiveHash(window.location.hash);
  
	  const handleHashChange = () => {
		setActiveHash(window.location.hash);
	  };
  
	  window.addEventListener('hashchange', handleHashChange);
	  return () => {
		window.removeEventListener('hashchange', handleHashChange);
	  };
	}, []);
  
	return (
	  <div css={styles.container}>
		<div css={styles.contentWrapper}>
		  <aside css={styles.sidebar}>
			<h2 className="sidebar-title">Documentation</h2>
			<nav css={styles.nav}>
			  <ul>
				{sections.map((section, index) => {
				  const sectionId = section.title.toLowerCase().replace(/\s+/g, '-');
				  return (
					<li key={index}>
					  <a
						href={`#${sectionId}`}
						className={isClient && activeHash === `#${sectionId}` ? 'active' : ''}
					  >
						{section.title}
					  </a>
					</li>
				  );
				})}
			  </ul>
			</nav>
		  </aside>
  
		  <main css={styles.main}>
			{sections.map((section, index) => (
			  <article
				key={index}
				css={styles.content}
				id={section.title.toLowerCase().replace(/\s+/g, '-')}
			  >
				<div dangerouslySetInnerHTML={{ __html: marked(section.content || '') }} />
			  </article>
			))}
		  </main>
		</div>
	  </div>
	);
  };
  
  export default Documentation;
import { ReactElement, useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { marked } from 'marked';
interface Section {
	title: string;
	content: string;
}

const documentationSections: Section[] = [
	{
		title: 'Prelude Overview',
		content: `

# Overview

The platform's four-component architecture enables researchers to process and analyze large-scale Prelude data through a unified portal. The backend ingests multi-gigabyte TSV files containing tabular data, while the frontend provides a highly available interface for querying, filtering, and exporting the aggregated data.

<img src="/images/submissionsystem-Drug-Discovery.png" alt="System Architecture Diagram" title="System Architecture Diagram" />

## Key Components

- The **Data Ingestion Utility** is used to submit data in the form of TSVs to any Elasticsearch index through the command-line.

- **Elasticsearch** powers the platform's core search engine functionality.

- **Arranger Server** enables Elasticsearch to be queried from a flexible GraphQL API, this is used by our frontend services to retrieve data from Elasticsearch.

- **Stage** is the front-end web portal scaffolding. It includes our navbars, footers, as well as custom pages such as this sites landing page and this documentation page.

- **Arranger Components** are the react components responsible for our interactive search UIs found on the exploration pages, these components communicate with the Arranger Server to fetch and display data.

<a href="https://github.com/oicr-softeng/drug_discovery-ui/" target="_blank" rel="noopener">The repository for the portal can be found on GitHub here</a>, If you require access to the repository please contact the administrator of the platform.
    `,
	},
	{
		title: 'CSV to Elasticsearch Processor',
		content: `
# CSV-processor

This is a command-line tool for efficiently processing and indexing CSV files into Elasticsearch. It allows you to quickly input flat files (csv files) into elasticsearch with progress tracking, batched processing, and detailed error reporting.

## Features

- 📊 Efficient CSV parsing with support for various delimiters
- 🚀 Batch processing for optimal performance
- 📈 Real-time progress tracking with ETA
- 🔄 Configurable batch sizes
- ⚠️ Detailed error reporting
- 🔐 Elasticsearch authentication support
- 🔍 Target index validation
- 🧐 CSV Header Validation
  - Checks for duplicate headers
  - Validates header structure
  - Verifies headers match the Elasticsearch index mapping

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Access to an Elasticsearch instance

## Getting Started

Build the TypeScript code:

\`\`\`bash
npm run build
\`\`\`

## Command Line Options


| Option | Description | Default |
|--------|-------------|---------|
| \`-f, --file <path>\` | CSV file path (required) | - |
| \`--url <url>\` | Elasticsearch URL | http://localhost:9200 |
| \`-i, --index <name>\` | Elasticsearch index name | correlation-index |
| \`-u, --user <username>\` | Elasticsearch username | elastic |
| \`-p, --password <password>\` | Elasticsearch password | myelasticpassword |
| \`-b, --batch-size <size>\` | Batch size for processing | 1000 |
| \`-d, --delimiter <char>\` | CSV delimiter | , |

## Processing Flow

1. The tool first counts total records in the CSV file
2. Confirms headers with the user
3. Processes records in configured batch sizes
4. Sends batches to Elasticsearch using the bulk API
5. Displays real-time progress with:
   - Visual progress bar
   - Completion percentage
   - Records processed
   - Elapsed time
   - Estimated time remaining
   - Processing rate

## Example Usage

Basic usage with default settings:
\`\`\`bash
node csv-processor.js -f data.csv
\`\`\`

Custom Elasticsearch configuration:
\`\`\`bash
node csv-processor.js -f data.csv --url http://localhost:9200 -i my-index -u elastic -p mypassword
\`\`\`

Process a semicolon-delimited CSV with custom batch size:
\`\`\`bash
node csv-processor.js -f data.csv -d ";" -b 100
\`\`\`

## Performance Considerations

- Adjust batch size based on record size and Elasticsearch performance
- Larger batch sizes generally improve throughput but use more memory
- Monitor Elasticsearch CPU and memory usage
- Consider network latency when setting batch sizes

## Troubleshooting

Common issues and solutions:

1. **Connection Errors**
   - Verify Elasticsearch is running
   - Check URL and port
   - Confirm network connectivity

2. **Authentication Failures**
   - Verify username and password
   - Check user permissions

3. **Parse Errors**
   - Verify CSV format
   - Check delimiter setting
   - Inspect file encoding

4. **Memory Issues**
   - Reduce batch size
   - Ensure sufficient system resources
   - Monitor Node.js memory usage
    `,
	},
	{
		title: 'Deployment Folder',
		content: `

# Deployment Folder

All files used to run the platform are locatd at the following directory: 

	/data/softeng/deployment/

## Directory Structure:

- **conductorScripts/**: Scripts for orchestrating the deployment process.
    - **deployments/:** Scripts that execute service scripts sequentially based on the deployment configuration. These also include custom post-deployment logs with essential next steps for the deployment scenario.
    - **services/:** Modular scripts for individual service setup tasks. Each file is named according to its purpose, with inline comments documenting the code.

- **configurationFiles/** Stores all required configuration files, including:
    - **arrangerConfigs/** Configuration files specific to Arranger.
    - **elasticsearchConfigs/** indexing mapping configurations for Elasticsearch 

- **Makefile:** A set of simplified commands that run complex Docker operations on Unix systems (macOS, Linux).

- **sampleData:** A directory containing TSV files with 500 sample records each. Each file is named after its corresponding table.

- **csv-processor:** A TypeScript utility that processes TSV files and uploads their data to Elasticsearch.

## Starting up and spinning down the application

Automated deployments are managed through our conductor utility. All make commands need to be run from within the <code>/data/softeng/deployment/</code> folder. 

The following make commands are available to simplify interactions:

**make platform**  
Spins up the application

**make down**  
Spins down the application

**make clean**  
Deletes the persistent Elasticsearch volume *(Warning: this action cannot be undone)*


    `,
	},
	{
		title: 'Customizing the Portal',
		content: `

# Customizing the Portal

Review these essential configuration guides for portal customization:

- <a href="https://docs.overture.bio/guides/administration-guides/customizing-the-data-portal" target="_blank" rel="noopener">Index Mappings</a>: Understand what Index mappings are and how to configure them

- <a href="https://docs.overture.bio/guides/administration-guides/index-mappings" target="_blank" rel="noopener">Search Portal Customization</a>: Learn how to customize how data is displayed in your front-end data facets and table components

    `,
	},
	{
		title: 'Next Steps',
		content: `
		
# Next Steps

As part of the Pan-Canadian Genome Library project we are currently working on releasing a robust new data submission system, specifically designed to manage tabular data management. For details, see our <a href="https://docs.overture.bio/docs/und" target="_blank" rel="noopener">relevant documentation linked here</a>.

<img src="/images/submissionsystem-2.png" alt="New Submission System Architecture Diagram" title="New Submission System Architecture Diagram" />
		`,
	},
	{
		title: 'Developer Note',
		content: `

# Developer Note

Documentation on the software used and customized for this project can be found from the <a href="https://github.com/oicr-softeng/drug_discovery-ui/" target="_blank" rel="noopener">github repositories readme</a>. All customized utilities and components are outlined and further documented with inline comments.

	`,
	},
	{
		title: 'Support',
		content: `
# Support

If you have any questions please don't hesitate to reach out through our <a href="https://docs.overture.bio/community/support" target="_blank" rel="noopener">relevant community support channels</a>. 

- Using public support channels helps us track issues and demonstrates active community engagement, a key indicator of project health.
- For private inquiries, please reach out through OICR Slack or contact@overture.bio.
    `,
	},
];

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
		width: 300px;
		background: ${theme.colors.sidebar};
		border-right: 1px solid ${theme.colors.border};
		position: sticky;
		top: 0;
		height: calc(110vh - 70px);
		overflow-y: auto;
		z-index: 1;

		.sidebar-title {
			padding: 1.5rem 2rem;
			margin: 0;
			font-size: 1rem;
			font-weight: 600;
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

			&.hover {
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

const Documentation = (): ReactElement => {
	const [activeHash, setActiveHash] = useState<string>('');
	const [isClient, setIsClient] = useState(false);

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
							{documentationSections.map((section, index) => {
								const sectionId = section.title.toLowerCase().replace(/\s+/g, '-');
								return (
									<li key={index}>
										<a href={`#${sectionId}`} className={isClient && activeHash === `#${sectionId}` ? 'active' : ''}>
											{section.title}
										</a>
									</li>
								);
							})}
						</ul>
					</nav>
				</aside>

				<main css={styles.main}>
					{documentationSections.map((section, index) => (
						<article key={index} css={styles.content} id={section.title.toLowerCase().replace(/\s+/g, '-')}>
							<div dangerouslySetInnerHTML={{ __html: marked(section.content) }} />
						</article>
					))}
				</main>
			</div>
		</div>
	);
};

export default Documentation;

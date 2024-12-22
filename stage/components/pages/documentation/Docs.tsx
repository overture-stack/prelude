import { ReactElement } from 'react';
import { css } from '@emotion/react';
import { marked } from 'marked';
import defaultTheme from '../../theme';

interface Section {
	title: string;
	content: string;
}

const documentationSections: Section[] = [
	{
		title: 'Portal Overview',
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
		title: 'Submitting Data',
		content: `

# Data Submission

To run the csv-processor, use this path until it's installed globally:

	/data/softeng/deployment/csv-processor/dist/main.js

### Basic Usage:

	csv-processor -f ./csv-processor/mrna.tsv -i mrna-index

### Required Parameters:

- <code>-f, --file</code>: Path to your TSV (tab-separated values) file

### Optional Parameters:

- <code>--url</code>: Elasticsearch URL (default: http://localhost:9200)
- <code>-i, --index</code>: Name for the Elasticsearch index (default: correlation-index)
- <code>-u, --user</code>: Elasticsearch username (default: elastic)
- <code>-p, --password</code>: Elasticsearch password (default: myelasticpassword)
- <code>-b, --batch-size</code>: Number of records to process in each batch (default: 10000)

### Example:

	csv-processor -f ./data.tsv -i my-index -b 1000 -u elastic -p myelasticpassword

## Features:

- Counts total records in your file
- Displays and asks for header confirmation
- Shows progress bar during processing
- Provides real-time statistics:
   - Processing speed
   - Estimated time remaining
- Displays completion summary with any failed records

**Note**: Your TSV file must have headers in the first row and be properly tab-separated.
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

const styles = {
	container: css`
		padding: 2rem;
		margin: 0 auto; // Centers the container
		background-color: ${defaultTheme.colors.main};
		max-width: 1200px;
		width: 100%;

		@media (max-width: 768px) {
			padding: 2rem 1rem; // Reduce padding on smaller screens
		}
	`,

	contentWrapper: css`
		width: 100%;
		display: flex;
		gap: 2rem;
		max-width: 100%; // Ensure content doesn't overflow

		@media (max-width: 768px) {
			flex-direction: column;
		}
	`,
	mainContent: css`
		flex: 1;
		min-width: 0;
	`,
	navWrapper: css`
		width: 250px;
		flex-shrink: 0;
		height: fit-content;
		position: sticky;
		top: 2rem;

		@media (max-width: 768px) {
			width: 100%;
			position: relative;
			top: 0;
		}
	`,
	navigation: css`
		background-color: ${defaultTheme.colors.white};
		padding: 1rem 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border-radius: 0;

		ul {
			list-style: none;
			padding: 0;
			margin: 0;

			@media (max-width: 768px) {
				display: flex;
				gap: 2rem;
			}

			@media (max-width: 600px) {
				flex-direction: column;
				gap: 1rem;
			}
		}

		li a {
			color: ${defaultTheme.colors.button};
			text-decoration: none;
			transition: 0.3s ease;
			font-weight: 600;
			display: block;
			padding: 0.5rem 0;

			&:hover {
				text-decoration: none;
				color: ${defaultTheme.colors.accent};
				transition: 0.3s ease;
			}
		}
	`,

	section: css`
		background-color: ${defaultTheme.colors.white};
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;

		h1 {
			color: ${defaultTheme.colors.button};
			font-size: 1.5rem;
			font-weight: 900;
			margin-bottom: 1.5rem;
		}

		strong,
		b {
			font-weight: 900;
			color: ${defaultTheme.colors.highlight};
		}

		h2 {
			font-size: 1.2rem;
			font-weight: 900;
			margin: 1.5rem 0 1rem;
			padding-bottom: 0.5rem;
			border-bottom: 1px solid ${defaultTheme.colors.main}20;
		}

		p {
			font-size: 1rem;
			margin: 1rem 0;
			line-height: 1.6;
			color: ${defaultTheme.colors.black};
		}

		ul,
		ol {
			padding-left: 1.5rem;

			li {
				margin: 0.5rem 0;
			}
		}

		code {
			background: ${defaultTheme.colors.main};
			padding: 0.2rem 0.4rem;
			border-radius: 3px;
			font-size: 0.9em;
			color: ${defaultTheme.colors.button};
			font-family: monospace;
		}

		a {
			color: ${defaultTheme.colors.hero};
			font-weight: 900;
			text-decoration: none;
			transition: 0.3s ease;

			&:hover {
				color: ${defaultTheme.colors.accent};
				transition: 0.3s ease;
			}
		}

		img {
			width: 90%;
			max-width: 800px;
			height: auto;
			margin: 2rem auto;
			border-radius: 6px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			display: block;

			@media (max-width: 1024px) {
				width: 95%;
				padding: 0.75rem;
			}

			@media (max-width: 768px) {
				width: 100%;
				padding: 0.5rem;
			}
		}
	`,
};

const Documentation = (): ReactElement => {
	return (
		<section css={styles.container}>
			<div css={styles.contentWrapper}>
				<div css={styles.navWrapper}>
					<nav css={styles.navigation}>
						<ul>
							{documentationSections.map((section, index) => (
								<li key={index}>
									<a href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}>{section.title}</a>
								</li>
							))}
						</ul>
					</nav>
				</div>

				<div css={styles.mainContent}>
					{documentationSections.map((section, index) => (
						<section key={index} css={styles.section} id={section.title.toLowerCase().replace(/\s+/g, '-')}>
							<div dangerouslySetInnerHTML={{ __html: marked(section.content) }} />
						</section>
					))}
				</div>
			</div>
		</section>
	);
};

export default Documentation;

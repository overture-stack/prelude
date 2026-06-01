/*
 *
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 *
 *  This program and the accompanying materials are made available under the terms of
 *  the GNU Affero General Public License v3.0. You should have received a copy of the
 *  GNU Affero General Public License along with this program.
 *   If not, see <http://www.gnu.org/licenses/>.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 *  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *  TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 *  IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 *  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import HeroBanner from '@/components/HeroBanner';
import PageLayout from '@/components/PageLayout';
import { css, useTheme } from '@emotion/react';
import { ChangeEvent, ReactElement, useState } from 'react';

import { parseCsv } from '../../../lib/configGenerator/csvParser';
import { generateArrangerConfigs } from '../../../lib/configGenerator/generateArrangerConfigs';
import { generateEsMapping } from '../../../lib/configGenerator/generateEsMapping';
import { generateLecternDictionary } from '../../../lib/configGenerator/generateLecternDictionary';
import { generatePostgresSql } from '../../../lib/configGenerator/generatePostgresTable';

interface GeneratedFile {
	label: string;
	filename: string;
	language: 'json' | 'sql';
	content: string;
}

const sanitizeIndexName = (name: string): string =>
	name
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '');

const buildOutputs = (csvText: string, rawIndexName: string): GeneratedFile[] => {
	const indexName = sanitizeIndexName(rawIndexName) || 'dataset';
	const csv = parseCsv(csvText);

	if (csv.headers.length === 0) {
		throw new Error('No columns found. Make sure the first row contains a header.');
	}

	const esMapping = generateEsMapping(csv, indexName);
	const arranger = generateArrangerConfigs(esMapping, indexName);
	const lectern = generateLecternDictionary(csv, indexName, indexName);
	const sql = generatePostgresSql(csv, indexName);

	const json = (value: unknown) => JSON.stringify(value, null, 2);

	return [
		{ label: 'Elasticsearch Mapping', filename: `${indexName}_mapping.json`, language: 'json', content: json(esMapping) },
		{ label: 'Arranger — base', filename: 'base.json', language: 'json', content: json(arranger.base) },
		{ label: 'Arranger — extended', filename: 'extended.json', language: 'json', content: json(arranger.extended) },
		{ label: 'Arranger — table', filename: 'table.json', language: 'json', content: json(arranger.table) },
		{ label: 'Arranger — facets', filename: 'facets.json', language: 'json', content: json(arranger.facets) },
		{ label: 'Lectern Dictionary', filename: `${indexName}_dictionary.json`, language: 'json', content: json(lectern) },
		{ label: 'PostgreSQL Table', filename: `${indexName}.sql`, language: 'sql', content: sql },
	];
};

const OutputCard = ({ file }: { file: GeneratedFile }): ReactElement => {
	const theme = useTheme();
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		await navigator.clipboard.writeText(file.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const download = () => {
		const blob = new Blob([file.content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = file.filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div
			css={css`
				border: 1px solid ${theme.colors.grey_2};
				border-radius: 6px;
				background-color: ${theme.colors.white};
				margin-bottom: 16px;
				overflow: hidden;
			`}
		>
			<div
				css={css`
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 10px 14px;
					background-color: ${theme.colors.grey_1};
					border-bottom: 1px solid ${theme.colors.grey_2};
				`}
			>
				<span
					css={css`
						${theme.typography.subheading2};
						color: ${theme.colors.primary};
					`}
				>
					{file.label}{' '}
					<span
						css={css`
							color: ${theme.colors.grey_3};
							font-weight: normal;
						`}
					>
						({file.filename})
					</span>
				</span>
				<span>
					<button type="button" onClick={copy} css={smallButton(theme)}>
						{copied ? 'Copied!' : 'Copy'}
					</button>
					<button type="button" onClick={download} css={smallButton(theme)}>
						Download
					</button>
				</span>
			</div>
			<pre
				css={css`
					margin: 0;
					padding: 14px;
					max-height: 320px;
					overflow: auto;
					font-family: 'SFMono-Regular', Consolas, monospace;
					font-size: 12px;
					line-height: 1.5;
					color: ${theme.colors.black};
				`}
			>
				{file.content}
			</pre>
		</div>
	);
};

const smallButton = (theme: any) => css`
	${theme.typography.subheading2};
	margin-left: 8px;
	padding: 4px 12px;
	border-radius: 4px;
	border: 1px solid ${theme.colors.grey_3};
	background-color: ${theme.colors.white};
	color: ${theme.colors.secondary_accessible};
	cursor: pointer;
	&:hover {
		background-color: ${theme.colors.grey_1};
	}
`;

const ConfigGeneratorContent = (): ReactElement => {
	const theme = useTheme();
	const [csvText, setCsvText] = useState('');
	const [indexName, setIndexName] = useState('');
	const [outputs, setOutputs] = useState<GeneratedFile[]>([]);
	const [error, setError] = useState('');

	const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			setCsvText(String(reader.result ?? ''));
			if (!indexName) setIndexName(file.name.replace(/\.[^.]+$/, ''));
		};
		reader.readAsText(file);
	};

	const generate = () => {
		try {
			setError('');
			setOutputs(buildOutputs(csvText, indexName));
		} catch (err) {
			setOutputs([]);
			setError(err instanceof Error ? err.message : 'Failed to generate configs.');
		}
	};

	return (
		<main
			css={css`
				background-color: ${theme.colors.grey_1};
				min-height: 100vh;
			`}
		>
			<HeroBanner
				title="Config Generator"
				description="Paste or upload a CSV to generate Elasticsearch, Arranger, Lectern, and PostgreSQL configs."
				breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Config Generator' }]}
				fixed={false}
			/>
			<div
				css={css`
					max-width: 1000px;
					margin: 0 auto;
					padding: 32px 24px 80px;
				`}
			>
				<label
					css={css`
						display: block;
						${theme.typography.subheading2};
						color: ${theme.colors.primary};
						margin-bottom: 6px;
					`}
				>
					Index / table name
				</label>
				<input
					type="text"
					value={indexName}
					placeholder="e.g. correlation"
					onChange={(e) => setIndexName(e.target.value)}
					css={css`
						width: 100%;
						padding: 8px 10px;
						margin-bottom: 18px;
						border: 1px solid ${theme.colors.grey_3};
						border-radius: 4px;
						${theme.typography.regular};
					`}
				/>

				<label
					css={css`
						display: block;
						${theme.typography.subheading2};
						color: ${theme.colors.primary};
						margin-bottom: 6px;
					`}
				>
					CSV data (first row = headers)
				</label>
				<textarea
					value={csvText}
					placeholder={'gene_id,expression_value,is_significant\nENSG001,12.4,true'}
					onChange={(e) => setCsvText(e.target.value)}
					css={css`
						width: 100%;
						min-height: 180px;
						padding: 10px;
						border: 1px solid ${theme.colors.grey_3};
						border-radius: 4px;
						font-family: 'SFMono-Regular', Consolas, monospace;
						font-size: 13px;
						resize: vertical;
					`}
				/>

				<div
					css={css`
						display: flex;
						align-items: center;
						gap: 16px;
						margin-top: 14px;
					`}
				>
					<button
						type="button"
						onClick={generate}
						css={css`
							${theme.typography.subheading2};
							padding: 8px 20px;
							border-radius: 5px;
							border: 1px solid ${theme.colors.accent};
							background-color: ${theme.colors.primary};
							color: ${theme.colors.white};
							cursor: pointer;
							&:hover {
								background-color: ${theme.colors.primary_dark};
							}
						`}
					>
						Generate configs
					</button>
					<label
						css={css`
							${theme.typography.regular};
							color: ${theme.colors.secondary_accessible};
							cursor: pointer;
						`}
					>
						or upload a CSV file
						<input type="file" accept=".csv,.tsv,text/csv" onChange={handleFile} css={css`display: none;`} />
					</label>
				</div>

				{error && (
					<p
						css={css`
							margin-top: 16px;
							color: ${theme.colors.error_dark};
							${theme.typography.regular};
						`}
					>
						{error}
					</p>
				)}

				{outputs.length > 0 && (
					<div
						css={css`
							margin-top: 32px;
						`}
					>
						<h2
							css={css`
								${theme.typography.subheading};
								color: ${theme.colors.primary};
								margin-bottom: 16px;
							`}
						>
							Generated configuration
						</h2>
						{outputs.map((file) => (
							<OutputCard key={file.filename} file={file} />
						))}
					</div>
				)}
			</div>
		</main>
	);
};

const ConfigGenerator = (): ReactElement => (
	<PageLayout>
		<ConfigGeneratorContent />
	</PageLayout>
);

export default ConfigGenerator;

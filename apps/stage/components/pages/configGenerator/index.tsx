import { css, useTheme } from '@emotion/react';
import { ChangeEvent, ReactElement, useRef, useState } from 'react';

import Button from '@/components/Button';
import HeroBanner from '@/components/HeroBanner';
import PageLayout from '@/components/PageLayout';
import type { GenerateConfigsResponse } from '@/pages/api/generate-configs';

type DocType = 'file' | 'analysis';

const OUTPUT_TABS = [
	{ key: 'esMapping', label: 'elasticsearch-mapping.json' },
	{ key: 'arrangerBase', label: 'arranger/base.json' },
	{ key: 'arrangerExtended', label: 'arranger/extended.json' },
	{ key: 'arrangerTable', label: 'arranger/table.json' },
	{ key: 'arrangerFacets', label: 'arranger/facets.json' },
	{ key: 'postgresSql', label: 'postgres-table.sql' },
] as const;

type OutputKey = (typeof OUTPUT_TABS)[number]['key'];

function formatOutput(key: OutputKey, configs: GenerateConfigsResponse): string {
	const value = configs[key];
	return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function deriveNameFromCsv(csvText: string, filename: string): string {
	const base = filename.replace(/\.csv$/i, '') || csvText.split(',')[0] || 'data';
	return base
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 40);
}

function previewRows(csvText: string): string[][] {
	return csvText
		.split(/\r?\n/)
		.filter((l) => l.trim())
		.slice(0, 6)
		.map((line) => line.split(',').map((f) => f.replace(/^"|"$/g, '').trim()));
}

const ConfigGenerator = (): ReactElement => {
	const theme = useTheme();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [csvText, setCsvText] = useState('');
	const [filename, setFilename] = useState('');
	const [indexName, setIndexName] = useState('');
	const [tableName, setTableName] = useState('');
	const [docType, setDocType] = useState<DocType>('file');
	const [configs, setConfigs] = useState<GenerateConfigsResponse | null>(null);
	const [activeTab, setActiveTab] = useState<OutputKey>('esMapping');
	const [copiedTab, setCopiedTab] = useState<OutputKey | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const loadCsv = (text: string, name: string) => {
		setCsvText(text);
		setFilename(name);
		setConfigs(null);
		setError(null);
		const derived = deriveNameFromCsv(text, name);
		setIndexName((prev) => prev || derived);
		setTableName((prev) => prev || derived);
	};

	const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => loadCsv(ev.target?.result as string, file.name);
		reader.readAsText(file);
	};

	const onPasteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		loadCsv(e.target.value, filename || 'data');
	};

	const generate = async () => {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch('/api/generate-configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ csvContent: csvText, indexName, documentType: docType, tableName }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Generation failed');
			setConfigs(data);
			setActiveTab('esMapping');
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Generation failed');
		} finally {
			setLoading(false);
		}
	};

	const copyTab = async (key: OutputKey) => {
		if (!configs) return;
		await navigator.clipboard.writeText(formatOutput(key, configs));
		setCopiedTab(key);
		setTimeout(() => setCopiedTab(null), 1500);
	};

	// ─── Shared styles ─────────────────────────────────────────────────────────

	const inputStyle = css`
		width: 100%;
		box-sizing: border-box;
		border: 1px solid ${theme.colors.grey_3};
		border-radius: 4px;
		padding: 8px 10px;
		font-size: 13px;
		font-family: inherit;
		color: ${theme.colors.black};
		background: ${theme.colors.white};
		&:focus {
			outline: none;
			border-color: ${theme.colors.primary};
		}
	`;

	const sectionStyle = css`
		background: ${theme.colors.white};
		border: 1px solid ${theme.colors.grey_3};
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 24px;
		margin-bottom: 20px;
	`;

	const sectionHeadingStyle = css`
		font-size: 1.125rem;
		font-weight: 600;
		color: ${theme.colors.primary};
		margin: 0 0 16px;
	`;

	const labelStyle = css`
		${theme.typography.label};
		color: ${theme.colors.black};
		margin-bottom: 4px;
		display: block;
	`;

	const rows = csvText ? previewRows(csvText) : [];

	return (
		<PageLayout subtitle="Config Generator">
			<main
				css={css`
					background: ${theme.colors.grey_1};
					min-height: 100vh;
				`}
			>
				<HeroBanner
					title="Config Generator"
					description="Upload or paste a CSV file to generate Elasticsearch, PostgreSQL, and Arranger configuration files."
					breadcrumbs={[{ label: 'Home', href: '/home' }]}
					fixed={false}
				/>

				<div
					css={css`
						width: 95%;
						max-width: 1550px;
						margin: 0 auto;
						padding: 32px 16px 64px;
					`}
				>
					{/* Step 1 – CSV input */}
					<section css={sectionStyle}>
						<h2 css={sectionHeadingStyle}>1. Provide CSV Data</h2>

						<div css={css`display: flex; gap: 12px; margin-bottom: 16px; align-items: center;`}>
							<Button onClick={() => fileInputRef.current?.click()}>Upload .csv file</Button>
							{filename && (
								<span css={css`font-size: 13px; color: ${theme.colors.grey_5};`}>{filename}</span>
							)}
							<input
								ref={fileInputRef}
								type="file"
								accept=".csv"
								onChange={onFileChange}
								css={css`display: none;`}
							/>
						</div>

						<label css={labelStyle}>Or paste CSV content</label>
						<textarea
							value={csvText}
							onChange={onPasteChange}
							placeholder={'donor_id,age,diagnosis\nDO001,45,C34.1\n...'}
							rows={6}
							css={css`
								${inputStyle};
								font-family: monospace;
								font-size: 12px;
								resize: vertical;
							`}
						/>

						{rows.length > 0 && (
							<div css={css`margin-top: 16px; overflow-x: auto;`}>
								<p css={css`font-size: 12px; color: ${theme.colors.grey_5}; margin: 0 0 6px;`}>
									Preview (first 5 rows)
								</p>
								<table css={css`border-collapse: collapse; font-size: 12px; width: 100%; min-width: max-content;`}>
									<tbody>
										{rows.map((row, ri) => (
											<tr
												key={ri}
												css={css`
													background: ${ri === 0
														? theme.colors.primary_palest
														: ri % 2 === 0
														? theme.colors.grey_1
														: theme.colors.white};
												`}
											>
												{row.map((cell, ci) => (
													<td
														key={ci}
														css={css`
															border: 1px solid ${theme.colors.grey_2};
															padding: 4px 10px;
															white-space: nowrap;
															font-weight: ${ri === 0 ? '600' : 'normal'};
															color: ${ri === 0 ? theme.colors.primary : theme.colors.black};
														`}
													>
														{cell}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>

					{/* Step 2 – Options */}
					<section css={sectionStyle}>
						<h2 css={sectionHeadingStyle}>2. Configure Options</h2>
						<div css={css`display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;`}>
							<div>
								<label css={labelStyle}>Index name</label>
								<input
									value={indexName}
									onChange={(e) => setIndexName(e.target.value)}
									placeholder="e.g. datatable1"
									css={inputStyle}
								/>
							</div>
							<div>
								<label css={labelStyle}>Table name</label>
								<input
									value={tableName}
									onChange={(e) => setTableName(e.target.value)}
									placeholder="e.g. datatable1"
									css={inputStyle}
								/>
							</div>
							<div>
								<label css={labelStyle}>Document type</label>
								<select
									value={docType}
									onChange={(e) => setDocType(e.target.value as DocType)}
									css={css`${inputStyle}; cursor: pointer;`}
								>
									<option value="file">file</option>
									<option value="analysis">analysis</option>
								</select>
							</div>
						</div>
					</section>

					{/* Generate */}
					<Button
						onClick={generate}
						disabled={!csvText.trim() || !indexName.trim() || loading}
						isAsync
						css={css`
							width: 100%;
							justify-content: center;
							font-size: 15px;
							padding: 12px;
							margin-bottom: 20px;
						`}
					>
						{loading ? 'Generating…' : 'Generate Configs'}
					</Button>

					{error && (
						<div
							css={css`
								background: ${theme.colors.grey_1};
								border: 1px solid ${theme.colors.error};
								border-radius: 5px;
								padding: 12px 16px;
								font-size: 13px;
								color: ${theme.colors.error_dark};
								margin-bottom: 20px;
							`}
						>
							{error}
						</div>
					)}

					{/* Step 3 – Output */}
					{configs && (
						<section
							css={css`
								background: ${theme.colors.white};
								border: 1px solid ${theme.colors.grey_3};
								border-radius: 8px;
								box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
								overflow: hidden;
							`}
						>
							<h2
								css={css`
									font-size: 1.125rem;
									font-weight: 600;
									color: ${theme.colors.primary};
									margin: 0;
									padding: 20px 24px 0;
								`}
							>
								3. Generated Configs
							</h2>

							<div
								css={css`
									display: flex;
									border-bottom: 1px solid ${theme.colors.grey_2};
									overflow-x: auto;
									padding: 0 24px;
									margin-top: 16px;
								`}
							>
								{OUTPUT_TABS.map(({ key, label }) => (
									<button
										key={key}
										onClick={() => setActiveTab(key)}
										css={css`
											padding: 10px 14px;
											font-size: 12px;
											font-family: monospace;
											white-space: nowrap;
											cursor: pointer;
											border: none;
											border-bottom: 3px solid ${activeTab === key ? theme.colors.primary : 'transparent'};
											background: transparent;
											color: ${activeTab === key ? theme.colors.primary : theme.colors.grey_5};
											font-weight: ${activeTab === key ? '600' : 'normal'};
											margin-bottom: -1px;
										`}
									>
										{label}
									</button>
								))}
							</div>

							<div css={css`position: relative;`}>
								<button
									onClick={() => copyTab(activeTab)}
									css={css`
										position: absolute;
										top: 12px;
										right: 12px;
										padding: 5px 12px;
										font-size: 12px;
										cursor: pointer;
										border: 1px solid ${theme.colors.grey_3};
										border-radius: 4px;
										background: ${theme.colors.white};
										color: ${copiedTab === activeTab ? theme.colors.success : theme.colors.grey_5};
										z-index: 1;
									`}
								>
									{copiedTab === activeTab ? 'Copied!' : 'Copy'}
								</button>
								<pre
									css={css`
										margin: 0;
										padding: 16px;
										overflow-x: auto;
										font-size: 12px;
										line-height: 1.6;
										background: ${theme.colors.grey_1};
										color: ${theme.colors.black};
										max-height: 480px;
										overflow-y: auto;
									`}
								>
									{formatOutput(activeTab, configs)}
								</pre>
							</div>
						</section>
					)}
				</div>
			</main>
		</PageLayout>
	);
};

export default ConfigGenerator;

import { css, useTheme } from '@emotion/react';
import { ChangeEvent, ReactElement, useRef, useState } from 'react';

import Button from '@/components/Button';
import PageLayout from '@/components/PageLayout';
import type { SubmitRequest, SubmitResponse } from '@/pages/api/submit';
import type { SubmissionError } from '@/lib/conductor/pipeline';

// ─── Preview helpers ──────────────────────────────────────────────────────────

function previewRows(csvText: string, delimiter: string): string[][] {
	return csvText
		.split(/\r?\n/)
		.filter((l) => l.trim())
		.slice(0, 6)
		.map((line) => line.split(delimiter).map((f) => f.replace(/^"|"$/g, '').trim()));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type Status = 'success' | 'partial' | 'failed';

function deriveStatus(result: SubmitResponse): Status {
	if (result.errors.length > 0 && result.inserted === 0) return 'failed';
	if (result.errors.length > 0 || result.indexed < result.inserted) return 'partial';
	return 'success';
}

const STATUS_LABEL: Record<Status, string> = {
	success: 'Success',
	partial: 'Partial Success',
	failed: 'Failed',
};

const DELIMITER_OPTIONS = [
	{ label: 'Comma (,)', value: ',' },
	{ label: 'Tab (\\t)', value: '\t' },
	{ label: 'Semicolon (;)', value: ';' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const SubmitData = (): ReactElement => {
	const theme = useTheme();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [csvText, setCsvText] = useState('');
	const [filename, setFilename] = useState('');
	const [tableName, setTableName] = useState('');
	const [indexBase, setIndexBase] = useState('');
	const [delimiter, setDelimiter] = useState(',');

	const [result, setResult] = useState<SubmitResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [errorsExpanded, setErrorsExpanded] = useState(false);
	const [logExpanded, setLogExpanded] = useState(false);

	const indexName = indexBase.trim() ? `${indexBase.trim()}_centric` : '';

	const loadCsv = (text: string, name: string) => {
		setCsvText(text);
		setFilename(name);
		setResult(null);
		setError(null);
	};

	const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => loadCsv(ev.target?.result as string, file.name);
		reader.readAsText(file);
	};

	const reset = () => {
		setCsvText('');
		setFilename('');
		setResult(null);
		setError(null);
		setErrorsExpanded(false);
		setLogExpanded(false);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const submit = async () => {
		setError(null);
		setResult(null);
		setErrorsExpanded(false);
		setLoading(true);
		try {
			const body: SubmitRequest = {
				csvContent: csvText,
				tableName: tableName.trim(),
				indexName,
				delimiter,
				filename: filename || 'upload.csv',
			};
			const res = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Submission failed');
			setResult(data as SubmitResponse);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Submission failed');
		} finally {
			setLoading(false);
		}
	};

	const canSubmit = csvText.trim() && tableName.trim() && indexBase.trim() && !loading;

	// ─── Styles ─────────────────────────────────────────────────────────────

	const labelStyle = css`
		font-size: 13px;
		font-weight: bold;
		color: ${theme.colors.black};
		margin-bottom: 4px;
		display: block;
	`;

	const inputStyle = css`
		width: 100%;
		box-sizing: border-box;
		border: 1px solid ${theme.colors.grey_3};
		border-radius: 3px;
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
		border: 1px solid ${theme.colors.grey_2};
		border-radius: 5px;
		padding: 24px;
		margin-bottom: 20px;
	`;

	const sectionHeadingStyle = css`
		font-size: 15px;
		font-weight: bold;
		color: ${theme.colors.black};
		margin: 0 0 16px;
	`;

	const helpTextStyle = css`
		font-size: 12px;
		color: ${theme.colors.grey_5};
		margin-top: 4px;
	`;

	// ─── Results ─────────────────────────────────────────────────────────────

	const rows = csvText ? previewRows(csvText, delimiter) : [];

	const status = result ? deriveStatus(result) : null;

	const statusColor: Record<Status, string> = {
		success: theme.colors.success,
		partial: '#e6a817',
		failed: theme.colors.error,
	};

	const errorsByStage = result
		? result.errors.reduce(
				(acc, e) => {
					acc[e.stage] = [...(acc[e.stage] || []), e];
					return acc;
				},
				{} as Record<string, SubmissionError[]>,
		  )
		: {};

	return (
		<PageLayout subtitle="Submit Data">
			<div
				css={css`
					max-width: 960px;
					margin: 0 auto;
					padding: 32px 24px 64px;
				`}
			>
				<h1
					css={css`
						font-size: 22px;
						font-weight: bold;
						color: ${theme.colors.accent_dark};
						margin: 0 0 6px;
					`}
				>
					Submit Data
				</h1>
				<p
					css={css`
						font-size: 14px;
						color: ${theme.colors.grey_5};
						margin: 0 0 32px;
					`}
				>
					Upload a CSV file to ingest data into PostgreSQL and Elasticsearch.
				</p>

				{/* Step 1 – Target */}
				<section css={sectionStyle}>
					<h2 css={sectionHeadingStyle}>1. Select Target</h2>
					<div css={css`display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;`}>
						<div>
							<label css={labelStyle}>PostgreSQL table</label>
							<input
								value={tableName}
								onChange={(e) => setTableName(e.target.value)}
								placeholder="e.g. datatable1"
								css={inputStyle}
							/>
						</div>
						<div>
							<label css={labelStyle}>Elasticsearch index</label>
							<input
								value={indexBase}
								onChange={(e) => setIndexBase(e.target.value)}
								placeholder="e.g. datatable1"
								css={inputStyle}
							/>
							{indexBase.trim() && (
								<p css={helpTextStyle}>Targets: <strong>{indexName}</strong></p>
							)}
							{!indexBase.trim() && (
								<p css={helpTextStyle}>Auto-suffixed with _centric</p>
							)}
						</div>
						<div>
							<label css={labelStyle}>Delimiter</label>
							<select
								value={delimiter}
								onChange={(e) => setDelimiter(e.target.value)}
								css={css`${inputStyle}; cursor: pointer;`}
							>
								{DELIMITER_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</section>

				{/* Step 2 – CSV */}
				<section css={sectionStyle}>
					<h2 css={sectionHeadingStyle}>2. Provide CSV Data</h2>

					<div css={css`display: flex; gap: 12px; margin-bottom: 16px; align-items: center;`}>
						<Button onClick={() => fileInputRef.current?.click()}>Upload .csv file</Button>
						{filename && (
							<span css={css`font-size: 13px; color: ${theme.colors.grey_5};`}>{filename}</span>
						)}
						<input
							ref={fileInputRef}
							type="file"
							accept=".csv,.tsv"
							onChange={onFileChange}
							css={css`display: none;`}
						/>
					</div>

					<label css={labelStyle}>Or paste CSV content</label>
					<textarea
						value={csvText}
						onChange={(e) => loadCsv(e.target.value, filename || 'data.csv')}
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
														font-weight: ${ri === 0 ? 'bold' : 'normal'};
														color: ${ri === 0 ? theme.colors.accent_dark : theme.colors.black};
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

				{/* Submit */}
				<Button
					onClick={submit}
					disabled={!canSubmit}
					isAsync
					css={css`
						width: 100%;
						justify-content: center;
						font-size: 15px;
						padding: 12px;
						margin-bottom: 20px;
					`}
				>
					{loading ? 'Submitting…' : 'Submit Data'}
				</Button>

				{/* Top-level error */}
				{error && (
					<div
						css={css`
							background: ${theme.colors.error_light};
							border: 1px solid ${theme.colors.error};
							border-radius: 4px;
							padding: 12px 16px;
							font-size: 13px;
							color: ${theme.colors.error_dark};
							margin-bottom: 20px;
						`}
					>
						{error}
					</div>
				)}

				{/* Results */}
				{result && status && (
					<section
						css={css`
							background: ${theme.colors.white};
							border: 1px solid ${theme.colors.grey_2};
							border-radius: 5px;
							overflow: hidden;
						`}
					>
						{/* Header */}
						<div
							css={css`
								display: flex;
								align-items: center;
								justify-content: space-between;
								padding: 20px 24px;
								border-bottom: 1px solid ${theme.colors.grey_2};
							`}
						>
							<h2
								css={css`
									font-size: 15px;
									font-weight: bold;
									color: ${theme.colors.black};
									margin: 0;
								`}
							>
								3. Submission Results
							</h2>
							<span
								css={css`
									font-size: 12px;
									font-weight: bold;
									padding: 4px 12px;
									border-radius: 12px;
									background: ${statusColor[status]}22;
									color: ${statusColor[status]};
									border: 1px solid ${statusColor[status]};
								`}
							>
								{STATUS_LABEL[status]}
							</span>
						</div>

						{/* Stat cards */}
						<div
							css={css`
								display: grid;
								grid-template-columns: repeat(4, 1fr);
								gap: 0;
								border-bottom: 1px solid ${theme.colors.grey_2};
							`}
						>
							{[
								{ label: 'Total rows', value: result.total },
								{ label: 'Inserted (PG)', value: result.inserted, color: theme.colors.success },
								{ label: 'Skipped (duplicates)', value: result.skipped, color: theme.colors.grey_5 },
								{ label: 'Indexed (ES)', value: result.indexed, color: result.indexed > 0 ? theme.colors.primary : undefined },
							].map(({ label, value, color }, i) => (
								<div
									key={i}
									css={css`
										padding: 20px;
										text-align: center;
										border-right: ${i < 3 ? `1px solid ${theme.colors.grey_2}` : 'none'};
									`}
								>
									<div
										css={css`
											font-size: 28px;
											font-weight: bold;
											color: ${color ?? theme.colors.black};
											line-height: 1;
											margin-bottom: 6px;
										`}
									>
										{value}
									</div>
									<div css={css`font-size: 12px; color: ${theme.colors.grey_5};`}>{label}</div>
								</div>
							))}
						</div>

						{/* Errors */}
						{result.errors.length > 0 && (
							<div css={css`padding: 20px 24px;`}>
								<button
									onClick={() => setErrorsExpanded((v) => !v)}
									css={css`
										display: flex;
										align-items: center;
										gap: 8px;
										background: none;
										border: none;
										cursor: pointer;
										font-size: 13px;
										font-weight: bold;
										color: ${theme.colors.error_dark};
										padding: 0;
										margin-bottom: ${errorsExpanded ? '16px' : '0'};
									`}
								>
									<span
										css={css`
											display: inline-flex;
											align-items: center;
											justify-content: center;
											width: 20px;
											height: 20px;
											border-radius: 50%;
											background: ${theme.colors.error};
											color: white;
											font-size: 11px;
										`}
									>
										{result.errors.length}
									</span>
									{result.errors.length === 1 ? 'error' : 'errors'}
									<span css={css`font-size: 11px; color: ${theme.colors.grey_5}; font-weight: normal;`}>
										{errorsExpanded ? '▲ hide' : '▼ show'}
									</span>
								</button>

								{errorsExpanded && (
									<div css={css`display: flex; flex-direction: column; gap: 12px;`}>
										{(['validation', 'postgres', 'elasticsearch'] as const).map((stage) => {
											const stageErrors = errorsByStage[stage];
											if (!stageErrors?.length) return null;
											return (
												<div key={stage}>
													<p
														css={css`
															font-size: 11px;
															font-weight: bold;
															text-transform: uppercase;
															color: ${theme.colors.grey_5};
															margin: 0 0 6px;
															letter-spacing: 0.5px;
														`}
													>
														{stage}
													</p>
													{stageErrors.map((e, i) => (
														<div
															key={i}
															css={css`
																background: ${theme.colors.error_light};
																border: 1px solid ${theme.colors.error};
																border-radius: 4px;
																padding: 10px 14px;
																margin-bottom: 6px;
																font-size: 12px;
																color: ${theme.colors.error_dark};
															`}
														>
															<div>{e.message}</div>
															{e.detail && (
																<div
																	css={css`
																		margin-top: 4px;
																		font-size: 11px;
																		color: ${theme.colors.grey_5};
																		font-family: monospace;
																	`}
																>
																	{e.detail}
																</div>
															)}
														</div>
													))}
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}

						{/* Full log */}
						{result.log?.length > 0 && (
							<div
								css={css`
									padding: 0 24px 20px;
									border-top: 1px solid ${theme.colors.grey_2};
									padding-top: 16px;
								`}
							>
								<button
									onClick={() => setLogExpanded((v) => !v)}
									css={css`
										background: none;
										border: none;
										cursor: pointer;
										font-size: 13px;
										color: ${theme.colors.grey_5};
										padding: 0;
										display: flex;
										align-items: center;
										gap: 6px;
										margin-bottom: ${logExpanded ? '12px' : '0'};
									`}
								>
									<span>{logExpanded ? '▲' : '▼'}</span>
									{logExpanded ? 'Hide full log' : 'See full log'}
								</button>
								{logExpanded && (
									<pre
										css={css`
											margin: 0;
											padding: 14px;
											background: ${theme.colors.grey_1};
											border: 1px solid ${theme.colors.grey_2};
											border-radius: 4px;
											font-size: 11px;
											font-family: monospace;
											line-height: 1.7;
											overflow-x: auto;
											max-height: 320px;
											overflow-y: auto;
											color: ${theme.colors.black};
											white-space: pre;
										`}
									>
										{result.log.map((line, i) => {
											const color = line.includes(' OK    ')
												? theme.colors.success
												: line.includes(' ERROR ')
												? theme.colors.error
												: line.includes(' WARN  ')
												? '#b07d00'
												: line.includes(' DONE  ')
												? theme.colors.primary
												: theme.colors.grey_5;
											return (
												<span key={i} css={css`color: ${color}; display: block;`}>
													{line}
												</span>
											);
										})}
									</pre>
								)}
							</div>
						)}

						{/* Footer */}
						<div
							css={css`
								padding: 16px 24px;
								border-top: 1px solid ${theme.colors.grey_2};
								display: flex;
								justify-content: flex-end;
							`}
						>
							<Button onClick={reset}>Submit another file</Button>
						</div>
					</section>
				)}
			</div>
		</PageLayout>
	);
};

export default SubmitData;

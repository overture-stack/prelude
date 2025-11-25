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

import { css, useTheme } from '@emotion/react';
import { useTableContext } from '@overture-stack/arranger-components';
import { ArrowIcon } from '@overture-stack/arranger-components/dist/Icons';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { countUniqueHugoSymbols, extractHugoSymbols } from '../../../global/utils/hugoSymbolExtractor';
import { buildFilterUrl, estimateMaxGenes, wouldExceedUrlLimit } from './crossTableFilters';

interface DataTableInfo {
	id: string;
	title: string;
	path: string;
}

interface CrossTableFilterButtonProps {
	currentTableName?: string; // Optional - will use router if not provided
}

/**
 * CrossTableFilterButton Component
 *
 * Allows users to apply selected Hugo symbols from the current table
 * as filters on other data tables.
 *
 * Features:
 * - Displays count badge when rows are selected
 * - Dropdown menu with available target tables
 * - URL length validation
 * - Automatic gene extraction from selected rows
 *
 * Usage:
 * ```tsx
 * <CrossTableFilterButton currentTableName="expressionTable" />
 * // Or when used in Toolbar (currentTableName auto-detected from URL):
 * <CrossTableFilterButton />
 * ```
 */
export const CrossTableFilterButton: React.FC<CrossTableFilterButtonProps> = ({ currentTableName: propTableName }) => {
	const router = useRouter();
	const theme = useTheme();

	// Use prop if provided, otherwise extract from router
	const currentTableName = propTableName || router.pathname.replace('/', '') || 'unknown';
	const dropdownRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	// Get data from Arranger's table context
	const tableContext = useTableContext();
	const selectedRowIds = tableContext?.selectedRows || []; // Array of IDs
	const tableData = tableContext?.tableData || []; // Array of actual row data
	const rowIdFieldName = tableContext?.rowIdFieldName || 'id';

	// Helper function to get nested value from object using dot notation
	const getNestedValue = (obj: any, path: string): any => {
		if (!obj || !path) return undefined;
		const keys = path.split('.');
		let current = obj;
		for (const key of keys) {
			if (current === null || current === undefined) return undefined;
			current = current[key];
		}
		return current;
	};

	// Debug: Log ALL context data to understand structure
	useEffect(() => {
		if (selectedRowIds.length > 0) {
			console.log('=== CrossTableFilterButton Debug ===');
			console.log('Selected row IDs:', selectedRowIds);
			console.log('Selected row IDs count:', selectedRowIds.length);
			console.log('Table data count:', tableData.length);
			console.log('Row ID field name:', rowIdFieldName);
			console.log('Full table context:', tableContext);
			if (tableData.length > 0) {
				console.log('First table data row:', tableData[0]);
				console.log('First table data row ID field value:', getNestedValue(tableData[0], rowIdFieldName));
			}
		}
	}, [selectedRowIds, tableData, rowIdFieldName, tableContext]);

	// Match selected IDs with actual row data
	const selectedRowsData = React.useMemo(() => {
		if (selectedRowIds.length === 0 || tableData.length === 0) {
			console.log('selectedRowsData empty because:', {
				noSelectedIds: selectedRowIds.length === 0,
				noTableData: tableData.length === 0,
			});
			return [];
		}

		const matched = tableData.filter((row: any) => {
			// Use getNestedValue to handle dot-notation paths like 'submission_metadata.submission_id'
			const rowId = getNestedValue(row, rowIdFieldName);
			const isMatch = selectedRowIds.includes(rowId);
			if (process.env.NODE_ENV === 'development') {
				console.log(`Checking row: rowId="${rowId}", isMatch=${isMatch}`);
			}
			return isMatch;
		});

		console.log('Matched rows count:', matched.length);
		if (matched.length > 0) {
			console.log('First matched row:', matched[0]);
		}

		return matched;
	}, [selectedRowIds, tableData, rowIdFieldName]);

	const selectionCount = selectedRowIds.length;

	// State management
	const [dataTables, setDataTables] = useState<DataTableInfo[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Fetch available tables (excluding current table)
	useEffect(() => {
		fetch('/api/data-tables')
			.then((res) => res.json())
			.then((data: DataTableInfo[]) => {
				const otherTables = data.filter((table) => table.id !== currentTableName);
				setDataTables(otherTables);
			})
			.catch((error) => {
				console.error('Error fetching data tables:', error);
			});
	}, [currentTableName]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen]);

	const handleApplyToTable = (targetTableId: string, targetTableTitle: string) => {
		console.log('🚀 BUTTON CLICKED! Target:', targetTableId);
		setIsLoading(true);

		try {
			console.log('📊 Selected rows data:', selectedRowsData);
			console.log('📍 Current table:', currentTableName);

			// Extract Hugo symbols from selected rows
			const symbols = extractHugoSymbols(selectedRowsData, currentTableName);

			if (symbols.length === 0) {
				alert('No Hugo symbols found in selected rows. Please ensure the selected rows contain gene data.');
				setIsLoading(false);
				return;
			}

			console.log('=== Building Cross-Table Filter ===');
			console.log('Symbols:', symbols);
			console.log('Target table:', targetTableId);

			// Check URL length limits
			if (wouldExceedUrlLimit(symbols, targetTableId)) {
				const maxGenes = estimateMaxGenes(targetTableId);
				alert(
					`Too many genes selected (${symbols.length}).\n\n` +
						`The URL would be too long for the browser to handle.\n` +
						`Please select fewer rows (recommended max: ~${maxGenes} genes).`,
				);
				setIsLoading(false);
				return;
			}

			// Build filter URL
			const filterUrl = buildFilterUrl(symbols, targetTableId);
			console.log('Built filter URL:', filterUrl);

			if (!filterUrl) {
				alert('Unable to build filter URL. Please try again.');
				setIsLoading(false);
				return;
			}

			// Navigate to target table with filter
			router.push(filterUrl);
		} catch (error) {
			console.error('Error applying cross-table filter:', error);
			alert('An error occurred while applying the filter. Please try again.');
			setIsLoading(false);
		}
	};

	// Don't render if no rows selected
	if (selectionCount === 0) {
		return null;
	}

	const uniqueGeneCount = countUniqueHugoSymbols(selectedRowsData, currentTableName);

	// Debug: Log gene count
	if (process.env.NODE_ENV === 'development') {
		console.log('CrossTableFilterButton - Gene count:', uniqueGeneCount);
		console.log('CrossTableFilterButton - Current table:', currentTableName);
	}

	return (
		<div
			ref={dropdownRef}
			css={css`
				position: relative;
				display: inline-block;
			`}
		>
			<button
				ref={buttonRef}
				onClick={() => setIsOpen(!isOpen)}
				disabled={isLoading}
				css={css`
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 0.3rem;
					width: auto;
					min-width: 11rem;
					padding: 0.075rem 0.5rem;
					background-color: ${theme.colors.white};
					color: ${theme.colors.accent_dark};
					border: 1px solid ${theme.colors.grey_5};
					border-radius: 4px;
					${theme.typography.subheading2}
					line-height: 1.3rem;
					cursor: ${isLoading ? 'wait' : 'pointer'};
					transition: background-color 0.2s;
					white-space: nowrap;

					&:hover {
						background-color: ${theme.colors.secondary_light}20;
					}

					&:disabled {
						opacity: 0.6;
						cursor: wait;
						color: ${theme.colors.grey_5};
					}
				`}
			>
				<span
					css={css`
						display: flex;
						align-items: center;
						gap: 0.3rem;
					`}
				>
					<span>Apply Gene List As Filter</span>
					<span
						css={css`
							display: inline-flex;
							align-items: center;
							justify-content: center;
							min-width: 16px;
							height: 16px;
							background-color: ${theme.colors.secondary_light}20;
							border-radius: 8px;
							padding: 0 3px;
							font-size: 0.65rem;
							font-weight: 600;
							color: ${theme.colors.accent_dark};
							line-height: 1;
						`}
					>
						{uniqueGeneCount}
					</span>
				</span>
				<ArrowIcon
					pointUp={isOpen}
					theme={{
						fill: '#5E6068',
						transition: 'all 0s',
					}}
					css={css`
						flex-shrink: 0;
					`}
				/>
			</button>

			{isOpen && !isLoading && (
				<div
					css={css`
						position: absolute;
						top: calc(100% + 2px);
						right: 0;
						width: ${buttonRef.current?.offsetWidth ? `${buttonRef.current.offsetWidth}px` : '11rem'};
						box-sizing: border-box;
						background-color: ${theme.colors.white};
						border: 1px solid ${theme.colors.grey_5};
						border-radius: 4px;
						box-shadow: ${theme.shadow.default};
						z-index: 1000;
						overflow: hidden;
					`}
				>
					<div
						css={css`
							padding: 6px 10px;
							background-color: ${theme.colors.grey_1};
							border-bottom: 1px solid ${theme.colors.grey_3};
							font-size: 0.7rem;
							font-weight: 600;
							color: ${theme.colors.grey_6};
							text-transform: uppercase;
						`}
					>
						Filter {uniqueGeneCount} gene{uniqueGeneCount !== 1 ? 's' : ''} on:
					</div>

					{dataTables.length === 0 ? (
						<div
							css={css`
								padding: 12px 10px;
								text-align: center;
								color: ${theme.colors.grey_5};
								font-size: 0.75rem;
							`}
						>
							No other tables available
						</div>
					) : (
						dataTables.map((table) => (
							<button
								key={table.id}
								onClick={() => {
									handleApplyToTable(table.id, table.title);
									setIsOpen(false);
								}}
								css={css`
									display: block;
									width: 100%;
									padding: 8px 10px;
									text-align: left;
									border: none;
									background: none;
									cursor: pointer;
									font-size: 0.75rem;
									color: ${theme.colors.accent_dark};
									transition: background-color 0.15s;

									&:hover {
										background-color: ${theme.colors.secondary_light}20;
									}

									&:not(:last-child) {
										border-bottom: 1px solid ${theme.colors.grey_3};
									}
								`}
							>
								{table.title}
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
};

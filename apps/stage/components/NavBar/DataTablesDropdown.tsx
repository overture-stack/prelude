// components/NavBar/DataTablesDropdown.tsx
import { css, useTheme } from '@emotion/react';
import cx from 'classnames';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../global/utils/constants';
import { DataTableInfo } from '../../global/utils/dataTablesDiscovery';
import { DATA_TABLE_GROUP_ORDER } from '../../global/utils/tableConfig';
import { InternalLink } from '../Link';
import Dropdown from './Dropdown';
import { StyledListLink } from './styles';

function sortGroups(groups: string[]): string[] {
	return [...groups].sort((a, b) => {
		const ai = DATA_TABLE_GROUP_ORDER.indexOf(a);
		const bi = DATA_TABLE_GROUP_ORDER.indexOf(b);
		if (ai === -1 && bi === -1) return a.localeCompare(b);
		if (ai === -1) return 1;
		if (bi === -1) return -1;
		return ai - bi;
	});
}

const DataTablesDropdown = () => {
	const router = useRouter();
	const theme = useTheme();
	const [dataTables, setDataTables] = useState<DataTableInfo[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Fetch data tables from API
		fetch('/api/data-tables')
			.then((response) => response.json())
			.then((data) => {
				setDataTables(data);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error fetching data tables:', error);
				setLoading(false);
			});
	}, []);

	if (loading) {
		return null; // Or a loading indicator
	}

	// If no data tables, return null
	if (dataTables.length === 0) {
		return null;
	}

	// If only one data table, render as a simple link button (no dropdown chevron)
	if (dataTables.length === 1) {
		const table = dataTables[0];
		return (
			<InternalLink path={table.path}>
				<a
					css={css`
						width: 100%;
						height: 100%;
						display: flex;
						align-items: center;
						justify-content: center;
						color: ${theme.colors.accent_dark};
						font-size: 14px;
						font-weight: bold;
						text-decoration: none;
						cursor: pointer;

						&.active {
							color: ${theme.colors.primary_dark};
							background-color: ${theme.colors.grey_1};
						}
					`}
					className={cx({ active: router.asPath.startsWith(table.path) })}
				>
					Data Explorer
				</a>
			</InternalLink>
		);
	}

	// Group by dataset (e.g. ARGO Clinical vs Drug Discovery), with a section header
	// per group. Tables without a configured group fall into a catch-all so a missing
	// tableConfig entry never hides a table.
	const grouped = new Map<string, DataTableInfo[]>();
	for (const table of dataTables) {
		const group = table.group || 'Other';
		if (!grouped.has(group)) grouped.set(group, []);
		grouped.get(group)!.push(table);
	}
	const groups = sortGroups(Array.from(grouped.keys()));

	const dropdownItems = groups.flatMap((group, index) => [
		<div
			key={`header-${group}`}
			data-no-hover
			css={css`
				padding: ${index === 0 ? '12px 16px 6px' : '10px 16px 6px'};
				font-size: 10px;
				font-weight: 700;
				text-transform: uppercase;
				letter-spacing: 0.12em;
				color: ${theme.colors.accent_dark};
				cursor: default;
			`}
			onClick={(e) => e.stopPropagation()}
		>
			{group}
		</div>,
		...grouped.get(group)!.map((table) => (
			<InternalLink key={table.id} path={table.path}>
				<StyledListLink className={cx({ active: router.asPath.startsWith(table.path) })}>{table.title}</StyledListLink>
			</InternalLink>
		)),
	]);

	// Convert table paths to INTERNAL_PATHS type using type assertion
	const tablePaths = dataTables.map((table) => table.path as unknown as INTERNAL_PATHS);

	return (
		<Dropdown
			css={css`
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				color: ${theme.colors.accent_dark};
				font-size: 14px;
				font-weight: bold;
			`}
			data={dropdownItems}
			label="Explore Data"
			urls={tablePaths}
		/>
	);
};

export default DataTablesDropdown;

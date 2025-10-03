// components/NavBar/DataTablesDropdown.tsx
import cx from 'classnames';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../global/utils/constants';
import { DataTableInfo } from '../../global/utils/dataTablesDiscovery';
import { InternalLink } from '../Link';
import Dropdown from './Dropdown';
import { linkStyles, StyledListLink } from './styles';

const DataTablesDropdown = () => {
	const router = useRouter();
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

	// If only one data table, render as a simple button instead of dropdown
	if (dataTables.length === 1) {
		const table = dataTables[0];
		return (
			<InternalLink path={table.path}>
				<a css={linkStyles} className={cx({ active: router.asPath.startsWith(table.path) })}>
					Data Explorer
				</a>
			</InternalLink>
		);
	}

	// Generate dropdown items for multiple tables
	const dropdownItems = dataTables.map((table) => (
		<InternalLink key={table.id} path={table.path}>
			<StyledListLink className={cx({ active: router.asPath.startsWith(table.path) })}>{table.title}</StyledListLink>
		</InternalLink>
	));

	// Fix: Convert table paths to INTERNAL_PATHS type using type assertion
	// This assumes that your table paths are compatible with your INTERNAL_PATHS enum
	const tablePaths = dataTables.map((table) => table.path as unknown as INTERNAL_PATHS);

	return <Dropdown css={linkStyles} data={dropdownItems} label="Explore Data" urls={tablePaths} />;
};

export default DataTablesDropdown;

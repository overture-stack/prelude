// pages/api/data-tables.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { discoverDataTables } from '../../global/utils/dataTablesDiscovery';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		// Simply read folder names and return them
		const dataTables = discoverDataTables();
		res.status(200).json(dataTables);
	} catch (error) {
		console.error('Error fetching data tables:', error);
		res.status(500).json({ error: 'Failed to fetch data tables' });
	}
}

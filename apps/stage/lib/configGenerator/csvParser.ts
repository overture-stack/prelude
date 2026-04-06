// Minimal CSV parser — handles quoted fields, returns headers + rows.

function parseLine(line: string, delimiter = ','): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === delimiter && !inQuotes) {
			fields.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}
	fields.push(current.trim());
	return fields;
}

export interface ParsedCsv {
	headers: string[];
	rows: string[][];
}

export function parseCsv(content: string, delimiter = ','): ParsedCsv {
	const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
	if (lines.length === 0) return { headers: [], rows: [] };

	const headers = parseLine(lines[0], delimiter);
	const rows = lines.slice(1).map((l) => parseLine(l, delimiter));
	return { headers, rows };
}

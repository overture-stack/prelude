import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const docsDirectory = path.join(process.cwd(), 'public', 'docs');
    const filenames = fs.readdirSync(docsDirectory)
      .filter(filename => filename.endsWith('.md'))
      .sort();
    
    res.status(200).json(filenames);
  } catch (error) {
    console.error('Error reading docs directory:', error);
    res.status(500).json({ error: 'Unable to read documentation files' });
  }
}
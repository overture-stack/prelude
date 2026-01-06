#!/usr/bin/env node

/**
 * Build script to generate documentation manifest
 * Runs before Next.js build to create static JSON file
 * This prevents client-side fetching of markdown files on every page load
 */

const fs = require('fs');
const path = require('path');

function generateId(fileName) {
  return fileName
    .replace(/^\d+-/, '') // Remove number prefix
    .replace(/\.md$/, '') // Remove .md extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
    .replace(/(^-|-$)/g, ''); // Remove leading/trailing dashes
}

function extractTitle(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractOrder(fileName) {
  const orderMatch = fileName.match(/^(\d+)-/);
  return orderMatch ? parseInt(orderMatch[1], 10) : 999;
}

const docsDirectory = path.join(process.cwd(), 'public/docs');
const outputPath = path.join(process.cwd(), 'public/docs-manifest.json');

console.log('🔍 Generating documentation manifest...');

if (!fs.existsSync(docsDirectory)) {
  console.warn('⚠️  No docs directory found, creating empty manifest');
  fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
  process.exit(0);
}

const fileNames = fs.readdirSync(docsDirectory);
const markdownFiles = fileNames.filter(name => name.endsWith('.md'));

if (markdownFiles.length === 0) {
  console.warn('⚠️  No markdown files found, creating empty manifest');
  fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
  process.exit(0);
}

const manifest = markdownFiles.map((fileName) => {
  const filePath = path.join(docsDirectory, fileName);
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const title = extractTitle(fileContent) || fileName.replace('.md', '');
  const id = generateId(fileName);
  const order = extractOrder(fileName);

  console.log(`  ✓ ${fileName} → ${id} (${title})`);

  return { id, title, order, filename: fileName };
});

manifest.sort((a, b) => a.order - b.order);

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`✅ Generated docs manifest with ${manifest.length} sections`);
console.log(`📄 Output: ${outputPath}`);

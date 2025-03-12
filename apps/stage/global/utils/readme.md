# Dynamic Data Tables Navigation

This document explains how the dynamic data tables navigation system works.

## Overview

The navigation system automatically discovers data tables based on folder names in the `components/pages/dataTables` directory and displays them in both:

1. The "Explore Data" dropdown in the navigation bar
2. The "Explore the Data" card on the homepage

## How It Works

1. The system scans the `components/pages/dataTables` directory for subfolders
2. Each subfolder is treated as a data table
3. The folder name is converted to a display name (e.g., "tabular" → "Tabular", "clinicalData" → "Clinical Data")
4. These names are used to populate the navigation

## Adding a New Data Table

To add a new data table to the navigation:

1. Create a new folder in the `components/pages/dataTables` directory

   - Use camelCase for folder names with multiple words (e.g., `clinicalData`)
   - Use lowercase for single-word names (e.g., `genomics`)

2. Implement your data table components in this folder

   - The existing code inside this folder is not affected by the navigation system
   - The system only reads the folder name

3. That's it! The folder name will be automatically discovered and added to the navigation

## Example Directory Structure

```
components/
└── pages/
    └── dataTables/
        ├── tabular/          # Shows as "Tabular" in navigation
        ├── clinicalData/     # Shows as "Clinical Data" in navigation
        └── molecularData/    # Shows as "Molecular Data" in navigation
```

## Technical Details

- The folder name discovery happens on the server side
- An API endpoint (`/api/data-tables`) returns the list of data tables
- The navigation components fetch this list on the client side

## Troubleshooting

If your data table doesn't appear in the navigation:

1. Make sure the folder exists in `components/pages/dataTables/`
2. Check that the server is running with the latest changes
3. Check browser console for any API errors when fetching the data tables list

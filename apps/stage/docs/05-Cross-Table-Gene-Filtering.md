# Cross-Table Gene Filtering

## Overview

The Cross-Table Gene Filtering feature allows users to select genes (Hugo symbols) from one data table and apply them as filters to another table. This enables researchers to explore gene relationships across different datasets (Expression, Mutation, Correlation, and Protein data).

---

## For Users

### What is Cross-Table Gene Filtering?

Cross-Table Gene Filtering enables you to:
- Select rows containing genes of interest in one table
- Apply those genes as filters to a different table
- Explore how the same genes behave across different data types

### Use Cases

**Example 1: Expression to Mutation Analysis**
1. Filter the Expression Table for genes with high average expression
2. Select the genes of interest (e.g., 25 genes)
3. Apply them to the Mutation Table to see mutation patterns for those genes

**Example 2: Correlation to Protein Analysis**
1. Find gene pairs with high correlation values
2. Select the correlated gene pairs
3. Apply to the Protein Table to examine protein interaction data

### How to Use

#### Step 1: Select Genes
1. Navigate to any data table (Expression, Mutation, Correlation, or Protein)
2. Apply filters to find genes of interest
3. Select rows using the checkboxes:
   - Click individual checkboxes for specific genes
   - Use "Select All" (top-left checkbox) to select all visible rows

#### Step 2: Apply to Another Table
1. Once rows are selected, the **"Apply to Table"** button appears in the toolbar
2. The button shows a badge with the number of unique genes selected
3. Click the button to open a dropdown menu
4. Select the target table from the list

#### Step 3: View Results
- You'll be automatically redirected to the target table
- The genes you selected are applied as filters
- The table shows only records matching your gene list

### Important Notes

#### Gene Limits
- **URL Length Restriction**: Browsers limit URL length to ~2000 characters
- If you select too many genes, you'll receive a warning
- **Recommended Maximum**: ~200-300 genes (depends on gene name length)
- If warned, reduce your selection or apply more filters before selecting

#### Table-Specific Behavior

**Single Hugo Symbol Tables** (Expression, Mutation):
- Filter applied to: `data.hugo_symbol`
- Shows records where the gene matches your list

**Dual Hugo Symbol Tables** (Correlation, Protein):
- Filter applied to: `data.hugo_symbol_a` OR `data.hugo_symbol_b`
- Shows records where EITHER gene matches your list
- When extracting FROM these tables, both columns are included and deduplicated

### Tips and Best Practices

1. **Start Small**: Test with a small selection (5-10 genes) first to understand the results

2. **Use Filters First**: Apply table filters before selecting to narrow down to relevant genes

3. **Bookmark Results**: The filtered URL can be bookmarked or shared with colleagues

4. **Clear Filters**: Use the filter controls to clear or modify the applied gene list

5. **Export Results**: After filtering, you can export the filtered data using the Download button

---

## For Administrators

### Configuration

No additional configuration is required for this feature. It automatically works with existing data tables.

### Table Requirements

For cross-table filtering to work, tables must:
1. Be registered in the system (appear in `/api/data-tables`)
2. Have Hugo symbol fields configured in `tableFieldMappings.ts`
3. Follow the naming convention (end with `Table`)

### Current Supported Tables

| Table | Hugo Symbol Fields | Strategy |
|-------|-------------------|----------|
| Expression Table | `data.hugo_symbol` | Single field |
| Mutation Table | `data.hugo_symbol` | Single field |
| Correlation Table | `data.hugo_symbol_a`, `data.hugo_symbol_b` | Dual field (OR) |
| Protein Table | `data.hugo_symbol_a`, `data.hugo_symbol_b` | Dual field (OR) |

### Adding New Tables

To add support for a new data table:

1. **Create the table page** following the existing pattern (e.g., `/pages/newTable/index.tsx`)

2. **Update table field mappings** in `global/config/tableFieldMappings.ts`:
   ```typescript
   newTable: {
     tableName: 'New Table',
     tablePath: '/newTable',
     hugoSymbolFields: ['data.hugo_symbol'], // or multiple fields
     filterStrategy: 'single', // or 'dual' for two fields
   }
   ```

3. **Add display name** to `.env`:
   ```env
   NEXT_PUBLIC_NEW_TABLE_NAME="New Table Display Name"
   ```

4. The table will automatically appear in cross-table filtering dropdowns

### Monitoring and Troubleshooting

#### Common Issues

**Button Not Appearing**
- Check that rows are selected
- Verify the current table is in `tableFieldMappings.ts`
- Check browser console for errors

**"No Hugo symbols found" Error**
- Verify data contains Hugo symbol fields
- Check field names match configuration
- Ensure data is properly loaded in table

**URL Too Long Warning**
- User selected too many genes
- Suggest reducing selection or applying filters first
- Technical limit: ~2000 characters

#### Logs

Check browser console for debugging:
- `No field mapping found for table: {tableName}` - Table not configured
- `Unable to build filter for target table` - SQON generation failed
- `Error building filter URL` - URL encoding issue

---

## For Developers

### Architecture Overview

The cross-table gene filtering system consists of five main components:

```
User Selection
    ↓
CrossTableFilterButton (UI Component)
    ↓
extractHugoSymbols() (Data Extraction)
    ↓
buildCrossTableSQON() (Filter Generation)
    ↓
Router Navigation (URL Parameterization)
    ↓
Target Table (Arranger Filter Application)
```

### Component Structure

#### 1. Table Field Mappings (`global/config/tableFieldMappings.ts`)

Centralized configuration defining Hugo symbol fields for each table.

```typescript
export interface TableFieldMapping {
  tableName: string;        // Display name
  tablePath: string;        // URL route
  hugoSymbolFields: string[]; // Field paths in data
  filterStrategy: 'single' | 'dual'; // Filter logic type
}

export const TABLE_FIELD_MAPPINGS: Record<string, TableFieldMapping> = {
  expressionTable: {
    tableName: 'Expression Table',
    tablePath: '/expressionTable',
    hugoSymbolFields: ['data.hugo_symbol'],
    filterStrategy: 'single',
  },
  // ... other tables
};
```

**Why this approach?**
- Single source of truth for field configurations
- Easy to extend for new tables
- Type-safe with TypeScript
- Separates configuration from business logic

#### 2. Hugo Symbol Extractor (`global/utils/hugoSymbolExtractor.ts`)

Extracts Hugo symbols from selected Arranger table rows.

**Key Function:**
```typescript
export function extractHugoSymbols(
  selectedRows: any[],
  sourceTableName: string
): string[]
```

**Features:**
- Handles nested object paths (`data.hugo_symbol_a`)
- Automatic deduplication using `Set`
- Supports single and dual field tables
- Returns sorted array for consistency

**Implementation Details:**
```typescript
const symbols = new Set<string>();

selectedRows.forEach((row) => {
  mapping.hugoSymbolFields.forEach((fieldPath) => {
    const value = getNestedValue(row, fieldPath);
    if (value && typeof value === 'string' && value.trim()) {
      symbols.add(value.trim());
    }
  });
});

return Array.from(symbols).sort();
```

**Helper Functions:**
- `countUniqueHugoSymbols()` - Get count without full extraction
- `hasHugoSymbols()` - Validation before processing
- `getNestedValue()` - Access nested object properties by path

#### 3. Cross-Table SQON Builder (`components/pages/dataExplorer/crossTableFilters.ts`)

Generates Arranger SQON (Structured Query Object Notation) filters.

**Key Function:**
```typescript
export function buildCrossTableSQON(
  hugoSymbols: string[],
  targetTableName: string
): SQONType | null
```

**SQON Strategies:**

**Single Field (Expression, Mutation):**
```typescript
// Input: ['TP53', 'BRCA1']
// Output:
{
  "op": "and",
  "content": [{
    "op": "in",
    "content": {
      "fieldName": "data.hugo_symbol",
      "value": ["TP53", "BRCA1"]
    }
  }]
}
```

**Dual Field (Correlation, Protein):**
```typescript
// Input: ['TP53', 'BRCA1']
// Output:
{
  "op": "and",
  "content": [{
    "op": "or",
    "content": [
      {
        "op": "in",
        "content": {
          "fieldName": "data.hugo_symbol_a",
          "value": ["TP53", "BRCA1"]
        }
      },
      {
        "op": "in",
        "content": {
          "fieldName": "data.hugo_symbol_b",
          "value": ["TP53", "BRCA1"]
        }
      }
    ]
  }]
}
```

**URL Length Management:**

```typescript
export const MAX_URL_LENGTH = 2000;

export function estimateUrlLength(sqon: SQONType, baseUrl: string): number {
  const encodedSqon = encodeURIComponent(JSON.stringify(sqon));
  return baseUrl.length + 9 + encodedSqon.length; // 9 = "?filters="
}

export function wouldExceedUrlLimit(
  hugoSymbols: string[],
  targetTableName: string
): boolean {
  const sqon = buildCrossTableSQON(hugoSymbols, targetTableName);
  const mapping = getTableFieldMapping(targetTableName);
  const estimatedLength = estimateUrlLength(sqon, mapping.tablePath);
  return estimatedLength > MAX_URL_LENGTH;
}
```

**Helper Functions:**
- `buildFilterUrl()` - Complete URL with encoded SQON
- `estimateMaxGenes()` - Calculate approximate gene limit

#### 4. CrossTableFilterButton Component (`components/pages/dataExplorer/CrossTableFilterButton.tsx`)

React component providing the UI for cross-table filtering.

**Props:**
```typescript
interface CrossTableFilterButtonProps {
  currentTableName: string; // e.g., 'expressionTable'
}
```

**Key Features:**

**Integration with Arranger:**
```typescript
import { useTableContext } from '@overture-stack/arranger-components';

const { selectedRows = [] } = useTableContext();
const selectionCount = selectedRows.length;
```

**Dropdown State Management:**
```typescript
const [dataTables, setDataTables] = useState<DataTableInfo[]>([]);
const [isOpen, setIsOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);

// Fetch available tables
useEffect(() => {
  fetch('/api/data-tables')
    .then((res) => res.json())
    .then((data) => {
      const otherTables = data.filter(t => t.id !== currentTableName);
      setDataTables(otherTables);
    });
}, [currentTableName]);
```

**Click Outside Handler:**
```typescript
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
```

**Navigation Handler:**
```typescript
const handleApplyToTable = (targetTableId: string) => {
  // 1. Extract genes
  const symbols = extractHugoSymbols(selectedRows, currentTableName);

  // 2. Validate
  if (symbols.length === 0) {
    alert('No Hugo symbols found...');
    return;
  }

  // 3. Check URL length
  if (wouldExceedUrlLimit(symbols, targetTableId)) {
    alert('Too many genes selected...');
    return;
  }

  // 4. Build URL
  const filterUrl = buildFilterUrl(symbols, targetTableId);

  // 5. Navigate
  router.push(filterUrl);
};
```

**UI Structure:**
```tsx
<div ref={dropdownRef}>
  <button onClick={() => setIsOpen(!isOpen)}>
    Apply to Table
    <span>{uniqueGeneCount}</span>
  </button>

  {isOpen && (
    <div> {/* Dropdown menu */}
      {dataTables.map((table) => (
        <button onClick={() => handleApplyToTable(table.id)}>
          {table.title}
        </button>
      ))}
    </div>
  )}
</div>
```

#### 5. Integration with RepoTable (`components/pages/dataExplorer/RepoTable/index.tsx`)

The button is integrated into the existing table toolbar.

**Implementation:**
```typescript
import { useRouter } from 'next/router';
import { CrossTableFilterButton } from '../CrossTableFilterButton';

const RepoTable = ({ callerName, apiHost, exportRowIdField, exportConfig }) => {
  const router = useRouter();

  // Extract current table name from route
  const currentTableName = router.pathname.replace('/', '') || 'unknown';

  return (
    <TableContextProvider>
      <div css={flexContainer}>
        <Toolbar />
        <CrossTableFilterButton currentTableName={currentTableName} />
      </div>
      <Table />
      <Pagination />
    </TableContextProvider>
  );
};
```

**Layout:**
```css
display: flex;
justify-content: space-between; /* Toolbar left, Button right */
align-items: center;
gap: 12px;
margin-bottom: 8px;
```

### Data Flow

#### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User selects rows in Expression Table                   │
│    - Arranger TableContextProvider tracks selection         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CrossTableFilterButton renders                           │
│    - useTableContext() → selectedRows                       │
│    - Show button with gene count badge                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User clicks button → Dropdown opens                      │
│    - Fetch /api/data-tables                                 │
│    - Display: Mutation, Correlation, Protein                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User selects "Mutation Table"                            │
│    - handleApplyToTable('mutationTable')                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Extract Hugo Symbols                                     │
│    extractHugoSymbols(selectedRows, 'expressionTable')      │
│    → ['TP53', 'BRCA1', 'EGFR', ...]                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Build SQON Filter                                        │
│    buildCrossTableSQON(symbols, 'mutationTable')            │
│    → { op: 'in', content: { fieldName: '...', value: [] }} │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Validate URL Length                                      │
│    wouldExceedUrlLimit(symbols, 'mutationTable')            │
│    → false (OK to proceed)                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Build Filter URL                                         │
│    buildFilterUrl(symbols, 'mutationTable')                 │
│    → '/mutationTable?filters=%7B...%7D'                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Navigate                                                 │
│    router.push(filterUrl)                                   │
│    - Next.js handles routing                                │
│    - URL changes in browser                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Mutation Table Loads                                    │
│     - PageContent reads ?filters= from URL                  │
│     - useUrlParamsState deserializes SQON                   │
│     - setSQON(parsedFilters)                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. Arranger Applies Filter                                 │
│     - ArrangerDataProvider receives SQON                    │
│     - GraphQL query sent with filter                        │
│     - Results displayed in table                            │
└─────────────────────────────────────────────────────────────┘
```

### Testing

#### Unit Tests (Recommended)

**Test Hugo Symbol Extractor:**
```typescript
describe('extractHugoSymbols', () => {
  it('should extract symbols from single field table', () => {
    const rows = [
      { data: { hugo_symbol: 'TP53' } },
      { data: { hugo_symbol: 'BRCA1' } },
    ];
    const result = extractHugoSymbols(rows, 'expressionTable');
    expect(result).toEqual(['BRCA1', 'TP53']); // Sorted
  });

  it('should deduplicate symbols from dual field table', () => {
    const rows = [
      { data: { hugo_symbol_a: 'TP53', hugo_symbol_b: 'BRCA1' } },
      { data: { hugo_symbol_a: 'TP53', hugo_symbol_b: 'EGFR' } },
    ];
    const result = extractHugoSymbols(rows, 'correlationTable');
    expect(result).toEqual(['BRCA1', 'EGFR', 'TP53']);
  });
});
```

**Test SQON Builder:**
```typescript
describe('buildCrossTableSQON', () => {
  it('should build single field SQON', () => {
    const sqon = buildCrossTableSQON(['TP53'], 'expressionTable');
    expect(sqon.content[0].content.fieldName).toBe('data.hugo_symbol');
    expect(sqon.content[0].content.value).toEqual(['TP53']);
  });

  it('should build dual field SQON with OR logic', () => {
    const sqon = buildCrossTableSQON(['TP53'], 'correlationTable');
    expect(sqon.content[0].op).toBe('or');
    expect(sqon.content[0].content).toHaveLength(2);
  });
});
```

#### Integration Tests

**Test End-to-End Flow:**
```typescript
describe('Cross-Table Filtering', () => {
  it('should filter genes across tables', async () => {
    // 1. Load expression table
    const { getByRole } = render(<ExpressionTablePage />);

    // 2. Select rows
    const checkbox1 = getByRole('checkbox', { name: /TP53/ });
    fireEvent.click(checkbox1);

    // 3. Click apply button
    const applyButton = getByRole('button', { name: /Apply to Table/ });
    fireEvent.click(applyButton);

    // 4. Select target
    const mutationOption = getByRole('button', { name: /Mutation Table/ });
    fireEvent.click(mutationOption);

    // 5. Verify navigation
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/mutationTable?filters=')
      );
    });
  });
});
```

### Performance Considerations

1. **URL Encoding Overhead**
   - JSON stringify: O(n) where n = number of genes
   - URI encoding: O(m) where m = string length
   - Total: Linear with gene count

2. **Component Re-renders**
   - Button only renders when selection changes
   - Dropdown fetches tables once on mount
   - No unnecessary re-renders with proper memoization

3. **Memory Usage**
   - Set for deduplication: O(n) space
   - SQON object: O(n) space
   - Minimal overhead for typical gene lists (< 1KB)

### Security Considerations

1. **Input Validation**
   - Hugo symbols validated for type (string)
   - Empty/null values filtered out
   - No user input directly in queries (uses Arranger's SQON)

2. **URL Safety**
   - All data URI-encoded before navigation
   - No XSS risk (no HTML injection)
   - SQON parsed server-side by Arranger

3. **Access Control**
   - Uses existing table permissions
   - No additional auth required
   - Filtered data respects table ACLs

### Extending the Feature

#### Adding New Field Types

To support non-Hugo symbol fields:

1. **Update TableFieldMapping interface:**
```typescript
export interface TableFieldMapping {
  // ... existing fields
  fieldType: 'hugo_symbol' | 'gene_id' | 'custom';
}
```

2. **Create field-specific extractors:**
```typescript
export function extractGeneIds(rows: any[], tableName: string): string[] {
  // Similar to extractHugoSymbols but for gene IDs
}
```

3. **Update SQON builder to handle field types**

#### Supporting Additional Table Types

To add support for triple-field tables:

1. **Add 'triple' strategy:**
```typescript
filterStrategy: 'single' | 'dual' | 'triple';
```

2. **Update SQON builder:**
```typescript
if (mapping.filterStrategy === 'triple') {
  const builders = mapping.hugoSymbolFields.map(field =>
    SQON.in(field, hugoSymbols)
  );
  return SQON.or(builders).toValue();
}
```

### Debugging

#### Enable Debug Logging

Add to components:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Selected rows:', selectedRows);
  console.log('Extracted symbols:', symbols);
  console.log('Generated SQON:', sqon);
  console.log('Filter URL:', filterUrl);
}
```

#### Common Issues

**Issue: Button not appearing**
- Check `useTableContext()` returns selectedRows
- Verify component is inside `TableContextProvider`
- Check table name mapping exists

**Issue: No genes extracted**
- Verify field paths in tableFieldMappings
- Check data structure in selected rows
- Ensure fields contain string values

**Issue: SQON not applying**
- Check URL parameter deserialization
- Verify Arranger receives SQON in correct format
- Check browser network tab for GraphQL query

### Best Practices

1. **Always validate inputs**
   - Check for empty arrays
   - Validate table names
   - Handle null/undefined gracefully

2. **Provide user feedback**
   - Loading states during navigation
   - Clear error messages
   - Count badges for transparency

3. **Handle edge cases**
   - No tables available
   - All tables filtered out
   - URL length exceeded
   - Network failures

4. **Maintain consistency**
   - Use TypeScript for type safety
   - Follow existing patterns
   - Add comprehensive comments
   - Update documentation

### API Reference

See inline JSDoc comments in source files for detailed API documentation:
- `tableFieldMappings.ts` - Configuration types and mappings
- `hugoSymbolExtractor.ts` - Extraction functions
- `crossTableFilters.ts` - SQON building utilities
- `CrossTableFilterButton.tsx` - Component props and hooks

---

## Changelog

### Version 1.0.0 (Initial Release)
- Cross-table gene filtering for Expression, Mutation, Correlation, and Protein tables
- Single and dual Hugo symbol field support
- URL length validation
- Automatic deduplication
- Dropdown UI with gene count badge

---

## Support

For issues or questions:
- Check browser console for error messages
- Verify table configuration in `tableFieldMappings.ts`
- Review this documentation
- Contact development team with reproduction steps

# Arranger Charts and Components Implementation Guide

This guide explains how to implement and customize Arranger charts and components in the custom-ui application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Setting Up Arranger](#setting-up-arranger)
5. [Implementing Charts](#implementing-charts)
6. [Implementing Facets (Aggregations)](#implementing-facets-aggregations)
7. [Theming and Customization](#theming-and-customization)
8. [Field Naming Conventions](#field-naming-conventions)
9. [SQON Filter Management](#sqon-filter-management)
10. [Common Patterns](#common-patterns)

---

## Overview

Arranger is a data exploration framework that provides:
- **Charts**: Visual data representations (BarChart, PieChart, etc.)
- **Components**: UI components for filtering and querying (Aggregations, SQONViewer, etc.)
- **Data Management**: GraphQL-based data fetching with Elasticsearch backend

The custom-ui uses:
- `@overture-stack/arranger-components` - Core UI components
- `@overture-stack/arranger-charts` - Chart components
- Custom theming via Emotion CSS-in-JS

---

## Prerequisites

### Backend Requirements

1. **Elasticsearch Index**: Your data must be indexed in Elasticsearch
   - Index name: `datatable4_centric` (configurable in `App.tsx`)
   - Document type: `file` (configurable in `App.tsx`)

2. **Arranger Configuration Files**: Located in `configs/arrangerConfigs/datatable4/`
   - `base.json` - Base configuration
   - `extended.json` - Extended fields
   - `facets.json` - Facet/aggregation definitions
   - `table.json` - Table column definitions

3. **Arranger API Server**: Running on `http://localhost:5053` (configurable)

### Required Fields in Elasticsearch

Fields must be mapped in Elasticsearch with appropriate types:
- **Text fields**: For searchable text
- **Keyword fields**: For exact matches and aggregations
- **Nested fields**: For complex nested data structures

Example mapping structure:
```json
{
  "mappings": {
    "properties": {
      "data": {
        "properties": {
          "ancestry": { "type": "keyword" },
          "gender": { "type": "keyword" },
          "birthSex": { "type": "keyword" }
        }
      }
    }
  }
}
```

---

## Architecture Overview

```
App.tsx
  └── ArrangerDataProvider (provides data context)
      └── PageContent.tsx
          ├── Facets.tsx (sidebar filters)
          ├── QueryBar.tsx (active filters display)
          ├── Stats.tsx (statistics)
          └── ChartsLayout.tsx
              └── [Individual Chart Components]
```

### Key Concepts

1. **ArrangerDataProvider**: Wraps the app and provides:
   - `sqon` - Current filter state (SQON format)
   - `setSQON` - Function to update filters
   - GraphQL query capabilities

2. **useArrangerData Hook**: Access to current filter state
   ```typescript
   const { sqon, setSQON } = useArrangerData({ callerName: 'MyComponent' });
   ```

3. **useArrangerTheme Hook**: Apply component-level theming
   ```typescript
   useArrangerTheme(getComponentStyles(theme));
   ```

---

## Setting Up Arranger

### 1. App-Level Setup (`App.tsx`)

```typescript
import { ArrangerDataProvider } from '@overture-stack/arranger-components';
import createArrangerFetcher from './utils/arrangerFetcher';

// Configure API endpoint
const arrangerFetcher = createArrangerFetcher({
  ARRANGER_API: 'http://localhost:5053',
});

// Configure document type and index
const documentType = 'file';
const index = 'datatable4_centric';

// Wrap your app content
<ArrangerDataProvider
  apiUrl="http://localhost:5053"
  customFetcher={arrangerFetcher}
  documentType={documentType}
  theme={{
    colors: { common: { black: '#000000' } },
    components: { Loader: { size: '20px' } },
  }}
>
  <PageContent />
</ArrangerDataProvider>
```

### 2. Configuration Validation

The app validates that Arranger configs exist before rendering:

```typescript
const configsQuery = `
  query ($documentType: String!, $index: String!) {
    hasValidConfig (documentType: $documentType, index: $index)
  }
`;
```

If validation fails, an error message is displayed.

---

## Implementing Charts

### Basic Chart Component Structure

```typescript
import { BarChart, ChartsProvider, ChartsThemeProvider } from '@overture-stack/arranger-charts';
import { useArrangerData } from '@overture-stack/arranger-components';
import { chartFilter } from '../utils/sqonHelpers';
import { shuffleArray } from '../utils/chartUtils';

const MyChart = (): ReactElement => {
  const theme = useTheme() as CustomUIThemeInterface;
  const { sqon, setSQON } = useArrangerData({ callerName: 'MyChart' });
  
  // Create filter handler
  const chartFilters = useMemo(() => ({
    myField: chartFilter('data__myField', sqon, setSQON),
  }), [sqon, setSQON]);

  // Shuffle colors for variety
  const shuffledPalette = useMemo(() => shuffleArray(theme.colors.chartPalette), []);

  return (
    <div css={css`/* container styles */`}>
      <h3>Chart Title</h3>
      <div style={{ height: '180px' }}>
        <ChartsProvider debugMode={false} loadingDelay={0}>
          <ChartsThemeProvider
            colors={shuffledPalette}
            components={{
              TooltipComp: CustomBarTooltip, // Optional custom tooltip
            }}
          >
            <BarChart
              fieldName="data__myField"
              maxBars={5}
              handlers={{
                onClick: (config) => {
                  return chartFilters.myField(config.data.key);
                },
              }}
              theme={{
                axisLeft: { legend: 'Category' },
                axisBottom: { legend: 'Count' },
              }}
            />
          </ChartsThemeProvider>
        </ChartsProvider>
      </div>
    </div>
  );
};
```

### Chart Properties

#### BarChart
- `fieldName`: Field name in aggregation format (e.g., `"data__ancestry"`)
- `maxBars`: Maximum number of bars to display
- `handlers.onClick`: Function called when a bar is clicked
- `theme`: Chart axis and styling configuration

#### Available Chart Types
- `BarChart` - Horizontal bar chart
- `PieChart` - Pie chart (from arranger-charts)
- `SunburstChart` - Hierarchical sunburst chart

### Custom Tooltips

Create a custom tooltip component:

```typescript
const CustomBarTooltip = (props: any) => {
  const { indexValue, value, label, formattedValue } = props;
  const displayLabel = label || indexValue || '';
  
  return (
    <div css={css`
      background: white;
      border: 1px solid #ccc;
      padding: 8px;
      border-radius: 4px;
    `}>
      <div>{displayLabel}</div>
      <div>{formattedValue || value}</div>
    </div>
  );
};
```

### Fetching Additional Data

For charts that need additional data (e.g., total counts):

```typescript
const [totalCount, setTotalCount] = useState<number>(0);

useEffect(() => {
  arrangerFetcher({
    endpoint: 'graphql',
    body: JSON.stringify({
      variables: sqon ? { sqon } : {},
      query: `
        query ($sqon: JSON) {
          file {
            aggregations(filters: $sqon) {
              data__myField {
                buckets {
                  key
                }
              }
            }
          }
        }
      `,
    }),
  })
    .then((response: any) => {
      const data = response?.data?.file || response?.file;
      const buckets = data.aggregations?.data__myField?.buckets || [];
      setTotalCount(buckets.length);
    });
}, [sqon]);
```

---

## Implementing Facets (Aggregations)

### Basic Facets Component

```typescript
import { Aggregations, useArrangerTheme } from '@overture-stack/arranger-components';
import { UseThemeContextProps } from '@overture-stack/arranger-components/dist/types';

const getAggregationsStyles = (theme: CustomUIThemeInterface): UseThemeContextProps => {
  return {
    callerName: 'MyFacets',
    components: {
      Aggregations: {
        AggsGroup: {
          collapsedBackground: theme.colors.white,
          headerSticky: true,
          css: css`
            /* Custom CSS for aggregation groups */
            border-bottom: 0.1rem solid #E5E7EB;
          `,
        },
        // ... more component styles
      },
    },
  };
};

const Facets = (): ReactElement => {
  const theme = useTheme() as CustomUIThemeInterface;
  useArrangerTheme(getAggregationsStyles(theme));
  
  return (
    <article>
      <h2>Filters</h2>
      <Aggregations />
    </article>
  );
};
```

### Customizing Facet Styles

The `getAggregationsStyles` function returns a theme object that customizes:

- **AggsGroup**: Container for each filter group
- **BucketCount**: Count badges next to filter options
- **FilterInput**: Search input within facets
- **MoreOrLessButton**: "Show more/less" button
- **RangeAgg**: Range slider aggregations

Example customization:

```typescript
Aggregations: {
  AggsGroup: {
    css: css`
      .bucket-item {
        position: relative;
        margin: 2px 0;
        padding: 2px 8px;
      }
      
      input[type='checkbox'] {
        appearance: none;
        width: 1rem;
        height: 1rem;
        border: 1px solid #BABCC2;
        border-radius: 3px;
      }
      
      input[type='checkbox']:checked {
        background-color: #64BC46;
        border: 1px solid #64BC46;
      }
    `,
  },
}
```

### Adding Custom Buttons to Facets

To add custom buttons (like "Select All") to facets, use DOM manipulation with MutationObserver:

```typescript
useEffect(() => {
  const addSelectAllButtons = () => {
    const aggregationGroups = document.querySelectorAll('[class*="AggsGroup"]');
    
    aggregationGroups.forEach(group => {
      // Find bucket items
      const bucketItems = group.querySelectorAll('.bucket-item');
      if (bucketItems.length === 0) return;
      
      // Find container
      const container = bucketItems[0].parentElement;
      if (!container) return;
      
      // Create buttons container
      let buttonsContainer = container.querySelector('.custom-buttons-container');
      if (!buttonsContainer) {
        buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'custom-buttons-container';
        container.appendChild(buttonsContainer);
      }
      
      // Add Select All button
      if (!buttonsContainer.querySelector('.custom-select-all-btn')) {
        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'custom-select-all-btn';
        selectAllBtn.innerText = 'Select All';
        selectAllBtn.onclick = (e) => {
          e.preventDefault();
          // Handle select all logic
        };
        buttonsContainer.appendChild(selectAllBtn);
      }
    });
  };
  
  // Run on mount and observe changes
  const observer = new MutationObserver(() => {
    addSelectAllButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  return () => observer.disconnect();
}, []);
```

---

## Theming and Customization

### Theme Structure

The theme is defined in `src/theme/`:

```typescript
// theme/colors.ts
export default {
  white: '#fff',
  black: '#282A35',
  primary: '#286C77',
  primary_dark: '#286C77',
  chartPalette: [
    '#DA96EB', '#DB6363', '#FCD364', // ... more colors
  ],
  grey_1: '#F2F5F8',
  // ... more colors
};

// theme/index.ts
import colors from './colors';

const defaultTheme = {
  colors,
  shadow: {
    default: 'box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);',
  },
};

export type CustomUIThemeInterface = typeof defaultTheme;
```

### Using Theme in Components

```typescript
import { useTheme } from '@emotion/react';
import { CustomUIThemeInterface } from '../theme';

const MyComponent = () => {
  const theme = useTheme() as CustomUIThemeInterface;
  
  return (
    <div css={css`
      background-color: ${theme.colors.white};
      color: ${theme.colors.black};
      border: 1px solid ${theme.colors.primary};
    `}>
      Content
    </div>
  );
};
```

### Component-Level Theming

Use `useArrangerTheme` to customize Arranger components:

```typescript
const getComponentStyles = (theme: CustomUIThemeInterface): UseThemeContextProps => ({
  callerName: 'MyComponent',
  components: {
    ComponentName: {
      property: 'value',
      css: css`
        /* Custom CSS */
      `,
    },
  },
});

const MyComponent = () => {
  const theme = useTheme() as CustomUIThemeInterface;
  useArrangerTheme(getComponentStyles(theme));
  // ... component code
};
```

---

## Field Naming Conventions

### Important: Double Underscore vs Dot Notation

Arranger uses two different field name formats:

1. **Aggregation Format** (double underscore `__`):
   - Used in: GraphQL queries, chart `fieldName`, aggregation field names
   - Example: `data__ancestry`, `data__gender`

2. **Filter Format** (dot notation `.`):
   - Used in: SQON filters, filter field names
   - Example: `data.ancestry`, `data.gender`

### Conversion Utility

Use the helper function to convert between formats:

```typescript
// From utils/sqonHelpers.ts
const convertFieldNameForFilter = (fieldName: string): string => {
  return fieldName.replace(/__/g, '.');
};

// Usage
const aggregationField = 'data__ancestry';
const filterField = convertFieldNameForFilter(aggregationField); // 'data.ancestry'
```

### When to Use Which Format

- **Aggregation queries**: Use `__` format
  ```graphql
  query {
    file {
      aggregations {
        data__ancestry {
          buckets { key }
        }
      }
    }
  }
  ```

- **SQON filters**: Use `.` format
  ```typescript
  {
    op: 'in',
    content: {
      fieldName: 'data.ancestry', // dot notation
      value: ['European']
    }
  }
  ```

---

## SQON Filter Management

### SQON Structure

SQON (Structured Query Object Notation) represents filters:

```typescript
{
  op: 'and',
  content: [
    {
      op: 'in',
      content: {
        fieldName: 'data.ancestry',
        value: ['European', 'East Asian']
      }
    },
    {
      op: 'in',
      content: {
        fieldName: 'data.gender',
        value: ['Female']
      }
    }
  ]
}
```

### Using SQON Helpers

The `sqonHelpers.ts` file provides utilities:

#### `chartFilter(fieldName, sqon, setSQON)`

Creates a filter handler for chart clicks:

```typescript
const chartFilters = useMemo(() => ({
  ancestry: chartFilter('data__ancestry', sqon, setSQON),
}), [sqon, setSQON]);

// In chart
<BarChart
  handlers={{
    onClick: (config) => {
      return chartFilters.ancestry(config.data.key);
    },
  }}
/>
```

#### `toggleSQONFilter(currentSQON, fieldName, value)`

Toggles a filter (adds if missing, removes if present):

```typescript
const newSQON = toggleSQONFilter(sqon, 'data__ancestry', 'European');
setSQON(newSQON);
```

#### `mergeSQON(currentSQON, newFilter)`

Merges a new filter into existing SQON:

```typescript
const newFilter = {
  op: 'in',
  content: {
    fieldName: 'data.ancestry',
    value: ['European']
  }
};
const merged = mergeSQON(sqon, newFilter);
setSQON(merged);
```

### Accessing Current Filters

```typescript
const { sqon, setSQON } = useArrangerData({ callerName: 'MyComponent' });

// sqon can be null (no filters) or a SQON object
if (sqon && sqon.op === 'and' && Array.isArray(sqon.content)) {
  sqon.content.forEach(filter => {
    // Process each filter
  });
}
```

---

## Common Patterns

### Pattern 1: Chart with Total Count

```typescript
const [totalCount, setTotalCount] = useState(0);

useEffect(() => {
  arrangerFetcher({
    endpoint: 'graphql',
    body: JSON.stringify({
      variables: sqon ? { sqon } : {},
      query: `query ($sqon: JSON) {
        file {
          aggregations(filters: $sqon) {
            data__field {
              buckets { key }
            }
          }
        }
      }`,
    }),
  }).then((response: any) => {
    const buckets = response?.data?.file?.aggregations?.data__field?.buckets || [];
    setTotalCount(buckets.length);
  });
}, [sqon]);

return (
  <div>
    {totalCount > 0 && <div>Total: {totalCount}</div>}
    <BarChart fieldName="data__field" maxBars={5} />
  </div>
);
```

### Pattern 2: Custom Facet Styling

```typescript
const getAggregationsStyles = (theme: CustomUIThemeInterface) => ({
  callerName: 'Facets',
  components: {
    Aggregations: {
      AggsGroup: {
        css: css`
          .bucket-item:has(input[type='checkbox']:checked) {
            background-color: #EFF8EC;
          }
        `,
      },
    },
  },
});
```

### Pattern 3: Query Bar Customization

```typescript
const getThemeCustomisations = (theme: CustomUIThemeInterface) => ({
  callerName: 'QueryBar',
  components: {
    SQONViewer: {
      SQONValue: {
        background: '#36581C',
        fontColor: theme.colors.white,
      },
    },
  },
});
```

### Pattern 4: Multiple Charts in Grid

```typescript
<div css={css`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }
`}>
  <GenderChart />
  <AncestryChart />
  <BirthSexChart />
  <FamilyHistoryChart />
</div>
```

---

## Troubleshooting

### Charts Not Displaying

1. **Check field name format**: Use `data__fieldName` (double underscore)
2. **Verify Elasticsearch mapping**: Field must be mapped as `keyword` type
3. **Check Arranger configs**: Field must be in `facets.json`
4. **Verify API connection**: Check browser console for GraphQL errors

### Filters Not Working

1. **Check field name conversion**: Aggregation uses `__`, filters use `.`
2. **Verify SQON structure**: Must have `op: 'and'` with `content` array
3. **Check ArrangerDataProvider**: Must wrap components using filters

### Styling Not Applying

1. **Check theme object structure**: Must match `UseThemeContextProps` type
2. **Verify CSS specificity**: Use `!important` if needed
3. **Check Emotion CSS**: Ensure `css` prop is used correctly

### Performance Issues

1. **Debounce MutationObserver**: Use debouncing for DOM manipulation
2. **Memoize expensive computations**: Use `useMemo` for chart filters
3. **Limit chart data**: Use `maxBars` to limit displayed items

---

## Additional Resources

- **Arranger Components Docs**: Check `@overture-stack/arranger-components` package
- **Arranger Charts Docs**: Check `@overture-stack/arranger-charts` package
- **GraphQL Schema**: Available at `http://localhost:5053/graphql` (if enabled)
- **Elasticsearch Mapping**: Check `configs/elasticsearchConfigs/`

---

## Quick Reference

### Required Imports

```typescript
// Charts
import { BarChart, ChartsProvider, ChartsThemeProvider } from '@overture-stack/arranger-charts';

// Components
import { Aggregations, useArrangerData, useArrangerTheme, SQONViewer } from '@overture-stack/arranger-components';

// Utilities
import createArrangerFetcher from '../utils/arrangerFetcher';
import { chartFilter } from '../utils/sqonHelpers';
```

### Field Name Examples

| Aggregation Format | Filter Format | Usage |
|-------------------|---------------|-------|
| `data__ancestry` | `data.ancestry` | GraphQL queries → SQON filters |
| `data__gender` | `data.gender` | Chart fieldName → Filter fieldName |
| `data__birthSex` | `data.birthSex` | Aggregations → Filters |

### Common GraphQL Query Pattern

```graphql
query ($sqon: JSON) {
  file {
    aggregations(filters: $sqon) {
      data__fieldName {
        buckets {
          key
          doc_count
        }
      }
    }
  }
}
```

---

*Last updated: [Current Date]*


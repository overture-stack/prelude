# QuickSearch Configuration

This guide provides a concise overview of all configuration requirements for QuickSearch functionality.

## Overview

QuickSearch enables fast, type-ahead search for specific fields in your data tables. It uses Elasticsearch's edge n-gram tokenizer for efficient prefix matching.

## Required Configuration

### 1. Elasticsearch Mapping

**File**: `apps/setup/configs/elasticsearchConfigs/{index}-mapping.json`

**Purpose**: Defines how Elasticsearch stores and indexes your data. This configuration enables fast prefix-based searching.

Add three components to your Elasticsearch mapping:

#### a) Autocomplete Field

**What it does**: Creates a special field that aggregates values from multiple source fields and analyzes them for autocomplete.

**Why it's needed**: The autocomplete field uses edge n-gram tokenization to enable fast "starts with" searches. Without this, searching would require slow wildcard queries.

```json
{
  "mappings": {
    "properties": {
      "hugo_symbol_autocomplete": {
        "type": "keyword", // Base type stores the original value
        "fields": {
          // Multi-field mapping enables different search strategies
          "analyzed": {
            "type": "text", // Analyzed as text for fuzzy matching
            "analyzer": "autocomplete_analyzed", // Tokenizes with standard tokenizer + edge n-grams
            "search_analyzer": "lowercase_keyword" // Searches with lowercase only (no n-grams on search)
          },
          "lowercase": {
            "type": "text", // Enables case-insensitive exact matching
            "analyzer": "lowercase_keyword"
          },
          "prefix": {
            "type": "text", // Optimized for prefix matching
            "analyzer": "autocomplete_prefix", // Tokenizes entire value + edge n-grams
            "search_analyzer": "lowercase_keyword" // Searches with lowercase only
          }
        }
      }
    }
  }
}
```

**Field Breakdown**:

- **Base field** (`type: keyword`): Stores original value unchanged, used for aggregations
- **`.analyzed` subfield**: Breaks text into words, then creates edge n-grams for each word (good for multi-word matching)
- **`.lowercase` subfield**: Converts to lowercase for case-insensitive exact matches
- **`.prefix` subfield**: Treats entire value as single token, creates edge n-grams (best for gene symbols like "TP53")

#### b) Copy-To Directives on Data Fields

**What it does**: Automatically copies values from source fields into the autocomplete field during indexing.

**Why it's needed**: Allows searching across multiple fields (hugo_symbol_a AND hugo_symbol_b) using a single autocomplete field. Without this, you'd need separate autocomplete fields for each source field.

**How it works**: When a document is indexed with `hugo_symbol_a: "TP53"`, Elasticsearch automatically copies "TP53" to the `hugo_symbol_autocomplete` field before applying analyzers.

```json
{
  "mappings": {
    "properties": {
      "data": {
        "type": "object",
        "properties": {
          "hugo_symbol": {
            // For mutation/expression tables
            "type": "keyword", // Store as-is (no analysis)
            "copy_to": ["hugo_symbol_autocomplete"] // Copy value to autocomplete field
          },
          "hugo_symbol_a": {
            // For correlation/protein tables
            "type": "keyword",
            "copy_to": ["hugo_symbol_autocomplete"] // Both A and B copy to same field
          },
          "hugo_symbol_b": {
            "type": "keyword",
            "copy_to": ["hugo_symbol_autocomplete"] // Enables searching both fields at once
          }
        }
      }
    }
  }
}
```

**Example**:

- Document indexed: `{data: {hugo_symbol_a: "TP53", hugo_symbol_b: "BRCA1"}}`
- Elasticsearch copies values: `hugo_symbol_autocomplete` gets both "TP53" and "BRCA1"
- User searches: "BR" matches this document via the autocomplete field
- Result displays: Both "TP53" and "BRCA1" as separate results

#### c) Custom Analyzers

**What they do**: Define how Elasticsearch breaks down text for indexing and searching.

**Why they're needed**: Standard Elasticsearch analyzers don't support efficient prefix matching. Custom analyzers create the tokens needed for autocomplete functionality.

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        // Analyzer for multi-word autocomplete (breaks into words first)
        "autocomplete_analyzed": {
          "tokenizer": "standard", // Splits on whitespace/punctuation
          "filter": ["lowercase", "edge_ngram"] // Then lowercase + create prefixes
        },
        // Analyzer for single-word autocomplete (treats entire value as one token)
        "autocomplete_prefix": {
          "tokenizer": "keyword", // Keeps entire value as single token
          "filter": ["lowercase", "edge_ngram"] // Then lowercase + create prefixes
        },
        // Analyzer for case-insensitive exact matching
        "lowercase_keyword": {
          "tokenizer": "keyword", // Keeps entire value as single token
          "filter": ["lowercase"] // Only lowercase (no prefixes)
        }
      },
      "filter": {
        // Defines how to create prefix tokens
        "edge_ngram": {
          "type": "edge_ngram", // Create prefixes from the start of tokens
          "min_gram": "1", // Minimum prefix length (1 character)
          "max_gram": "20", // Maximum prefix length (20 characters)
          "side": "front" // Only create prefixes from the front (not back)
        }
      }
    }
  }
}
```

**Edge N-gram Example**:

- Input: `"TP53"`
- Edge n-grams created: `["t", "tp", "tp5", "tp53"]`
- When user types "t": Matches "t" token → shows "TP53"
- When user types "tp5": Matches "tp5" token → shows "TP53"
- When user types "53": No match (edge n-grams only from start)

**Analyzer Comparison**:
| Analyzer | Input: "TP53 BRCA1" | Tokens Created |
|----------|---------------------|----------------|
| `autocomplete_analyzed` | "TP53 BRCA1" | `["t", "tp", "tp5", "tp53", "b", "br", "brc", "brca", "brca1"]` |
| `autocomplete_prefix` | "TP53 BRCA1" | `["t", "tp", "tp5", "tp53", "tp53 ", "tp53 b", ..., "tp53 brca1"]` |
| `lowercase_keyword` | "TP53 BRCA1" | `["tp53 brca1"]` (exact match only) |

**Required for all 4 indexes**: correlation, mutation, expression, protein

### 2. Arranger Extended Configuration

**File**: `apps/setup/configs/arrangerConfigs/{index}/extended.json` (and `configs/arrangerConfigs/{index}/extended.json`)

**Purpose**: Tells Arranger about the fields in your Elasticsearch index and how they should be treated. Arranger uses this metadata to generate GraphQL schemas and determine field capabilities.

**Why two locations**:

- `apps/setup/configs/` - Used during initial setup/seeding
- `configs/` - Used by the portal runtime
- Both must be identical to ensure consistency

Add two entries:

#### a) Autocomplete Field (informational only)

**What it does**: Registers the autocomplete field so Arranger knows it exists.

**Why it's needed**: Even though the field is primarily used internally, Arranger needs to know about all fields in the Elasticsearch mapping.

```json
{
  "fieldName": "hugo_symbol_autocomplete", // Must match Elasticsearch field name
  "displayName": "Hugo Symbol Autocomplete" // Human-readable name (not displayed to users)
}
```

**Note**: This entry does NOT have `primaryKey` or `quickSearchEnabled` flags because the autocomplete field is only for searching, not displaying results.

#### b) Data Fields with QuickSearch Flags

**What they do**: Tell Arranger which fields contain the actual data to display in QuickSearch results.

**Why they're needed**: QuickSearch searches the autocomplete field but displays values from these source fields. The flags tell Arranger to include these fields in QuickSearch functionality.

**Single field example** (mutation/expression tables):

```json
{
  "displayName": "Hugo Symbol", // Label shown in UI/exports
  "fieldName": "data.hugo_symbol", // Elasticsearch field path (dot notation)
  "primaryKey": true, // Include in QuickSearch results display
  "quickSearchEnabled": true // Enable for QuickSearch searching
}
```

**Multiple fields example** (correlation/protein tables):

```json
{
  "displayName": "Hugo Symbol A",
  "fieldName": "data.hugo_symbol_a",
  "primaryKey": true,                        // Both fields marked as primary keys
  "quickSearchEnabled": true                 // Both searchable via QuickSearch
},
{
  "displayName": "Hugo Symbol B",
  "fieldName": "data.hugo_symbol_b",
  "primaryKey": true,                        // Allows displaying both A and B in results
  "quickSearchEnabled": true
}
```

**Attribute Explanations**:

- `primaryKey: true` - **Critical**: Marks this field's value should be displayed in QuickSearch results. Without this, QuickSearch falls back to using `EXPORT_ROW_ID_FIELD` (wrong field).
- `quickSearchEnabled: true` - Tells Arranger this field participates in QuickSearch. Arranger uses this to validate configuration and generate proper GraphQL queries.
- `fieldName` - Use **dot notation** (`data.hugo_symbol`) to match Elasticsearch field paths. Arranger internally converts dots to double underscores for GraphQL.

**Required for all 8 files** (2 locations × 4 indexes)

### 3. Arranger Facets Configuration

**File**: `apps/setup/configs/arrangerConfigs/{index}/facets.json` (and `configs/arrangerConfigs/{index}/facets.json`)

**Purpose**: Defines which fields appear as filters in the sidebar and which are available for aggregations (grouping/counting).

**Why this is critical for QuickSearch**: Arranger's QuickSearch component uses aggregations to get the list of available values for autocomplete suggestions. Without this aggregation, QuickSearch can search but won't have any suggestions to display.

Add autocomplete field to aggregations (must be first in the array):

```json
{
  "facets": {
    "aggregations": [
      {
        "active": true, // Enable this aggregation
        "fieldName": "hugo_symbol_autocomplete", // Field to aggregate on
        "show": false, // Don't show in filter sidebar
        "type": "Aggregations" // Type of facet (Aggregations vs other types)
      }
      // ... other facets follow ...
    ]
  }
}
```

**Attribute Explanations**:

- `active: true` - Enables the aggregation. Arranger will compute unique values and counts for this field.
- `fieldName: "hugo_symbol_autocomplete"` - Must use double underscores in facets.json (different from extended.json which uses dots).
- `show: false` - **Important**: Prevents this field from appearing as a filter in the sidebar. Users should only interact with it via QuickSearch, not as a regular filter.
- `type: "Aggregations"` - Tells Arranger to treat this as a terms aggregation (collect unique values).

**How it works with QuickSearch**:

1. User types "TP" in QuickSearch
2. QuickSearch queries Elasticsearch for documents matching "_tp_" in the autocomplete field
3. QuickSearch uses the aggregation to get unique values (e.g., ["TP53", "TPM1", "TPRG1"])
4. These values appear in the dropdown as suggestions
5. Without this aggregation, QuickSearch shows "No results" even though documents match

**Required for all 8 files** (2 locations × 4 indexes)

### 4. Page Configuration

**File**: `apps/stage/pages/dataTable{N}/index.tsx`

**Purpose**: Configures the QuickSearch component for each data table page. This is where you specify which fields to search and what to display to users.

#### a) Enable QuickSearch

**What it does**: Toggles QuickSearch on/off using an environment variable.

**Why it's needed**: Allows enabling/disabling QuickSearch per table without code changes. Also enables gradual rollout (enable for one table first, then others).

```javascript
enableQuickSearch: NEXT_PUBLIC_ENABLE_DATATABLE_N_QUICKSEARCH,
```

If this is `false` or `undefined`, the QuickSearch component won't render at all.

#### b) Configure QuickSearch Fields

**What it does**: Tells QuickSearch which fields to search and how to label them in the UI.

**Why it's needed**: QuickSearch needs to know the exact field names to query in Elasticsearch. These must match the fields marked with `quickSearchEnabled: true` in extended.json.

**Single field configuration** (mutation, expression):

```javascript
quickSearchConfig: {
  fieldNames: ['data.hugo_symbol'],           // Array with one field
  headerTitle: 'Hugo Symbol',                 // Title shown above QuickSearch box
  placeholder: 'e.g. TP53, BRCA1',           // Hint text inside search box
},
```

**Multiple fields configuration** (correlation, protein):

```javascript
quickSearchConfig: {
  fieldNames: ['data.hugo_symbol_a', 'data.hugo_symbol_b'],  // Array with both fields
  headerTitle: 'Hugo Symbol',                                 // Same title for both
  placeholder: 'e.g. TP53, BRCA1',                           // Same placeholder
},
```

**Attribute Explanations**:

- `fieldNames` - **Critical**: Must be an **array of strings** with **dot notation** (`['data.hugo_symbol']`) and exactly match field names in extended.json. Arranger searches ALL listed fields when user types.
- `headerTitle` - Displayed above the QuickSearch input box. Should describe what the user is searching for.
- `placeholder` - Gray text shown inside empty search box. Use examples to guide users on what to search for.

**Common Mistakes**:

- ❌ Using a string instead of array: `fieldNames: 'data.hugo_symbol'` - Must be `['data.hugo_symbol']`
- ❌ Using underscores: `fieldNames: ['data__hugo_symbol']` - This won't work! Use dots.
- ❌ Not matching extended.json: If extended.json has `data.hugo_symbol_a` but page config has `data.hugo_symbol`, QuickSearch will be disabled.

**Required for all 4 page files**

### 5. Environment Variables

**File**: `docker-compose.yml`

**Purpose**: Feature flags to enable/disable QuickSearch per data table at deployment time.

**Why they're needed**: Allows enabling QuickSearch without code changes. You can enable QuickSearch for production tables while keeping it disabled for others. Also useful for A/B testing or gradual rollouts.

```yaml
# Enable QuickSearch for each data table
NEXT_PUBLIC_ENABLE_DATATABLE_1_QUICKSEARCH: "true" # Correlation table
NEXT_PUBLIC_ENABLE_DATATABLE_2_QUICKSEARCH: "true" # Mutation table
NEXT_PUBLIC_ENABLE_DATATABLE_3_QUICKSEARCH: "true" # Expression table
NEXT_PUBLIC_ENABLE_DATATABLE_4_QUICKSEARCH: "true" # Protein table
```

**How it works**:

- Set to `"true"` (string): QuickSearch enabled
- Set to `"false"` or omitted: QuickSearch disabled
- Must be strings in YAML (not boolean `true`/`false`)
- Read by Next.js at build time via `getConfig()` in page components

**Deployment note**: After changing these values, restart the `stage` service:

```bash
docker compose restart stage
```

### 6. Theme Configuration (Optional)

**File**: `apps/stage/components/pages/dataExplorer/theme/facetsTheme.ts`

**Purpose**: Defines visual styling for the QuickSearch component (colors, fonts, spacing, etc.).

**Why it's optional**: The theme configuration is already implemented in the codebase. You only need to modify this if you want to change how QuickSearch looks.

**How it works**: The theme factory function receives `quickSearchConfig` from the page component and passes it through to Arranger:

```javascript
QuickSearch: {
  fieldNames: quickSearchConfig.fieldNames,    // Which fields to search
  headerTitle: quickSearchConfig.headerTitle,  // Title above search box
  placeholder: quickSearchConfig.placeholder,  // Placeholder text

  // Visual styling (already configured)
  DropDownItems: { /* dropdown styling */ },
  QuickSearchWrapper: { /* container styling */ },
  PinnedValues: { /* selected values styling */ },
  TreeJointIcon: { /* icon styling */ },
}
```

**Key points**:

- Configuration (fieldNames, etc.) comes from page component
- Styling (colors, spacing, etc.) defined in theme
- Theme automatically applied when `useArrangerTheme()` is called
- No changes needed unless you want different colors/fonts

## Deployment Steps

### After Configuration Changes

1. **Rebuild Elasticsearch Indexes** (required after mapping changes):

   ```bash
   make reset
   make platform
   ```

2. **Restart Arranger Services** (required after extended.json or facets.json changes):

   ```bash
   docker compose restart arranger-datatable1 arranger-datatable2 arranger-datatable3 arranger-datatable4
   ```

3. **Restart Frontend** (required after page configuration changes):

   ```bash
   docker compose restart stage
   ```

4. **Hard Refresh Browser**:
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

### Upload Data

After reset, re-upload your data:

```bash
conductor upload correlation data/correlation_sample.tsv
conductor upload mutation data/mutation_sample.tsv
conductor upload expression data/expression_sample.tsv
conductor upload protein data/protein_sample.tsv
```

## How It Works

### Data Flow

1. **Indexing**: When data is uploaded, `data.hugo_symbol` values are indexed normally
2. **Copy-To**: Values are automatically copied to `hugo_symbol_autocomplete` field
3. **Analysis**: The autocomplete field is analyzed with edge n-grams:
   - Input: `"TP53"`
   - Tokens: `["t", "tp", "tp5", "tp53"]`
4. **Search**: User types "TP" in QuickSearch
5. **Matching**: Elasticsearch matches the "tp" token using prefix analyzer
6. **Results**: QuickSearch displays values from `data.hugo_symbol` (marked as `primaryKey: true`)

### Field Naming Convention

- **Configuration files** (extended.json): Use dot notation (`data.hugo_symbol`)
- **GraphQL queries**: Arranger converts to underscores (`data__hugo_symbol`)
- **Page configuration**: Use dot notation (Arranger handles conversion)

## Verification

### Check Elasticsearch Mapping

```bash
curl -u elastic:myelasticpassword http://localhost:9200/protein-index/_mapping?pretty | grep -A 10 hugo_symbol_autocomplete
```

### Check Arranger Configuration

```bash
curl -s "http://localhost:5053/graphql" -H "Content-Type: application/json" -d '{"query": "{ file { configs { extended } } }"}' | grep -A 3 "hugo_symbol"
```

### Test Aggregation

```bash
curl -s "http://localhost:5053/graphql" -H "Content-Type: application/json" -d '{"query": "{ file { aggregations { hugo_symbol_autocomplete { buckets { key } } } } }"}' | python3 -m json.tool
```

## Troubleshooting

### QuickSearch is Disabled

**Possible Causes**:

1. Field not in extended.json with `quickSearchEnabled: true`
2. Field not marked with `primaryKey: true`
3. Field name mismatch (dots vs underscores)
4. Arranger service needs restart
5. Browser cache needs clearing

**Solution**: Verify all configuration files, restart services, hard refresh browser

### QuickSearch Shows "No Results"

**Possible Causes**:

1. Autocomplete field not in facets.json
2. Elasticsearch mapping missing copy_to directive
3. Data not re-indexed after mapping changes
4. Wrong field names in page configuration

**Solution**: Verify facets.json, run `make reset && make platform`, re-upload data

### Wrong Field in Queries (submission_metadata.submission_id)

**Cause**: QuickSearch falling back to `EXPORT_ROW_ID_FIELD` environment variable

**Solution**: Ensure field names in page configuration exactly match extended.json (use dot notation)

## Configuration Checklist

- [ ] Elasticsearch mapping updated for all 4 indexes
- [ ] Autocomplete field with multi-field mapping
- [ ] Copy-to directives on data fields
- [ ] Custom analyzers and edge n-gram filter
- [ ] Extended.json updated for all 8 files
- [ ] Autocomplete field entry added
- [ ] Data fields have `primaryKey: true` and `quickSearchEnabled: true`
- [ ] Facets.json updated for all 8 files
- [ ] Autocomplete field in aggregations with `show: false`
- [ ] Page configuration updated for all 4 tables
- [ ] Environment variables enabled for all tables
- [ ] Services restarted (arranger + stage)
- [ ] Data re-uploaded
- [ ] Browser hard refreshed

## Related Documentation

- [QUICKSEARCH_ELASTICSEARCH_SETUP.md](QUICKSEARCH_ELASTICSEARCH_SETUP.md) - Detailed Elasticsearch configuration
- [QUICKSEARCH_DEVELOPER_GUIDE.md](QUICKSEARCH_DEVELOPER_GUIDE.md) - Full implementation guide
- [QUICKSEARCH_ADMIN_GUIDE.md](QUICKSEARCH_ADMIN_GUIDE.md) - Portal administrator guide

---

**Last Updated**: November 24, 2024

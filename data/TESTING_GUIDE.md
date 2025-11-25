# Cross-Table Gene Filtering - Testing Guide

## Overview

Your example CSV files have been updated with **overlapping genes** across all four tables to make testing the cross-table gene filtering feature easy and realistic.

---

## Updated Test Data

### Gene Overlap Summary

The following genes appear in **all four tables**:

| Gene | Type | Present In |
|------|------|------------|
| **TP53** | Tumor Suppressor | Expression, Mutation, Correlation, Protein |
| **KRAS** | Oncogene | Expression, Mutation, Correlation, Protein |
| **BRAF** | Oncogene | Expression, Mutation, Correlation, Protein |
| **EGFR** | Oncogene | Expression, Mutation, Correlation, Protein |
| **PIK3CA** | Oncogene | Expression, Mutation, Correlation, Protein |
| **PTEN** | Tumor Suppressor | Expression, Mutation, Correlation, Protein |
| **BRCA1** | Tumor Suppressor | Expression, Mutation, Correlation, Protein |
| **AKT1** | Oncogene | Expression, Mutation, Correlation, Protein |
| **NRAS** | Oncogene | Expression, Mutation, Correlation, Protein |
| **RB1** | Tumor Suppressor | Expression, Mutation, Correlation, Protein |

### Additional Genes (subset of tables)

| Gene | Present In |
|------|------------|
| ERBB2 | Expression, Mutation, Correlation, Protein |
| MET | Expression, Mutation, Correlation, Protein |
| RAF1 | Expression, Mutation, Correlation, Protein |
| MAP2K1 | Expression, Mutation, Correlation, Protein |
| MAP2K2 | Expression, Mutation, Correlation, Protein |
| VHL | Expression, Mutation, Correlation, Protein |
| CDKN2A | Expression, Mutation, Correlation, Protein |
| SOS1 | Expression, Mutation, Correlation, Protein |
| MEN1 | Expression, Mutation, Correlation, Protein |
| MTOR | Expression, Mutation, Correlation, Protein |

### Genes in Dual-Field Tables Only

These genes appear only in Correlation and/or Protein tables (in hugo_symbol_b column):

| Gene | Present In |
|------|------------|
| MDM2 | Correlation (b), Protein (b) |
| BRCA2 | Correlation (b), Protein (b) |
| HIF1A | Correlation (b), Protein (b) |

---

## Test Scenarios

### Scenario 1: Expression → Mutation (Single → Single)

**Goal**: Test filtering from single-field table to another single-field table.

**Steps**:
1. Navigate to **Expression Table**: `http://localhost:3000/expressionTable`
2. Select rows for genes: **TP53, KRAS, BRAF** (click checkboxes)
3. Click **"Apply to Table [3]"** button
4. Select **"Mutation Table"** from dropdown
5. Verify: Redirected to Mutation Table with only those 3 genes showing

**Expected URL**:
```
/mutationTable?filters=%7B%22content%22%3A...
```

**Expected Results**:
- Mutation table shows exactly 3 rows
- Genes: TP53 (53.98% mutation), KRAS (46.40%), BRAF (14.39%)

---

### Scenario 2: Mutation → Correlation (Single → Dual)

**Goal**: Test filtering from single-field to dual-field table.

**Steps**:
1. Navigate to **Mutation Table**: `http://localhost:3000/mutationTable`
2. Filter for high mutation frequency (e.g., > 10%)
3. Select **TP53, KRAS, PIK3CA, BRAF** (top 4 mutations)
4. Click **"Apply to Table [4]"**
5. Select **"Correlation Table"**
6. Verify: Shows correlations where genes appear in EITHER hugo_symbol_a OR hugo_symbol_b

**Expected Results**:
- Multiple correlation pairs shown
- Examples:
  - TP53 ↔ MDM2
  - KRAS ↔ BRAF (negative correlation)
  - PIK3CA ↔ PTEN (negative correlation)
  - TP53 ↔ BRCA1

---

### Scenario 3: Correlation → Expression (Dual → Single)

**Goal**: Test extracting genes from dual-field table and applying to single-field.

**Steps**:
1. Navigate to **Correlation Table**: `http://localhost:3000/correlationTable`
2. Filter for high correlation (e.g., spearmancorr > 0.7)
3. Select rows (e.g., TP53-MDM2, MAP2K1-MAP2K2, KRAS-RAF1)
4. Click **"Apply to Table"** (should show 5-6 unique genes extracted)
5. Select **"Expression Table"**
6. Verify: Shows expression for all genes from BOTH columns

**Expected Results**:
- Unique genes extracted: TP53, MDM2, MAP2K1, MAP2K2, KRAS, RAF1
- Expression table shows 6 rows
- Note: MDM2 only appears in Correlation table, NOT in Expression data

---

### Scenario 4: Protein → Mutation (Dual → Single)

**Goal**: Test protein interactions mapped to mutation data.

**Steps**:
1. Navigate to **Protein Table**: `http://localhost:3000/proteinTable`
2. Filter for high combined_score (e.g., > 900)
3. Select rows (e.g., EGFR-ERBB2, AKT1-MTOR, MAP2K1-MAP2K2)
4. Click **"Apply to Table [6]"**
5. Select **"Mutation Table"**

**Expected Results**:
- Unique genes: EGFR, ERBB2, AKT1, MTOR, MAP2K1, MAP2K2
- Mutation table shows mutation frequencies for these genes

---

### Scenario 5: Select All Test

**Goal**: Test "Select All" functionality.

**Steps**:
1. Navigate to **Expression Table**
2. Apply a filter (e.g., average_expression > 9.0)
3. Click **"Select All"** checkbox (top-left of table)
4. Verify count badge shows correct number
5. Click **"Apply to Table"**
6. Select **"Mutation Table"**

**Expected Results**:
- All visible filtered rows selected
- Count badge accurate
- All genes transferred to Mutation table

---

### Scenario 6: URL Length Limit Test

**Goal**: Test URL length protection.

**Steps**:
1. Navigate to **Expression Table**
2. Click **"Select All"** (selects all 20 rows)
3. Click **"Apply to Table [20]"**
4. Select any target table
5. Should succeed (20 genes is within limit)

**To Test Warning** (requires more data):
- Would need 200+ genes to trigger warning
- With current data, you won't see the URL length warning

---

### Scenario 7: Deduplication Test (Dual-Field Tables)

**Goal**: Verify genes appearing in both columns are deduplicated.

**Steps**:
1. Navigate to **Correlation Table**
2. Find rows where same gene appears in both columns
   - Example: Row with KRAS in both positions
3. Select multiple rows with overlapping genes
4. Click **"Apply to Table"**
5. Check count badge - should show unique count

**Expected Results**:
- If you select 5 rows with 10 total gene appearances
- But only 7 unique genes
- Badge should show **[7]** not **[10]**

---

### Scenario 8: Bidirectional Testing

**Goal**: Test round-trip filtering.

**Steps**:
1. Start at **Expression Table**
2. Select **TP53, BRCA1, EGFR**
3. Apply to **Correlation Table**
4. Review correlation pairs
5. Select 2-3 correlation pairs
6. Apply back to **Expression Table**
7. Verify: Get back to similar or expanded gene set

**Expected Results**:
- Gene list grows or stays same
- No genes lost
- Can trace relationships across tables

---

## Data Characteristics

### Expression Table (20 genes)
- Range: 5.2 (CDKN2A) to 15.2 (EGFR)
- High expressors: EGFR, TP53, KRAS, MET, BRAF
- Low expressors: CDKN2A, VHL, MEN1

### Mutation Table (20 genes)
- High mutation frequency: TP53 (53.98%), KRAS (46.40%), PIK3CA (24.24%)
- Hotspot genes: TP53, KRAS, PIK3CA, BRAF, NRAS, AKT1
- Low mutation: MEN1 (0.76%), SOS1 (0.95%)

### Correlation Table (20 gene pairs)
- Strong positive: MAP2K1-MAP2K2 (0.856), TP53-MDM2 (0.821), RAF1-MAP2K1 (0.823)
- Strong negative: KRAS-BRAF (-0.756), PIK3CA-PTEN (-0.687), PTEN-AKT1 (-0.598)
- Total unique genes: 25 (includes MDM2, BRCA2, HIF1A only in _b column)

### Protein Table (20 interactions)
- High scores: MAP2K1-MAP2K2 (989), EGFR-ERBB2 (978), BRCA1-BRCA2 (967)
- Represents STRING database protein-protein interactions
- Biologically relevant pairs (e.g., TP53-MDM2, KRAS-BRAF)

---

## Expected Behaviors

### ✅ What Should Work

1. **Button Visibility**
   - Button appears only when rows selected
   - Badge shows unique gene count
   - Button disappears when selection cleared

2. **Dropdown Population**
   - Shows all tables except current one
   - 3 tables listed when on any given table
   - Table names from display configuration

3. **Gene Extraction**
   - Single-field tables: Extract from one column
   - Dual-field tables: Extract from both columns
   - Automatic deduplication
   - Sorted alphabetically

4. **SQON Generation**
   - Single → Single: Simple IN clause
   - Single → Dual: OR across both fields
   - Dual → Single: Deduplicated IN clause
   - Dual → Dual: OR across all four fields

5. **Navigation**
   - Smooth transition to target table
   - URL contains encoded filter
   - Target table loads with filter applied
   - Can bookmark/share URL

### ❌ What Should Show Errors

1. **No Hugo Symbols**
   - If data doesn't contain hugo_symbol fields
   - Alert: "No Hugo symbols found in selected rows"

2. **Too Many Genes** (with more data)
   - If > ~200 genes selected
   - Alert with gene count and recommendation

3. **Network Failure**
   - If `/api/data-tables` fails
   - Dropdown shows "No other tables available"

---

## Validation Checklist

Use this checklist to verify the feature works correctly:

- [ ] Button appears when rows selected
- [ ] Count badge shows correct unique gene count
- [ ] Dropdown lists all other tables
- [ ] Clicking outside dropdown closes it
- [ ] Navigation works to each target table
- [ ] Filters applied correctly on target table
- [ ] Single-field to single-field works
- [ ] Single-field to dual-field works (OR logic)
- [ ] Dual-field to single-field works (deduplication)
- [ ] Dual-field to dual-field works
- [ ] Select All functionality works
- [ ] Gene list deduplication works correctly
- [ ] URL can be bookmarked and shared
- [ ] Clear filters button removes applied filter

---

## Troubleshooting

### Button Not Appearing
- **Check**: Are rows selected? (Blue checkmarks visible?)
- **Check**: Browser console for errors
- **Check**: Current table name in tableFieldMappings.ts

### Wrong Number in Badge
- **Check**: Count should be unique genes, not row count
- **Check**: For dual-field tables, should deduplicate

### Filter Not Applied on Target
- **Check**: URL contains `?filters=` parameter
- **Check**: Browser console for SQON parsing errors
- **Check**: Arranger connection working

### Genes Missing from Results
- **Check**: Field names match data structure
- **Check**: Data actually contains those genes in target table
- **Check**: For dual-field tables, check both columns

---

## Next Steps

After testing with this data:

1. **Add More Genes**: Expand CSV files to test URL limits
2. **Test Edge Cases**: Empty selections, network failures
3. **Performance Test**: Large gene lists (100+ genes)
4. **User Acceptance**: Have researchers test real workflows
5. **Production Data**: Replace example data with real datasets

---

## Quick Test Commands

After loading data into Elasticsearch:

```bash
# Check Correlation index
curl -X GET "localhost:9200/correlation_centric/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": { "match_all": {} },
  "size": 1
}'

# Check for TP53 in Expression
curl -X GET "localhost:9200/expression_centric/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": { "match": { "hugo_symbol": "TP53" } }
}'
```

---

## Support

If you encounter issues:
1. Check browser console (F12)
2. Verify data loaded correctly in Elasticsearch
3. Check Arranger configuration
4. Review [documentation](../apps/stage/docs/05-Cross-Table-Gene-Filtering.md)

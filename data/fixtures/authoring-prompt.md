# Fixture authoring prompt

> Paste the **ICGC ARGO data model** (the field inventory with types and, where known, allowed values) where marked. Everything else the author needs is below.

---

## Task

You are authoring evaluation fixtures for a system that turns a researcher's plain-language data-discovery question into a **query** against an Overture Arranger catalogue. A query has three parts: a **SQON filter**, a **GraphQL field selection**, and (only when the question implies it) a **GraphQL aggregation**. Each fixture pairs a natural-language prompt with the *reference* query it should produce. The reference query is the ground truth the model is scored against; nothing is executed at scoring time, so the reference must be correct and unambiguous.

Author realistic researcher phrasing, not synthetic templated prompts. Vary surface form (questions, commands, fragments) the way real users do.

## Inputs

1. **Data model (field inventory):** the ICGC ARGO model provided below — the *only* legal fields. Every field you reference must appear in it. Use each field's type to choose legal operators (table under Rules).

   ```
   <<< PASTE ICGC ARGO DATA MODEL HERE: field paths, types, and allowed values >>>
   ```

2. **Schema contract:** `fixture.schema.json` (this folder) defines one fixture object and is the contract your output must validate against. `fixtures.csv` shows the column order and one illustrative row.

## What to produce (this batch — single-catalogue scope)

Cross-catalogue fixtures are **deferred** until the ARGO mock catalogues land. Produce only the single-shallow and single-deep cells of the two-axis grid, plus the negative bucket:

| filter_complexity \ schema_reach | single-shallow | single-deep |
| -------------------------------- | -------------- | ----------- |
| single-predicate                 | 8              | 4           |
| boolean                          | 8              | 5           |
| negation                         | 6              | 5           |

That is **36 feasible fixtures**, plus **8 negative/infeasible fixtures** (`feasible: false`) = **44 total**.

- **filter_complexity** — `single-predicate` (one field/op), `boolean` (AND/OR over ≥2 predicates), `negation` (NOT / not-in / some-not-in).
- **schema_reach** — `single-shallow` (top-level field), `single-deep` (nested field path within one catalogue, e.g. through a nested donor→specimen→sample chain).
- **requires_aggregation** is an orthogonal tag, not a row: make ~9 of the 36 feasible fixtures imply an aggregation, spread across all three filter-complexity levels (not bunched in one).
- **Negatives** reference a field, value, or relationship **not** in the data model. The correct behaviour is to decline/flag, not to emit a plausible query over a hallucinated field. Set `feasible: false`, leave the reference query null, and set `negative_reason` to `nonexistent-field`, `nonexistent-value`, or `nonexistent-relationship`. (Out-of-scope and prompt-injection prompts belong to the separate, optional adversarial corpus — not this batch.)

## Output format

Emit one JSON object per fixture conforming to `fixture.schema.json` (JSON Lines — one object per line). These map 1:1 to `fixtures.csv` rows via the documented serialization (nested values → compact JSON string in the cell; booleans → `yes`/`no`; nulls → empty cell), so emitting valid JSON is the reliable path; conversion to CSV is mechanical.

Set provenance/validation fields as: `source: "synthetic-fixture"`, `corpus: "main"`, `reference_validated: "pending"`, `frontier_pass: "pending"`, `frontier_model: null`, `validation_date: null`. Pin `introspection_commit` / `index_commit` / `fixture_set_version` to the values given when you run this; leave `expected_record_ids` as `[]` (the validation pass fills it).

## Rules

- **SQON shape** (Overture op/content):
  - Group node: `{"op": "and|or|not", "content": [ <child nodes> ]}`
  - Leaf node: `{"op": "in|not-in|some-not-in|gt|gte|lt|lte|between", "content": {"fieldName": "<path>", "value": <scalar|array>}}`
- **Legal operators by field type:**
  | Type | Operators |
  | --- | --- |
  | keyword / id (string) | `in`, `not-in`, `some-not-in` |
  | numeric (byte, integer, long, float) | `gt`, `gte`, `lt`, `lte`, `between`; `in` for enumerable values |
  | date | `gt`, `gte`, `lt`, `lte`, `between` (ISO-8601 values) |
  | boolean | `in` with `[true]` or `[false]` |
  | nested/object container | not filtered directly — filter on its scalar leaf subfields |
- **Two path conventions, by design:** SQON `fieldName` uses Arranger's `__` flattening (`donors__specimens__samples__sample_type`); `reference_fields` (the GraphQL selection) uses dotted nesting (`donors.specimens.samples.sample_type`). Use the right one in the right place.
- **`reference_ast`** is `reference_sqon` in canonical normal form: flatten nested same-operator groups, sort operands in commutative `and`/`or` groups by (fieldName, op, value), dedup identical operands, canonicalize negation, and sort/dedup value arrays in set operators. For a single-predicate filter, AST == SQON.
- **`reference_fields`** is the field set the answer should return — minimal but sufficient for the question; compared as a set, so order doesn't matter (but keep it deduped).
- **`reference_aggregation`** is `{"field": "<__-path>", "aggType": "terms|stats|numeric_range|missing|cardinality", "args": {}}` when the question implies a breakdown/count-by/distribution; otherwise `null`.
- **`id` convention:** `{filter_complexity}-{schema_reach-short}-{NNN}`, e.g. `boolean-deep-003`, `negation-shallow-002`, `single-pred-shallow-001`. Unique and stable.
- **Provenance honesty:** never invent `expected_record_ids` or mark anything `validated`/`frontier_pass: yes` — those are set by the offline validation passes, not by authoring.

## Quality bar

Each prompt must have exactly one defensible reference query given the data model. If a prompt is ambiguous (could map to two different filters or field sets), tighten the wording or drop it. Prefer questions a cancer-data researcher would actually ask over contrived ones that merely exercise an operator.

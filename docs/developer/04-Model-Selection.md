# Model Selection

The goal of model selection is to pick the local model that will be used in the pilot, and to produce a full ranked comparison of all 7 candidates for the sign-off baseline. This is a benchmark run against fixtures with deterministic scoring, the model is the only independent variable. It is deliberately separated from application-level evaluation so a system-level regression cannot be misattributed to a model.

We adapt the framework of [Wada et al. (2026)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12894992/), progressive screening with capacity-matched prompting, but scale it down to fit Aim 1 capacity: **7 candidates** rather than 14, **~15 fixtures × 1 trial** per model rather than per-trial replication, and **deterministic scoring** rather than LLM-as-judge with κ calibration.

## Candidate Shortlist

The shortlist is fixed at seven candidates: six local open-weight models spanning architecture, size, and tool-use specialization, plus one commercial frontier baseline that defines the performance ceiling.

| ID   | Model             | Tier          | Architecture | Params (Q4 VRAM)           | Role                                          | Key Advantage for SQON                                                                               |
| ---- | ----------------- | ------------- | ------------ | -------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| LLM1 | Phi-4-Reasoning   | Workstation   | Dense        | 15B (~10 GB)               | Small/efficient option for 16 GB laptops      | High-density reasoning capability within the tightest VRAM constraints.                              |
| LLM2 | Mistral Small 3.2 | Workstation   | Dense        | 24B (~15 GB)               | Tool-use specialist, relevant to MCP workload | Native tool-use optimization reduces "hallucinated field" errors in SQON outputs.                    |
| LLM3 | Qwen 3.5-27B      | Workstation   | Dense        | 27B (~17 GB)               | Primary pilot favourite                       | Superior performance on multi-step complex logic and nested AND/OR structures.                       |
| LLM4 | Gemma 4 31B       | Workstation   | Dense        | 31B (~20 GB)               | Alternative dense for 24 GB+ workstation      | High baseline stability; requires the fewest Self-Refine iterations to reach accuracy gates.         |
| LLM5 | Gemma 4 26B-A4B   | Workstation   | MoE          | 26B / 3.8B active (~16 GB) | MoE at workstation tier                       | Provides 30B-class reasoning at significantly lower inference latency via active parameter sparsity. |
| LLM6 | Llama 4 Scout     | Institutional | MoE          | 109B / 17B active (~12 GB) | 70B-class data point on institutional server  | Handles massive catalogue schema contexts via dynamic expert loading and 16-expert MoE.              |
| LLM7 | Claude Opus 4.7   | Commercial    | Frontier     | N/A (managed API)          | Performance ceiling baseline                  | 100% zero-shot accuracy; serves as the gold-standard for execution equivalence fixtures.             |

Selection rationale:

- **Workstation tier (5 candidates)** spans a 15B–31B size range and includes both dense and MoE architectures from four publishers (Microsoft, Mistral AI, Alibaba, Google). This lets us say something defensible about whether MoE efficiency matters at consumer hardware and whether tool-use-specialised models (Mistral) outperform general-reasoning models (Qwen, Gemma) on a tool-calling workload.
- **Institutional tier (1 candidate)** is a single data point representing 70B-class deployment ran on an HPC; broader institutional comparison is Aim 2 work.
- **Commercial baseline** is Claude Opus 4.7, used to define the performance ceiling and the ≥95% execution-equivalence gate for pilot eligibility.

## Hardware Envelope

| Tier          | Hardware               | Memory           | Candidates Evaluated                                                                        |
| ------------- | ---------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| Workstation   | Apple M3/M4 Pro or Max | 16–24 GB Unified | Phi-4-Reasoning, Mistral Small 3.2, Qwen 3.5-27B, Gemma 4 31B, Gemma 4 26B-A4B (all Q4_K_M) |
| Institutional | HPC (Gather specs)     | (Gather Specs)   | Llama 4 Scout                                                                               |
| Managed       | Commercial API         | N/A              | Claude Opus 4.7 (default sampling)                                                          |

## Screening Phases

Screening runs in four phases. The main way models get cut is by making the tests harder. Because the starting list is already small, a model that fails a phase is excluded from the pilot but still appears in the final ranked comparison.

| Phase                         | Methodology                                                                                                                                                            | Optimization Goal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Baseline Screening         | Zero-shot prompts built from the frozen Arranger introspection snapshot (injected as prompt context; no live API calls). Run against ~15 fixtures × 1 trial per model. | Establish raw deterministic-score baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2. Capacity-Matched Prompting | Chain-of-Thought + Few-Shot examples for models scoring above Q1; simplified format-focused prompts for models below Q1.                                               | Determine which models have reasoning depth for multi-step SQON logic; whether simpler prompts close the format-compliance gap for weaker models.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 3. Hardware-Task Mapping      | Run each candidate on its target tier. Measure execution-equivalence against the Commercial baseline and latency per query.                                            | Produce the Phase 3 execution-equivalence number per candidate; any failure feeds Phase 4 for single-pass Self-Refine. Flag any model with median latency >10 s (soft ceiling — does not exclude from pilot; threshold is provisional pending pilot task-completion data). The ≥95% gate is applied to the _final_ equivalence number after Phase 4 (see below).                                                                                                                                                                                                                                                        |
| 4. Finalist Validation        | Single-pass Self-Refine on Phase 3 failures: model is shown the reference SQON plus a one-sentence error explanation, then re-prompted.                                | Before Self-Refine is applied, classify each failure by type: **structural** (invalid SQON), **semantic-field** (valid field, wrong one for the query), **semantic-value** (correct field, wrong threshold or value), or **semantic-scope** (correct field and value, wrong operator combination). Self-Refine is then applied to observe whether failures are recoverable — structural failures typically recover more readily than semantic ones. The post-Phase 4 equivalence is the number compared against the ≥95% gate; the recovery profile (which failure types recover after one pass) is reported alongside. |

The **≥95% execution-equivalence gate** against the Commercial baseline (Claude Opus 4.7) is applied to the _final_ equivalence number — i.e., after single-pass Self-Refine has been applied to Phase 3 failures. Any local model that fails to clear the gate on the Workstation tier is not eligible for the pilot but remains in the full ranked sign-off comparison alongside all other candidates. In Aim 1 Self-Refine is limited to one pass; iterative Self-Refine optimization with measured convergence trajectories is deferred to Aim 2.

## Scoring

The 5-metric vocabulary frames what gets checked. In Aim 1 every metric is computed **deterministically** against the catalogue schema or by **execution-equivalence**. There is no LLM-as-judge in the scoring loop. These five categories aggregate the 8 individual KPI checks defined in the [Evaluation Plan](./03-Evaluation-Plan#key-decisions): schema validity and structural compliance map to Structural Compliance; field existence, value plausibility, and catalogue existence map to Field Validity; operator validity maps to Operator Correctness; execution equivalence maps to Intent Capture; output stability is unique to model selection. Confirmation summary fidelity is exploratory and unweighted in Aim 1.

| Metric                | Weight | Aim 1 Implementation (Deterministic)                                                                                                                                                                                                                                                                   |
| --------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Intent Capture        | 25 pts | Execution-equivalence against the pre-authored reference SQON for that fixture. Computed per-query as exact record-set match. This is the relevance check: a structurally valid SQON that misinterprets the query will produce the wrong record set and fail here regardless of syntactic correctness. |
| Field Validity        | 25 pts | Every `fieldName` checked against `arranger://fields/{catalogId}` for the recorded `catalogDataRelease`. Binary per field.                                                                                                                                                                             |
| Operator Correctness  | 20 pts | Operator must appear in the SQON grammar AND `applicableTo` must include the field type. Schema-checked.                                                                                                                                                                                               |
| Structural Compliance | 20 pts | Final-attempt SQON passes the `@overture-stack/sqon` Zod schema.                                                                                                                                                                                                                                       |
| Output Stability      | 10 pts | Standard deviation across 3 identical runs at `temperature=0` per fixture. σ < 2.0.                                                                                                                                                                                                                    |

**Execution equivalence** is the gating metric. It is calculated per-query as exact record-set match (record IDs and counts) between the candidate's generated SQON and the reference SQON, **both executed against the frozen mock-catalogue snapshot** served by a local Arranger instance — not live production Arranger. Aggregated across the fixture set as a percentage. A model must achieve **≥95%** execution equivalence against Claude Opus 4.7 to clear Phase 3 and be eligible for the pilot.

:::note
**Why no LLM-as-judge in Aim 1 scoring:** Validating an LLM-as-judge with κ ≥ 0.90 requires ≥2 trained human reviewers consistently applying the rubric across a calibration sample. Current architect capacity is 0.5; the κ apparatus is deferred to Aim 2. A single-judge sanity check on `confirmationSummary` fidelity is permitted as observation, never as a KPI. See [Regression Testing](./05-Regression-Testing) for the layered evaluator that produces the same outcome without judge dependency.
:::

## Fixture Corpus

The model benchmark runs against **~15 fixtures** derived from real Arranger introspection of the deployed Drug Discovery Portal catalogues, frozen as a versioned static snapshot for reproducibility. Models never call the live Arranger API during evaluation; the introspection response is recorded once from the live endpoint, saved as a fixture file tagged with a `catalogDataRelease` identifier, and injected as prompt context for every run. Fixture coverage:

- ~8 single-field filters (one operator class each)
- ~4 multi-field AND/OR queries
- ~2 negation/exclusion queries
- ~1 multi-step complex logic query

Each fixture has one pre-authored reference SQON. Two SQONs that produce the same record set against the frozen catalogue are treated as equivalent regardless of structural difference (operator-equivalent forms are accepted). Equivalence classes for known multi-form fixtures are documented in the fixture YAML.

Several fixtures are intentionally designed as semantic traps: queries where a plausible wrong-field choice or wrong threshold produces a structurally valid SQON that passes all schema checks but returns a different record set. These fixtures are indistinguishable by syntax — only execution equivalence surfaces the failure. They are the primary mechanism for catching models that pattern-match on surface query features rather than understanding researcher intent.

Fixture authorship and review is owned by the architect (~3 days of effort). Worked phase-by-phase examples are in [Model Selection Examples](./07-Model-Selection-Examples).

:::note
The model selection fixture set is taken once from the introspection snapshot and is **never updated** during Aim 1 — this is what makes the model the only independent variable. Pinning the fixtures to a single `catalogDataRelease` means a benchmark run six weeks apart on the same model produces the same score. Versioned fixtures that track ongoing catalogue evolution are the job of [Regression Testing](./05-Regression-Testing); the two fixture pools are separate by design (see [Evaluation Plan Key Decision #2](./03-Evaluation-Plan#key-decisions)).
:::

## References

Wada, A., et al. (2026). "Bridging the performance gap: systematic optimization of local LLMs for Japanese medical PHI extraction." _Scientific Reports_ / PMC. https://pmc.ncbi.nlm.nih.gov/articles/PMC12894992/

---

## Worked Examples

:::info
All examples in this section are **hypothetical and illustrative**. No model evaluation has been run yet. The numbers, outputs, and outcomes are constructed to demonstrate the expected form of results for each phase — they are not real benchmark data.
:::

These worked examples cover each of the four screening phases. Each example uses fixtures derived from real Arranger introspection of the mutation, expression, and protein catalogues. Scoring is **deterministic throughout** — schema-grounded checks plus execution equivalence against pre-authored reference SQON. No LLM-as-judge appears in the scoring loop.

### Phase 1: Baseline Screening (Zero-Shot)

The goal of Phase 1 is to establish raw deterministic-score baselines for all seven shortlisted candidates without any prompt engineering. Models scoring above the Q1 threshold receive Chain-of-Thought prompts in Phase 2; models below receive simplified format-focused prompts (the Wada-derived capacity-matched split).

#### Example 1.1: Mutation Catalogue, Simple Single-Field Query

**System prompt** (dynamically constructed from `/introspection/mutation`):

```
You are a data discovery assistant. Your task is to convert the user's natural
language query into a valid SQON filter for the Arranger search API.

Catalog: mutation
Available fields and valid operators:
  data.hugo_symbol                  (keyword) operators: in, not-in, some-not-in, all, filter
  data.cancer_type                  (keyword) operators: in, not-in, some-not-in, all, filter
  data.is_oncogene                  (keyword) operators: in, not-in, some-not-in, all, filter
  data.is_tumor_suppressor_gene     (keyword) operators: in, not-in, some-not-in, all, filter
  data.overall_mutation_frequency   (keyword) operators: in, not-in, some-not-in, all, filter
  data.dataset_name                 (keyword) operators: in, not-in, some-not-in, all, filter

SQON structure:
  Combination operator: { "op": "and" | "or" | "not", "content": [ <sqon>, ... ] }
  Field filter: { "op": "in" | "not-in" | ..., "content": { "fieldName": "...", "value": [...] } }

Output only valid JSON. No explanation. No markdown formatting.
```

**User query:** `"Find all mutations in tumor suppressor genes"`

**Reference SQON:**

```json
{
  "op": "in",
  "content": {
    "fieldName": "data.is_tumor_suppressor_gene",
    "value": ["true"]
  }
}
```

##### Example 1.1a: Qwen 3.5-27B (Q4_K_M) — Pass

```json
{
  "op": "in",
  "content": {
    "fieldName": "data.is_tumor_suppressor_gene",
    "value": ["true"]
  }
}
```

**Deterministic scoring:**

| Check                              | Result | Notes                                                    |
| ---------------------------------- | ------ | -------------------------------------------------------- |
| Structural validity (Zod)          | Pass   | Valid SQON                                               |
| Field existence                    | Pass   | `data.is_tumor_suppressor_gene` present in introspection |
| Operator validity                  | Pass   | `in` valid for keyword type                              |
| Value plausibility                 | Pass   | `"true"` in recorded value distribution                  |
| Execution equivalence              | Pass   | 487 records, exact match to reference                    |
| Output stability (σ across 3 runs) | Pass   | σ = 0.0, deterministic at `temperature=0`                |

**Phase 1 score: 100/100.** Advances to Phase 2 in the high-performing group.

##### Example 1.1b: Llama 4 Scout (FP8 on A100) — Field Validity Failure

```json
{
  "op": "in",
  "content": {
    "fieldName": "tumor_suppressor",
    "value": "true"
  }
}
```

**Deterministic scoring:**

| Check                 | Result | Notes                                                                               |
| --------------------- | ------ | ----------------------------------------------------------------------------------- |
| Structural validity   | Fail   | `value` is a bare string, not an array                                              |
| Field existence       | Fail   | `tumor_suppressor` does not exist; correct field is `data.is_tumor_suppressor_gene` |
| Operator validity     | Pass   | `in` valid for keyword type (if field existed)                                      |
| Value plausibility    | N/A    | Field doesn't exist                                                                 |
| Execution equivalence | Fail   | Query fails schema validation; 0 records returned                                   |
| Output stability      | Pass   | Consistent failure across 3 runs                                                    |

**Phase 1 score: 35/100.** Below Q1 threshold; advances to Phase 2 in the simplified-prompt group.

:::note
This is the deterministic-scoring approach in action. Every cell in the scoring table is decidable without a judge: structural validity is a Zod check, field existence is a catalogue lookup, operator validity is a grammar check, execution equivalence is a record-set diff. The 5-metric vocabulary frames what is being checked; the implementation is mechanical.
:::

### Phase 2: Capacity-Matched Prompting

Phase 2 splits the shortlist into two groups based on Phase 1 scores and applies prompts matched to capacity. The high-performing group receives Chain-of-Thought prompts with multi-step examples. The lower-performing group receives simplified format-focused prompts. Wada et al.'s key finding is that simplified prompts can unlock format compliance in lower-capacity models even when reasoning depth remains insufficient.

#### Example 2.1: High-Performing Group — Multi-Condition CoT Prompt

The CoT prompt adds explicit step-by-step reasoning instructions and two worked examples before the user query, then asks for SQON only.

**System prompt addition** (excerpt):

```
IMPORTANT: Before generating SQON, think through the query step by step:
1. Identify all conditions the user is asking for
2. Determine the logical operators (AND/OR) between conditions
3. Map each condition to a field in the available schema
4. Construct the SQON structure, combining conditions as needed

Few-Shot Example:
User: "Find mutations in TP53 from lung or breast cancer"
Thought: User wants (TP53 gene) AND (lung OR breast cancer). Top-level op is AND
because the user wants records matching both a specific gene AND one of the two
cancer types.
SQON: { "op": "and", "content": [ ... ] }
```

**User query:** `"Find mutations in BRCA1, BRCA2, or TP53 from breast or ovarian cancer that are tumor suppressors"`

**Reference SQON:**

```json
{
  "op": "and",
  "content": [
    {
      "op": "in",
      "content": {
        "fieldName": "data.hugo_symbol",
        "value": ["BRCA1", "BRCA2", "TP53"]
      }
    },
    {
      "op": "in",
      "content": {
        "fieldName": "data.cancer_type",
        "value": ["Breast Adenocarcinoma", "Ovarian Adenocarcinoma"]
      }
    },
    {
      "op": "in",
      "content": {
        "fieldName": "data.is_tumor_suppressor_gene",
        "value": ["true"]
      }
    }
  ]
}
```

**Qwen 3.5-27B output under CoT prompt** — identical to reference. All Layer 1 checks pass; execution equivalence holds at 212 records.

**Phase 2 score: 96/100** (Output Stability 6/10 — array order varies between runs but record set is identical, so execution equivalence still passes).

#### Example 2.2: Lower-Performing Group — Simplified Format Prompt

Same query, simpler prompt that omits CoT and emphasises format compliance:

```
Convert natural language to SQON JSON.

Catalog: mutation
Fields: data.hugo_symbol, data.cancer_type, data.is_oncogene,
data.is_tumor_suppressor_gene, data.overall_mutation_frequency, data.dataset_name

SQON format:
Field filter: { "op": "in", "content": { "fieldName": "DATA.FIELD", "value": [...] } }
Combination: { "op": "and", "content": [ ... ] }

Output JSON only. No explanation.
```

**Llama 4 Scout output under simplified prompt:**

```json
{
  "op": "and",
  "content": [
    {
      "op": "in",
      "content": {
        "fieldName": "data.hugo_symbol",
        "value": ["BRCA1", "BRCA2", "TP53"]
      }
    },
    {
      "op": "in",
      "content": {
        "fieldName": "data.cancer_type",
        "value": ["Breast Adenocarcinoma", "Ovarian Adenocarcinoma"]
      }
    }
  ]
}
```

The model still misses the tumor-suppressor condition, but structural compliance, field validity, and operator correctness are perfect. **Phase 2 score: 80/100** — improved from 35/100 in Phase 1, but missing intent capture on multi-condition queries.

This is the Wada-derived finding: simplified prompts close the _format-compliance gap_ but not the _reasoning gap_. It is a publishable methodological observation for the grant — and it confirms the lower-tier model is unsuitable for the pilot even with prompt-engineering help.

### Phase 3: Hardware-Task Mapping

Phase 3 runs each candidate on its target hardware tier across the ~15-fixture set and measures execution equivalence and latency. The ≥95% execution-equivalence gate against the Commercial baseline (Claude Opus 4.7) is the Aim 1 hard threshold for pilot eligibility.

#### Execution Equivalence Results

| Model                          | Tier               | Fixtures Matched | Execution Equivalence | Latency (median) | Pilot Eligible        |
| ------------------------------ | ------------------ | ---------------- | --------------------- | ---------------- | --------------------- |
| **Claude Opus 4.7**            | Managed API        | 15/15            | 100% (baseline)       | 1.1 s            | Ceiling               |
| **Mistral Small 3.2 (Q4_K_M)** | Workstation 16 GB  | 14/15            | 93.3%                 | 2.4 s            | No                    |
| **Qwen 3.5-27B (Q4_K_M)**      | Workstation 24 GB  | 14/15            | 93.3%                 | 3.2 s            | No                    |
| **Gemma 4 31B (Q4_K_M)**       | Workstation 24 GB  | 13/15            | 86.7%                 | 4.8 s            | No                    |
| **Gemma 4 26B-A4B (Q4_K_M)**   | Workstation 24 GB  | 12/15            | 80.0%                 | 2.1 s            | No                    |
| **Phi-4-Reasoning (Q4_K_M)**   | Workstation 16 GB  | 11/15            | 73.3%                 | 1.8 s            | No                    |
| **Llama 4 Scout (FP8)**        | Institutional A100 | 13/15            | 86.7%                 | 0.6 s            | Resource profile only |

In this worked example, **no local model clears the ≥95% gate against Claude Opus 4.7 at zero-shot baseline.** Phase 4 single-pass Self-Refine is applied to see whether failures are recoverable; if any candidate recovers above 95% after one refinement pass, it becomes pilot-eligible. The tool-use-specialised candidate (Mistral Small 3.2) ties Qwen at zero-shot despite being smaller, supporting the hypothesis that workload-aligned specialization matters at this scale.

#### Example 3.1: Hardware-Specific Failure Mode

Llama 4 Scout's failure on the query `"Find all mutations in TP53"` returns 489 records when the reference returns 487:

```json
{
  "op": "in",
  "content": { "fieldName": "data.hugo_symbol", "value": ["TP53", "tp53"] }
}
```

The model expanded the value array with a case-variant. Layer 1 passes (the field is valid, the operator is valid, the structure is valid). Execution equivalence fails because the record set differs from the reference (487 vs 489). This is exactly the kind of error a rubric-only score would miss but execution equivalence catches.

### Phase 4: Finalist Validation (Observational, Single-Pass)

Phase 4 in Aim 1 is single-pass: for any Phase 3 failure, the model is shown the reference SQON and a one-sentence explanation of the error, then re-prompted **once**. The post-Phase 4 equivalence is the number compared against the ≥95% gate; the recovery profile (which failure types recover after one pass) is reported alongside. Full iterative Self-Refine optimization with measured convergence trajectories is deferred to Aim 2.

#### Example 4.1: Single-Pass Self-Refine on a Logic Error

Original query: `"Find oncogenes in breast cancer that are also in the expression dataset"`

**Initial Qwen 3.5-27B output** (wrong top-level operator):

```json
{
  "op": "or",
  "content": [
    {
      "op": "in",
      "content": { "fieldName": "data.is_oncogene", "value": ["true"] }
    },
    {
      "op": "in",
      "content": {
        "fieldName": "data.cancer_type",
        "value": ["Breast Adenocarcinoma"]
      }
    },
    {
      "op": "in",
      "content": { "fieldName": "data.dataset_name", "value": ["expression"] }
    }
  ]
}
```

Execution returns 2,847 records; reference returns 156. Equivalence fails.

**Self-Refine prompt** (Aim 1: one pass only):

```
Your SQON used "or" at the top level. The user wanted records matching ALL three
conditions (oncogene = true AND cancer = breast AND dataset = expression). When
the user lists multiple conditions joined by phrases like "that are also" or
"from", use "and" at the top level. Output the corrected SQON only.
```

**Corrected output** matches the reference; execution equivalence passes at 156 records.

#### Phase 4 Recovery Summary (Worked Example)

Before Self-Refine is applied, each Phase 3 failure is classified by type: **structural** (invalid SQON), **semantic-field** (valid field, wrong one for the query), **semantic-value** (correct field, wrong threshold or value), or **semantic-scope** (correct field and value, wrong operator combination).

| Model                          | Phase 3 Equiv. | Failure Type       | Recovered After 1 Pass | Phase 4 Equiv. | Pilot Eligible        |
| ------------------------------ | -------------- | ------------------ | ---------------------- | -------------- | --------------------- |
| **Qwen 3.5-27B (Q4_K_M)**      | 93.3%          | Semantic-scope (1) | 1/1 recovered          | 100%           | Yes                   |
| **Mistral Small 3.2 (Q4_K_M)** | 93.3%          | Semantic-scope (1) | 1/1 recovered          | 100%           | Yes                   |
| **Gemma 4 31B (Q4_K_M)**       | 86.7%          | Mixed (2)          | 1/2 recovered          | 93.3%          | No — below gate       |
| **Gemma 4 26B-A4B (Q4_K_M)**   | 80.0%          | Semantic-field (3) | 1/3 recovered          | 86.7%          | No — below gate       |
| **Phi-4-Reasoning (Q4_K_M)**   | 73.3%          | Structural (4)     | 1/4 recovered          | 80.0%          | No — below gate       |
| **Llama 4 Scout (FP8)**        | 86.7%          | Semantic-field (2) | 0/2 recovered          | 86.7%          | Resource profile only |

In this worked example, two local models become pilot-eligible after single-pass Self-Refine: Qwen 3.5-27B and Mistral Small 3.2, both reaching 100% post-refinement equivalence. The failure type classification shows the recoverable failures were semantic-scope errors (wrong operator combination) — consistent with Self-Refine being most effective when the model understood the intent but chose the wrong operator. Semantic-field failures (wrong field entirely) did not recover.

:::note
Aim 1 caps Self-Refine at a single pass because iterative convergence measurement requires multi-pass tracking and reviewer effort the team does not have. Aim 2 promotes Phase 4 to a measured iterative loop with convergence trajectories.
:::

## Sign-Off Outcome

The four-phase screening on this worked example produces:

- **Pilot model:** Qwen 3.5-27B (Workstation tier, Q4_K_M) — 100% execution equivalence after single-pass Self-Refine; selected over Mistral on margin of demonstrated correctness on multi-step queries.
- **Full ranked sign-off comparison (all 7 candidates):**

| Rank | Model             | Tier          | Phase 3 Equiv.  | Phase 4 Equiv. | Latency (median) | Pilot Eligible        |
| ---- | ----------------- | ------------- | --------------- | -------------- | ---------------- | --------------------- |
| —    | Claude Opus 4.7   | Commercial    | 100% (baseline) | —              | 1.1 s            | Ceiling               |
| 1    | Qwen 3.5-27B      | Workstation   | 93.3%           | 100%           | 3.2 s            | Yes                   |
| 2    | Mistral Small 3.2 | Workstation   | 93.3%           | 100%           | 2.4 s            | Yes                   |
| 3    | Gemma 4 31B       | Workstation   | 86.7%           | 93.3%          | 4.8 s            | No — below gate       |
| 4    | Gemma 4 26B-A4B   | Workstation   | 80.0%           | 86.7%          | 2.1 s            | No — below gate       |
| 5    | Phi-4-Reasoning   | Workstation   | 73.3%           | 80.0%          | 1.8 s            | No — below gate       |
| —    | Llama 4 Scout     | Institutional | 86.7%           | 86.7%          | 0.6 s            | Resource profile only |

- **Institutional data point:** Llama 4 Scout on rented A100 (86.7%, 0.6 s/query) — preserved for the resource profile but not pilot-eligible.
- **Wada-style finding:** Capacity-matched prompting closed the format-compliance gap for the lower group but did not close the reasoning gap; single-pass Self-Refine recovered the high-group failures. Reported as a methodological observation in the baseline document.
- **Workload-alignment finding:** Mistral Small 3.2 (tool-use-specialised, 24B) matched Qwen 3.5-27B (general reasoning, 27B) at zero-shot and after Self-Refine, despite being smaller. Suggests workload-aligned specialization is at least as valuable as raw parameter count at this scale. This finding is what motivates including Mistral in the shortlist — without it the dataset cannot support the claim.

These outcomes are the inputs to [Regression Testing](./05-Regression-Testing) (which inherits the pilot model and fixture set) and [User Testing](./06-User-Testing) (which deploys the pilot model against real researchers).

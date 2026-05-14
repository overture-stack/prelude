# Evaluation Plan

## Overview

This page outlines our plan to establish, measure, and publish a defensible baseline for our Aim 1 functionalities by **August 31, 2026**. The evaluation answers three core questions about translating natural language into Serializable Query Object Notation (SQON):

1. **Feasibility:** Does at least one local model in our shortlist run within researcher hardware constraints without falling below acceptable accuracy?
2. **Correctness:** Does the system produce schema-valid SQON with no hallucinated fields, valid operators, and stable output across repeated runs?
3. **Deployability:** Does the system clear safety gates under adversarial pressure, and does it serve real researchers in a controlled pilot?

:::info
Hallucinations here are operationally defined as the generation of invalid fields, catalogues, unsupported operators, nonexistent schema entities, or fabricated constraints not present in the prompt.
:::

Our evaluation plan is divided into three workstreams that can run **concurrently**.

1. **Model Selection:** A benchmark of **6 local candidates and 1 commercial frontier baseline** run against a **single, frozen fixture set** that is taken once and never updated. This ensures the **model is the only independent variable**, allowing for a deterministic ranking of candidates under identical conditions to identify the top two for the pilot.

2. **Regression Testing:** An automated evaluator that detects when software or schema updates break previously working queries, run against **versioned fixtures** that are refreshed whenever the catalogue changes intentionally. This separates system-level failures from model capability and includes a **Safety Regression** suite of 10 adversarial probes that must report zero unauthorised executions as a hard gate before the pilot opens.

3. **User Testing (Human-in-the-loop):** A pilot study of **~8 researchers × 2 sessions × 6 tasks = 96 task instances** capturing full conversation histories, generated SQON, post-task surveys, and structured usage logs.

## Key Decisions

1. **Deterministic-First Scoring:** Aim 1 scoring is primarily deterministic, schema validity, field existence, operator validity, value plausibility, catalogue existence, execution success, supplemented by execution-equivalence against pre-authored fixtures. LLM-as-judge with κ calibration is deferred to Aim 2 because κ requires ≥2 trained reviewers and will be more appropriate when evaluating the functionality introduced in Aim 2 (Visualization & Analysis using coded outputs). An exploratory single-judge sanity check on `confirmationSummary` fidelity may be included but not as a KPI.

| Metric                        | What is checked                                                                      | KPI                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Schema validity               | The generated SQON passes the `@overture-stack/sqon` Zod schema                      | Yes                                                      |
| Field existence               | Every field name in the output exists in the catalogue schema for the pinned release | Yes                                                      |
| Operator validity             | Each operator appears in the SQON grammar and is applicable to its field type        | Yes                                                      |
| Value plausibility            | Filter values are consistent with the field's expected type and enumeration          | Yes                                                      |
| Catalogue existence           | Referenced catalogues exist in the introspection snapshot                            | Yes                                                      |
| Execution success             | The generated SQON executes without error against the frozen mock catalogue          | Yes                                                      |
| Execution equivalence         | The query returns the same record set as the pre-authored reference SQON             | Yes, gating metric (≥85% required for pilot eligibility) |
| Confirmation summary fidelity | Plain-language summary accurately reflects the generated query (single-judge check)  | No — exploratory only                                    |

:::note
Most metrics are binary pass/fail per field or operator, aggregated as a percentage across the fixture set. Execution equivalence is the exception — it is computed as an exact record-set match per fixture, then aggregated to a percentage. It is the only hard gate (≥85% required for pilot eligibility, sized to a 3-miss budget over the ~20-fixture set). Latency is a soft ceiling: a median per-query latency above 10 s triggers a flag in the ranked comparison but does not exclude the model from the pilot. The 10 s threshold is provisional, it will be revised once the pilot provides observed task completion times.
:::

2. **Model Benchmark and Application Evaluation Are Strictly Separated:** Both workstreams use fixtures, the live API is never called during either. The difference is scope: model selection runs against a single frozen fixture set taken once and never updated; regression testing runs against versioned fixtures that are re-taken whenever the catalogue changes intentionally. Mixing the two is the single most common LLM-eval mistake, a system-level regression can be misread as a model regression and vice versa.

3. **Zero Tolerance on Confirmation-Gate Bypasses:** The model must always produce a plain-language summary before any tool execution. The Safety Regression adversarial probe must report zero unauthorised executions before the pilot opens, and on every CI run thereafter. Any bypass attempt is a critical system failure.

4. **Provenance Pinning:** Every `QueryRecord` carries `modelId`, `mcpServerVersion`, `sqonPackageVersion`, `systemPromptHash`, `userPrompt`, `catalogDataRelease`, and `samplingParams`. Without these, no baseline is reproducible and no regression can be traced to its cause.

:::note
`samplingParams` records the inference parameters passed to the model at generation time, primarily `temperature` and `top_p`. These are pinned because the same prompt with different sampling parameters can produce different outputs. `systemPromptHash` covers the system-level instructions; `userPrompt` captures the per-turn natural language query, without it the record cannot be replayed.
:::

<details>
<summary><strong>Example provenance manifest</strong> — illustrative shape of a provenance-pinned record; each workstream emits one of these in the same form.</summary>

```jsonc
{
  "baseline": "eval-baseline-v1.0.0",
  "generated": "2026-08-14",
  "git": "a3f91bc",
  "modelId": "qwen3.5-27b-q4_k_m",
  "mcpServerVersion": "0.4.2",
  "sqonPackageVersion": "1.2.0",
  "systemPromptHash": "sha256:e3b0c44298fc1c14",
  "userPrompt": "<per-turn query, stored in raw NDJSON>",
  "catalogDataRelease": "ddp-catalogue-2026-07-01",
  "samplingParams": { "temperature": 0.3, "top_p": 1 },
  "fixtureSet": "ddp-fixtures-v1.0",
  "fixtureCount": 20,
}
```

</details>

5. **Live Endpoint as Source, Static Fixtures for Evaluation:** The Arranger introspection endpoint (`/api/arranger/introspection`) is the authoritative source for catalogue schema, but it is never called live during model selection or regression test runs. The workflow is: (1) snapshot the introspection response at a named release, (2) save it as a versioned static fixture, (3) inject it as prompt context during evaluation. When the catalogue changes intentionally, a new snapshot is taken, a new `catalogDataRelease` tag is issued, and fixtures are re-validated. This keeps evaluation fully reproducible and CI-safe without a network dependency.

## Hardware Envelope

Aim 1 evaluates two hardware tiers that represent the realistic minimum and a single institutional data point.

| Tier               | Hardware Example       | Memory           | Aim 1 Sampling                                                             |
| ------------------ | ---------------------- | ---------------- | -------------------------------------------------------------------------- |
| Workstation Tier   | Apple M3/M4 Pro or Max | 16–24 GB Unified | Primary pilot environment; all local candidates evaluated                  |
| Institutional Tier | NVIDIA A100            | 80 GB HBM2e      | One large model run to measure cost and performance at institutional scale |

A frontier commercial API (Claude Opus 4.7) serves as the performance ceiling against which local candidates are compared.

## Sign-Off Deliverables

A signed-off Aim 1 evaluation produces the following documents. Each lives in the workstream that owns it; this page is the index.

| Document                  | Owner workstream                              | Brief description                                                                                                                         |
| ------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Citable baseline manifest | Evaluation Plan (this page)                   | Cross-workstream provenance record — model, versions, prompt hashes, sampling params, fixture set — regenerable via `make eval`.          |
| Ranked model comparison   | [Model Selection](./04-Model-Selection)       | Full ranking of all 7 shortlist candidates against the ≥85% execution-equivalence gate, with the pilot model called out.                  |
| Safety regression report  | [Regression Testing](./05-Regression-Testing) | Result of the 10-probe adversarial suite; zero unauthorised executions is the hard gate before the pilot opens.                           |
| Pilot results summary     | [User Testing](./06-User-Testing)             | Task completion, confirmation-gate compliance, Likert surveys, behavioural KPIs — stratified Conversational UI vs. Facet Search baseline. |
| Named caveats             | Evaluation Plan (this page)                   | Cross-workstream limitations weighted into the reader's interpretation of the baseline.                                                   |

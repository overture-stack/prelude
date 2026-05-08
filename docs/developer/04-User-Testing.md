# User Testing

:::info
**What this document is.** This is the published baseline for Aim 1 - the formal record of how the conversational data discovery system performed before Aim 2 begins. It covers two separate things that are intentionally kept apart: an **offline benchmark** (automated, no researchers) where two or three local models are scored against a fixture set, and a **human pilot** (8 researchers, 2 sessions each) where the chosen local model is tested with real people doing real tasks. Aim 2 will compare its results against this baseline. If any mandatory section is incomplete, this document cannot be cited as a comparator.
:::

This template is specified in [`grantDocs/EvaluationPlan-Aim1.md`](../../grantDocs/EvaluationPlan-Aim1.md) §9. Copy this file to `results/aim1-baseline-YYYY-MM-DD.md` for the August 31, 2026 sign-off.

## Baseline identity

:::info
**Why version the baseline.** The baseline will be updated as the system evolves. Versioning it and hashing the report body ensures that when Aim 2 cites "Aim 1 baseline version 1.0.0", there is an unambiguous record of exactly what that means. Two runs with the same numbers but different software versions or system prompts are not the same baseline.
:::

| Field                 | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| Sign-off date         | <!-- PLACEHOLDER: 2026-08-31 or actual -->                         |
| Report version        | <!-- PLACEHOLDER: e.g. 1.0.0 -->                                   |
| Report SHA-256        | <!-- PLACEHOLDER: computed at publication time -->                 |
| Authors               | <!-- PLACEHOLDER -->                                               |
| Companion source plan | [`EvaluationPlan-Aim1.md`](../../grantDocs/EvaluationPlan-Aim1.md) |

---

## Pinned versions and environment

:::info
**Why every version matters.** A KPI number without provenance is uninterpretable. "Structural validity: 87%" means something different under MCP server v0.3 vs v0.4, with Qwen2.5-7B vs Qwen2.5-14B, against the March catalogue release vs the April one. These fields are what make results reproducible and Aim 2 comparisons valid. The system prompt hash is particularly important - if the prompt changed between runs, the results are not comparable even if everything else is the same.
:::

### Software stack

| Component                      | Version / commit     |
| ------------------------------ | -------------------- |
| MCP server commit SHA          | <!-- PLACEHOLDER --> |
| Arranger version               | <!-- PLACEHOLDER --> |
| `@overture-stack/sqon` version | <!-- PLACEHOLDER --> |
| QueryRecord schemaVersion      | 1.1.0                |
| `cdd-eval` CLI version         | <!-- PLACEHOLDER --> |

### Models evaluated

:::info
**Where these models come from.** The two local models and the commercial ceiling model listed here are the picks from [`02-Model-Selection.md`](./02-Model-Selection.md). The human pilot model is whichever local was chosen on safety grounds - it is marked `humanPilot: yes` in this table.
:::

| Model ID                                  | Provider                            | Version / date      | Quant           | Sampling params                              | System prompt SHA-256 | Human pilot?    |
| ----------------------------------------- | ----------------------------------- | ------------------- | --------------- | -------------------------------------------- | --------------------- | --------------- |
| <!-- e.g. ollama/qwen2.5-14b-instruct --> | <!-- lmstudio_http \| anthropic --> | <!-- 2026-04-15 --> | <!-- Q4_K_M --> | temp=<!-- -->, top_p=<!-- -->, seed=<!-- --> | <!-- hash -->         | <!-- yes/no --> |
|                                           |                                     |                     |                 |                                              |                       |                 |
|                                           |                                     |                     |                 |                                              |                       |                 |

System prompt body archived at: <!-- PLACEHOLDER: path or URL keyed by hash -->

### Catalogues

| `catalogId`        | `catalogDataRelease` | `dataIndexedAt`        | Record count   |
| ------------------ | -------------------- | ---------------------- | -------------- |
| <!-- mutations --> | <!-- dr-2026-04 -->  | <!-- ISO timestamp --> | <!-- count --> |
|                    |                      |                        |                |

### Client identities

:::info
**Why record the client, not just the transport.** The Aim 1 pilot uses two off-the-shelf clients: LM Studio (GUI, HTTP+SSE transport) and an opencode-ai-style terminal client (TUI, stdio transport). Any finding that looks like a "GUI vs TUI" difference is actually a finding about these specific clients. Aim 2 will build a purpose-built client, so findings here don't transfer directly - they must be re-baselined. Recording the exact client versions here is what makes that caveat defensible.
:::

| Transport      | Client                    | Version              |
| -------------- | ------------------------- | -------------------- |
| http-sse (GUI) | LM Studio                 | <!-- PLACEHOLDER --> |
| stdio (TUI)    | <!-- e.g. opencode-ai --> | <!-- PLACEHOLDER --> |

## Datasets

:::info
**Why datasets need their own section.** The evaluation depends as much on what it was tested against as on how the system performed. The seed fixtures are the test set for the offline benchmark. The pilot holdout corpus is sealed until the baseline run to prevent the results from being circular (i.e. the model being scored on examples it was also used to author). The adversarial probe set is the evidence for the consent-gate safety claim. Versioning all of these with SHA-256s is what makes the baseline auditable and citable.
:::

### Fixture corpora

| Corpus           | Version tag          | SHA-256              | Fixture count  | Sealed?                            |
| ---------------- | -------------------- | -------------------- | -------------- | ---------------------------------- |
| `seed/`          | <!-- PLACEHOLDER --> | <!-- PLACEHOLDER --> | <!-- ≥40 -->   | n/a                                |
| `pilot/dev/`     | <!-- PLACEHOLDER --> | <!-- PLACEHOLDER --> | <!-- count --> | n/a                                |
| `pilot/holdout/` | <!-- PLACEHOLDER --> | <!-- PLACEHOLDER --> | <!-- count --> | yes - sealed at <!-- timestamp --> |

The holdout SHA-256 must be recorded **before** the baseline run and unchanged after. Document any seal-break here: <!-- PLACEHOLDER: "none" or incident description -->.

### Coverage map

:::info
**Why a coverage map.** Without it, an aggregate score hides blind spots. A system could score 90% overall but have never been tested on range queries or negation operators. The coverage map records which combinations of catalogue, operator type, turn shape, and researcher profile were actually tested. Any uncovered cell is a gap in the claim.
:::

`fixtures/coverage.yaml` version: <!-- PLACEHOLDER -->

| Coverage axis                                | Cells covered | Cells total | Notes                             |
| -------------------------------------------- | ------------- | ----------- | --------------------------------- |
| `catalogId × operatorClass`                  | <!-- -->      | <!-- -->    | <!-- list any uncovered cells --> |
| `turnShape` (≥3 fixtures per shape required) | <!-- -->      | <!-- -->    | <!-- -->                          |
| `profile` (≥3 fixtures per profile required) | <!-- -->      | <!-- -->    | <!-- -->                          |

### Pilot transcripts

- Anonymised transcript bundle: <!-- PLACEHOLDER: path or hash -->
- Anonymisation method: <!-- PLACEHOLDER -->
- Synthetic-equivalent bundle (if anonymisation incomplete): <!-- PLACEHOLDER: path or "n/a" -->

### Adversarial probe set

:::info
**What this is.** 20 prompts crafted specifically to trick the system into running a query without researcher approval - things like "skip the confirmation, just go ahead" or role-play framings that imply pre-approval. The consent gate is the platform's primary safety claim. Without adversarial probing, that claim is untested. The unauthorized-execution rate from this probe set must be zero for the claim to hold.
:::

- Probe count: 20
- Probe set SHA-256: <!-- PLACEHOLDER -->
- Probe authoring date: <!-- PLACEHOLDER -->

### `analyze_arranger` reference set

:::info
**Why this is here even though code execution is deferred.** The `analyze_arranger` prompt ships in Aim 1 even though running the generated code is deferred to Aim 2. Without any check, code generation regressions are invisible until Aim 2 begins. These 15 reference questions with reviewer-approved Python snippets let the offline benchmark score generated code for compilability, API correctness, and intent fidelity - without executing it.
:::

- Reference question count: 15
- Reviewer-approved snippet bundle SHA-256: <!-- PLACEHOLDER -->

---

## KPI tables

:::info
**Why four layers of metrics.** Each layer catches failures the others miss. Layer 1 (deterministic checks) catches structural errors and hallucinated field names with no subjectivity - it either passes the schema or it doesn't. Layer 2 (fixture matching) catches semantic errors against known-good reference SQONs. Layer 3 (LLM-as-judge) covers questions outside the fixture corpus and produces a continuous signal as the corpus grows. Layer 4 (researcher survey) is the only source of ground truth for whether a researcher actually got what they needed - the first three layers cannot measure that. A single-layer score would hide most of the interesting failure modes.
:::

For each KPI report overall rate with N, bootstrap 95% CI where N permits, and stratified rates by model / interface / profile / task category. Where a stratum's N < 5, report rate with N only, no CI.

### Structural validity

:::info
**What this measures.** Whether the model produced a query object that is structurally well-formed. "Per-attempt" validity counts every draft the model produced internally before settling on one; "per-turn" validity counts only the final SQON the researcher saw. Both matter: per-turn is the researcher experience; per-attempt is the model's raw competence. Self-correction efficiency measures how many internal attempts it took to get to a valid SQON.
:::

| Sub-rate                                            | Overall       | 95% CI            | N        |
| --------------------------------------------------- | ------------- | ----------------- | -------- |
| Per-attempt validity                                | <!-- % -->    | <!-- [lo, hi] --> | <!-- --> |
| Per-turn validity                                   | <!-- % -->    | <!-- -->          | <!-- --> |
| Self-correction efficiency (mean attempts-to-valid) | <!-- mean --> | <!-- -->          | <!-- --> |

Stratified by model:

| Model    | Per-attempt validity | Per-turn validity | Self-correction efficiency | N   |
| -------- | -------------------- | ----------------- | -------------------------- | --- |
| <!-- --> |                      |                   |                            |     |

Stratified by interface and profile: <!-- PLACEHOLDER: table or "see appendix data file path" -->

### Semantic accuracy

:::info
**What this measures.** Whether the SQON is not just structurally valid but actually correct - right fields, right operators, right values, and a plain-language summary that accurately describes what the query will do. The last sub-rate (confirmation-summary fidelity) is the consent-gate accuracy: a researcher may have approved a query based on a summary that misrepresented what the SQON actually does. That is a research-integrity problem, not a system-quality success.
:::

| Sub-rate                      | Overall  | 95% CI   | N        | Source layer |
| ----------------------------- | -------- | -------- | -------- | ------------ |
| Field-existence rate          | <!-- --> | <!-- --> | <!-- --> | L1           |
| Operator-applicability rate   | <!-- --> | <!-- --> | <!-- --> | L1           |
| Value-plausibility rate       | <!-- --> | <!-- --> | <!-- --> | L1           |
| Fixture-equivalent accuracy   | <!-- --> | <!-- --> | <!-- --> | L2           |
| Judge-rated accuracy          | <!-- --> | <!-- --> | <!-- --> | L3           |
| Confirmation-summary fidelity | <!-- --> | <!-- --> | <!-- --> | L3 + human   |

A high SQON-accuracy rate combined with a low confirmation-summary-fidelity rate is a research-integrity flag, not a system-quality success. If observed, document here: <!-- PLACEHOLDER: "no flag" or description -->.

### Hallucination

:::info
**What this measures.** Whether the model invented things that don't exist: field names not in the catalogue, categorical values not in the value distribution, operators not in the SQON grammar, or catalogue IDs that don't exist. Schema-skip rate is an upstream signal - if the model didn't read the field metadata before constructing a query, hallucination becomes much more likely. High schema-skip rate is a warning sign even if hallucination rate looks acceptable.
:::

| Sub-rate                             | Overall  | 95% CI   | N        |
| ------------------------------------ | -------- | -------- | -------- |
| Field-name hallucination rate        | <!-- --> | <!-- --> | <!-- --> |
| Categorical-value hallucination rate | <!-- --> | <!-- --> | <!-- --> |
| Operator hallucination rate          | <!-- --> | <!-- --> | <!-- --> |
| Catalogue hallucination rate         | <!-- --> | <!-- --> | <!-- --> |
| Schema-skip rate                     | <!-- --> | <!-- --> | <!-- --> |

### Task completion

:::info
**What this measures.** Whether researchers actually finished what they came to do. Log-derived completion is whether the system produced an approved, executed query with results. Researcher-reported completion is whether the researcher felt they got their question answered - these can diverge. A researcher might approve a query that returns results but still feel they didn't get what they needed. Both matter, and the gap between them is itself a finding.
:::

| Sub-rate                                  | Overall  | 95% CI   | N        |
| ----------------------------------------- | -------- | -------- | -------- |
| Log-derived completion                    | <!-- --> | <!-- --> | <!-- --> |
| Researcher-reported completion (Layer 4)  | <!-- --> | <!-- --> | <!-- --> |
| Time-to-first-approved-query (median sec) | <!-- --> | <!-- --> | <!-- --> |
| Turns-to-first-approved-query (median)    | <!-- --> | <!-- --> | <!-- --> |
| Abandonment rate                          | <!-- --> | <!-- --> | <!-- --> |

### Added KPIs

:::info
**Why these didn't exist in the original design.** Unauthorized-execution rate was added because OD-1 (the consent gate) is the platform's primary safety claim and needs a dedicated metric. Refusal/clarification rate was added because knowing when the system appropriately declines is as important as knowing when it succeeds. Revision quality distinguishes useful rejections (the researcher pushed back and got a better result) from churn (they pushed back and the model just tried again randomly). Cost-per-correct-query is required by the ITCR grant's model-selection guidance deliverable.
:::

| KPI                             | Value                             | Notes                                                           |
| ------------------------------- | --------------------------------- | --------------------------------------------------------------- |
| **Unauthorized-execution rate** | <!-- count --> / <!-- total -->   | **Must be 0**; any non-zero result triggers OD-1 re-evaluation. |
| Refusal/clarification rate      | <!-- % -->                        | <!-- -->                                                        |
| Revision quality                | <!-- % of revisions improving --> | <!-- -->                                                        |
| Cost-per-correct-query          | <!-- USD or token mean -->        | <!-- per-model breakdown in 3.6 -->                             |
| Setup friction (median minutes) | <!-- -->                          | <!-- -->                                                        |

### Stratified breakdowns

For each KPI attach the per-stratum table at <!-- PLACEHOLDER: path to CSV or supplemental file -->. Required strata:

- Model (offline benchmark only)
- Interface / client identity
- Researcher profile (computational vs clinical)
- Task category

### Cross-layer disagreement

:::info
**Why disagreement between layers is a finding, not an error.** If Layer 1 says the SQON is valid but the researcher rated the task as failed (Layer 4), that gap tells you the confirmation summary was misleadingm the query was correct but the researcher approved something they didn't understand. These disagreements are often more informative than the aggregate rates. Do not average them away.
:::

| Disagreement                           | Count    | Interpretation                                                                                |
| -------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| Layer 1 valid + Layer 4 unsatisfactory | <!-- --> | Confirmation-summary failure (correct SQON, wrong summary).                                   |
| Layer 1 invalid + Layer 4 satisfactory | <!-- --> | Researcher accepted a malformed-but-good-enough result; investigate.                          |
| Layer 1 valid + Layer 3 inaccurate     | <!-- --> | Structurally clean SQON that does not answer the question.                                    |
| Layer 2 mismatch + Layer 3 accurate    | <!-- --> | Outside the fixture's equivalence class but semantically right; consider expanding the class. |

## Calibration evidence

:::info
**Why calibration is non-negotiable.** The LLM judge scores in are only admissible as a KPI if the judge agrees with human domain experts at κ ≥ 0.6 on a held-out sample. Without this check, the judge could be systematically wrong in a direction that is invisible from the numbers - for example, rating hallucinated field names as acceptable because the field name sounds plausible. If κ is below threshold, the judge must be replaced or re-prompted before the baseline is published. Judge-derived KPIs cited without calibration evidence are not defensible.
:::

### Layer 3 LLM-judge calibration

| Stratum               | Cohen's κ vs human | Accuracy vs human | N (records human-rated) |
| --------------------- | ------------------ | ----------------- | ----------------------- |
| Computational profile | <!-- -->           | <!-- -->          | <!-- -->                |
| Clinical profile      | <!-- -->           | <!-- -->          | <!-- -->                |
| Combined              | <!-- -->           | <!-- -->          | <!-- -->                |

Acceptance rule: combined κ ≥ 0.6. If below, judge model was replaced or re-prompted before the baseline run. Replacement history: <!-- PLACEHOLDER: "none" or list of attempts -->.

Judge model identity (held constant for re-baselining): <!-- PLACEHOLDER -->

### Inter-rater reliability (human raters)

| Pair                                     | Cohen's κ | N        |
| ---------------------------------------- | --------- | -------- |
| Reviewer A vs Reviewer B (computational) | <!-- -->  | <!-- --> |
| Reviewer A vs Reviewer B (clinical)      | <!-- -->  | <!-- --> |

### Human-rated subset

- Subset size: <!-- approx 10% --> records
- Record IDs: <!-- PLACEHOLDER: path to id list, so Aim 2 can extend the same subset -->
- Rating rubric version: <!-- PLACEHOLDER -->

## Caveats and interpretive notes

:::info
**Why these are mandatory, not optional.** These caveats are load-bearing. The TUI finding names a specific client, not a modality - citing it as a modality finding would misinform the Aim 2 interface design. The single-deployment caveat prevents the baseline from being treated as a general claim about Overture. Removing any caveat when excerpting or citing this report changes the meaning of the evidence and invalidates the citation.
:::

These must remain when this report is excerpted, cited, or republished.

- **Off-the-shelf TUI caveat (R2).** All findings refer to the specific TUI client used (<!-- PLACEHOLDER: opencode-ai vX.Y.Z -->), not "TUI" as a modality. Aim 2's purpose-built client requires a fresh baseline.
- **Single-deployment caveat (R4).** All findings describe the Drug Discovery Portal subset at the catalogue release(s). They are not inferential about other Overture deployments.
- **Sample-size caveat (R6).** All comparisons are descriptive. No p-values are reported; bootstrap CIs are descriptive of the observed sample only.
- **`analyze_arranger` execution caveat (R11).** Generated code was reviewed offline; end-to-end execution is deferred to Aim 2.
- **Pseudoreplication caveat (R13).** Where the same researcher contributed multiple turns, participant-level rates are reported alongside turn-level rates.

Additional caveats that emerged during this run: <!-- PLACEHOLDER: "none" or list -->

## Reproducibility

:::info
**Why a one-command reproduction matters.** A baseline that can only be reproduced by the person who ran it is not a baseline - it is a snapshot. The single command here lets anyone with the pinned versions reproduce the offline benchmark from scratch. The human pilot cannot be automated, but the documented procedure here means Aim 2 can run a fresh cohort under the same protocol and produce a valid comparison.
:::

### One-command reproduction

```sh
<!-- PLACEHOLDER: e.g. make baseline -->
```

This command runs the offline benchmark (§6.2 of source plan) end-to-end against the pinned versions in §1. Approximate runtime: <!-- PLACEHOLDER: hours -->. Approximate cost (commercial model only): <!-- PLACEHOLDER: USD -->.

### Re-running the human pilot

Procedure documented at: <!-- PLACEHOLDER: path to pilot-protocol.md -->. Required artefacts for a faithful re-run:

- Same task taxonomy, with new A/B task instances if the published instances have leaked.
- Same survey instruments (Appendix B of source plan).
- Same observer rubric (Appendix B.3 of source plan).
- Stress-task injection capability.

### Artefact index

| Artefact                                | Location                                                                           | SHA-256  |
| --------------------------------------- | ---------------------------------------------------------------------------------- | -------- |
| QueryRecord NDJSON (model selection)    | <!-- PLACEHOLDER: links to shortlist log produced by 02-Model-Selection.md run --> | <!-- --> |
| QueryRecord NDJSON (offline benchmark)  | <!-- -->                                                                           | <!-- --> |
| QueryRecord NDJSON (human pilot)        | <!-- -->                                                                           | <!-- --> |
| QueryRecord NDJSON (adversarial probes) | <!-- -->                                                                           | <!-- --> |
| `analyze_arranger` review bundle        | <!-- -->                                                                           | <!-- --> |
| Survey response bundle                  | <!-- -->                                                                           | <!-- --> |
| Observer notes bundle                   | <!-- -->                                                                           | <!-- --> |
| System prompt body                      | <!-- -->                                                                           | <!-- --> |
| `cdd-eval` CLI binary or commit         | <!-- -->                                                                           | <!-- --> |

## Risk register outcomes

:::info
**Why close out the risk register.** The risk register in the source plan identified specific threats to the evaluation's validity before the run began. This section records what actually happened to each one. The most critical is R1: if any adversarial probe succeeded in bypassing the consent gate, that must be documented here and escalated before Aim 2 begins - the platform's primary safety claim would be unresolved.
:::

For each risk, record what actually happened.

| ID  | Risk                                      | Outcome at sign-off                   | Action taken |
| --- | ----------------------------------------- | ------------------------------------- | ------------ |
| R1  | OD-1 bypassable by adversarial input      | <!-- e.g. "0/20 probes succeeded" --> | <!-- -->     |
| R2  | TUI client conflated with modality        | <!-- -->                              | <!-- -->     |
| R3  | Pilot transcripts feed back into fixtures | <!-- -->                              | <!-- -->     |
| R4  | Single deployment, no generalisation      | <!-- -->                              | <!-- -->     |
| R5  | Researchers ask LLM-friendly questions    | <!-- -->                              | <!-- -->     |
| R6  | Small N                                   | <!-- -->                              | <!-- -->     |
| R7  | Carryover learning between sessions       | <!-- -->                              | <!-- -->     |
| R8  | Catalogue value drift                     | <!-- -->                              | <!-- -->     |
| R9  | LLM-judge bias undetected                 | <!-- -->                              | <!-- -->     |
| R10 | Latency / cost skews model selection      | <!-- -->                              | <!-- -->     |
| R11 | `analyze_arranger` deferred from e2e      | <!-- -->                              | <!-- -->     |
| R12 | IRB / consent                             | <!-- -->                              | <!-- -->     |
| R13 | Pseudoreplication                         | <!-- -->                              | <!-- -->     |

## Citation block

:::info
**Why a citation block.** Aim 2 will compare its results against this baseline. The citation block gives Aim 2 a stable, versioned reference to use so that "compared to Aim 1" is unambiguous - it refers to a specific version of this document at a specific SHA-256, not to "whenever Aim 1 happened." The version table tracks updates, so readers can tell whether they are comparing against the original sign-off or a revised run.
:::

Recommended citation form for Aim 2 work referring to this baseline:

> <!-- PLACEHOLDER: e.g. "Prelude Aim 1 Baseline, version 1.0.0, sign-off 2026-08-31, SHA-256 ..." -->

When this baseline is updated, increment the version and record the change here:

| Version | Date     | Change            |
| ------- | -------- | ----------------- | --- |
| 1.0.0   | <!-- --> | Initial sign-off. | s   |
|         |          |                   |

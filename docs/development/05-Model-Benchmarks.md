# Model Benchmarks

Determine which locally-deployable language models can reliably translate a researcher's plain-language question into a valid structured query against an Overture Arranger catalogue, and recommend a deployable model for each target environment. The output of the work is a **defensible, reproducible basis for a deployment decision** not a one-off score.

The evaluation must answer three questions:

1. **Feasibility:** can candidate models run within the defined hardware envelopes at acceptable latency and memory?
2. **Accuracy:** can they produce valid queries: correct fields, legal operators, no hallucinated schema, stable across repeated runs?
3. **Safety:** does the system hold up under adversarial pressure.

A defensible baseline answering these is expected prior to our user testing during the month of **August 2026**.

## Background

The platform turns a sentence such as _"show me all breast cancer samples with RNA-seq data from Canadian donors"_ into a structured query that returns the right records, with no query-syntax knowledge required of the researcher. The technical task is _natural language in, structured query out_ closest in spirit to text-to-SQL, but the target is an Overture Arranger query rather than SQL.

## Scope

**In scope.** Single-turn query generation: one self-contained natural-language question → one structured query. A "query" has three components, all of which are in scope, a **SQON filter** (which records), a **GraphQL field selection** (which fields), and an optional **GraphQL aggregation** (a summary, when the question implies one).

**Out of scope.** Multi-turn / conversational refinement; visualization and downstream analysis of returned records; and execution performance of the Arranger search service itself (e.g. measuring records returned by arranger).

:::note
Although multi-turn and later capabilities are out of scope _for this evaluation_, the solution is expected to be reusable for them downstream.

## Functional requirements

Methods are open however the evaluation must do the following:

| ID     | Requirement                             | What the evaluation must do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** | Rank candidates per environment         | Rank candidates within a fixed environment that reflects a real-world hardware envelope (§5), under identical, documented conditions.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **F2** | Score the generated query, by component | Cover all three query components and report them separately, so a result tells you _which part of the query_ a model gets wrong, not just pass/fail.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **F3** | Measure across difficulty               | Results must be readable across the range of query difficulty seen in production — both _operation_ difficulty (simple predicate → nested boolean → negation) and _schema_ difficulty, which spans the catalogue complexity gradient from the flat drug-discovery catalogues (shallow, top-level fields) to the nested ICGC-ARGO mock data (donor→specimen→sample nesting), including questions that span catalogues. The two axes must be separable so a failure can be attributed to one or the other.                                                                                  |
| **F4** | Measure hallucination resistance        | Test what a model does when a question asks for something for which no catalogue exists and or the catalogue cannot answer, a field, value, or relationship that does not exist in the schema. The failure mode is confabulation: emitting a confident, well-formed query against an invented field rather than admitting the request cannot be met (e.g. inventing a `tumour_grade` filter when no such field exists). The correct behaviour is to refuse or flag the request, and the evaluation must include impossible requests specifically to measure how often each model does so. |
| **F5** | Measure stability                       | Compare repeated runs of the same input, so unstable candidates are flagged rather than rewarded by a lucky single run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **F6** | Recommend, with evidence                | Deliver a recommendation backed by the ranking, the per-component and per-difficulty breakdown, the stability evidence, and the feasibility measurements.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Hardware constraints

The system targets two environments, but they are **not weighted equally**. The institutional tier is the primary deployment target and where a deployable model must be found. We expect the workstation tier to be infeasible at acceptable accuracy within its memory ceiling; the goal there is not to find a winner but to **establish that infeasibility with evidence:** documented results showing where and why workstation-class models fall short.

| Tier              | Hardware                                              | Memory ceiling   | Role                                                                 |
| ----------------- | ----------------------------------------------------- | ---------------- | -------------------------------------------------------------------- |
| **Institutional** | Single- or multi-GPU server (A100/H100 class)         | ≥80 GB GPU       | **Primary target.** Shared / HPC-backed deployments.                 |
| **Workstation**   | Apple-silicon laptop/desktop (M3/M4 Pro or Max class) | 16–24 GB unified | Feasibility test only — expected to fail; document the evidence why. |

The two tiers differ enough in capacity that they will not necessarily land on the same model, the same quantization, or the same serving runtime. The design must treat them as separate evaluation contexts that nonetheless share one methodology and one results format.

:::note
**Frontier model as a sanity check.** A frontier (commercial) model is not a deployment candidate, data sovereignty rules it out, but it can be run once as an upper-bound check on the **system and the fixtures themselves**, not on the local models. It is the strongest model available: if it cannot produce correct queries against a fixture, the problem is almost certainly the fixture (ambiguous prompt, wrong reference answer) or the system/harness, not model capability. This validates the test bed before any local candidate is judged against it. If the system fails to work even with a frontier model, there is no reason to expect the local envelopes to fare better.
:::

## Data constraints

| ID  | Constraint | Detail |
| --- | ---------- | ------ |

| **D1** | Introspection is pinned and reproducible | Arranger exposes its own schema (fields, types, legal operators) via introspection, the introspection endpoint used should be static, tracked and retrievable by its commit hash for future testing. Every evaluation must be reproducible using the exact fixture, data and introspection context used. |
| **D2** | Catalogues span a complexity gradient | The corpus must exercise both flat catalogues (drug-discovery data: top-level fields, shallow queries) and nested catalogues (ICGC-ARGO mock data: donor→specimen→sample nesting, multi-level queries), including questions that span catalogues. Gathering ARGO mock data is a prerequisite work item. |
| **D3** | Test data is synthetic | Specifically for ARGO data the Evaluation uses mock/synthetic data; no real donor records are required to run the evaluation. |

## Quality requirements & acceptance criteria

This is the requirement most likely to be cut corners on, so it is stated explicitly.

| ID     | Requirement                            | Detail                                                                                                                                                                                                                                                         |
| ------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** | Define a scoring metric and justify it | The evaluation needs a primary correctness metric and a rationale for why it measures the right thing.                                                                                                                                                         |
| **Q2** | Pre-register acceptance thresholds     | Deployability must be decided against **explicit thresholds set before results are seen**. A model is a candidate for deployment only if it clears them.                                                                                                       |
| **Q3** | Gate the dimensions that matter        | At minimum, the acceptance criteria must cover: structural validity (does it parse), field/operator legality (no hallucinated or mistyped fields), correctness per query component, hallucination resistance on impossible requests, and run-to-run stability. |

## Non-functional requirements

### Reproducibility & determinism

Model outputs are inherently probabilistic, so exact reproduction cannot be guaranteed. Everything around the model, however, must be. Each run must use documented settings, and every record/telemetry entry must capture the full set of inputs that shaped its output (model, quantization, runtime, prompt, schema snapshot, and sampling configuration) recorded in plain, readable form so a third party can reconstruct and re-run it.

### Reusability

The harness, the record/telemetry format, and the test corpus must be a **reusable substrate**, not a throwaway script. Two downstream activities will build on them: ongoing **system/regression testing** and our **user-testing pilot** capturing real researcher sessions.

:::note
One challenge here is accommodating the no-ground-truth case without forking the record/telemetry schema. Model selection and regression testing both score against a reference answer; a real user question has none, so correctness is undefined and a behavioural signal (did the researcher accept, edit, reject, or reformulate) must stand in. The same record/telemetry format ideally carries both cases rather than splitting into two.
:::

### Timeline

The baseline is prior to user testing being done during **August 2026**.

## LLM Candidate admissibility

Models considered for deployment must be **open-weights** (downloadable, runnable on local hardware), recent, plausibly capable at structured-query generation, and able to fit a target envelope.

Commercial/frontier API models are **not** deployment candidates, data sovereignty forbids sending data off-site. A frontier model may be used in a non-deployment, offline support role (e.g. validating the test set), but must not participate in the ranking.

## Stakeholders & users

- **End users:** OICR Genome Informatics + Drug Discovery researchers. The pilot population for user testing is approximately eight researchers.
- **Success from their side** is behavioural, not just metric-based: does a researcher accept, edit, reject, or reformulate the generated query, and does it run?

## Constraints & assumptions to validate early

These are known risks. The design should resolve or explicitly accept them up front rather than discover them late.

**Schema context budget.** The introspection schema is sent to the model on every request and competes with the question for context-window space. The workstation tier's viability depends on the schema fitting the smallest target context budget. Establish early, whether it does; if not, define the mitigation (a compact schema representation, or restricting candidates to context-tolerant ones).

## Expected deliverables

1. A ranked comparison with the per-component, per-difficulty, hallucination-resistance, stability, latency, and memory breakdown behind the ranking.
2. A deployment recommendation, with its acceptance-criteria status.
3. A frozen test corpus (each case carrying its reference answer and the schema version it was authored against).
4. The reusable evaluation system including harness, scorers, and the shared record/telemetry format usable by the downstream regression and pilot activities.
5. Documentation of the methodology and its tradeoffs, sufficient for a third party to reproduce the results and trust the recommendation.

## Pending Decisions

Explicitly the architect's call, bounded by the requirements above:

- **Scoring methodology:** how correctness is computed
- **Corpus design:** number, sourcing, and structure of test cases.
- **Harness architecture:** how one methodology drives multiple model runtimes/backends.
- **Record/telemetry schema:** the shape of the per-call record/telemetry entry, how provenance is pinned, how the no-ground-truth case is represented.

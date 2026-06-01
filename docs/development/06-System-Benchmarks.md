# System Benchmarks

Determine whether the **assembled MCP pipeline**, not the model in isolation, still produces correct queries after any one part of it changes: the MCP definitions or the search API itself. The output is a **repeatable release gate** that tells us, on every change, whether query generation through the live system still works.

This is the validation layer the grant names directly as a mitigation: _"implement a validation layer comparing LLM outputs against known-good queries"_.

The evaluation must answer four questions:

1. **Correctness:** does the assembled pipeline build the right query end-to-end.
2. **Contract integrity:** do the pipeline's components honour their protocol contract (tool discovery, message format, error propagation) rather than failing silently?
3. **Data sovereignty:** does any record-level data ever leave secure infrastructure on its way to the model?
4. **Attribution:** when something breaks, can the failure be localised to the stage that caused it?

## Background

The platform turns a sentence such as _"show me all breast cancer samples with RNA-seq data from Canadian donors"_ into a structured query. [Model evaluation](./05-Model-Benchmarks.md) tests that translation with the model **in isolation**: prompt in, query out, no execution. System testing tests the same translation with the model **embedded in the live MCP pipeline**, end to end, through to the real catalogue. The model no longer emits a raw text query; it produces its query _through MCP tool calls_, so the tool schemas and the GraphQL wrapper around the search API are now part of what can break.

The three discovery activities differ only in what they hold as ground truth:

| Activity                      | Tests                       | Ground truth                       | Gates                 |
| ----------------------------- | --------------------------- | ---------------------------------- | --------------------- |
| Model evaluation              | the model in isolation      | reference query (no execution)     | pilot selection       |
| **System testing (this doc)** | the assembled MCP pipeline  | reference query **+ live records** | integration / release |
| User testing                  | real researchers on the GUI | none (behavioural signal)          | next priorities       |

## Scope

**In scope.** The headless MCP pipeline, end to end: the MCP client, the model, the Search API MCP server (its GraphQL wrapper and tool definitions), and execution through to the live catalogue.

**Out of scope.** Deep automated GUI end-to-end testing (rendering, session state, streaming); the GUI is validated by humans in user testing, not by an automated correctness suite.

:::note
The suite is expected to reuse as many components from the model-evaluation as appropriate (the same fixture corpus, the same query-equivalence scorers, the same record/telemetry format), not stand up a second harness. The only thing that changes is _what is scored_: the pipeline's output rather than the model's raw output.
:::

## Functional requirements

Methods are open; the evaluation must do the following:

| ID     | Requirement                    | What the evaluation must do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **F1** | Test the assembled pipeline    | Exercise the live, end-to-end pipeline, not the model alone. The thing under test is the query that actually reaches the catalogue after passing through the client, the model, and the MCP server.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **F2** | Attribute failures to a stage  | When a fixture fails, localise the cause to a pipeline stage (client routing, model generation, tool call, execution).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **F3** | Verify the protocol contract   | Independently of query correctness, check that components honour their contract: tool discovery/handshake, schema validation, and error propagation (a malformed call yields a structured error, not a silent drop or a crash).                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **F4** | Separate drift from regression | When a fixture starts failing, tell apart two very different causes. **Drift:** the catalogue's schema changed (a field was renamed or removed), so the fixture's reference is now stale and needs updating; nothing is actually broken. **Regression:** the schema is unchanged, but the pipeline got worse, which is a real defect to fix. The study must distinguish them by comparing the catalogue's current schema against the snapshot the fixture was pinned to: if the schema moved, it is drift; if it did not, it is a regression. Without this check, a harmless schema update and a genuine bug look identical, both just "the fixture failed." |
| **F5** | Verify determinism             | At the deterministic settings used for evaluation, confirm the pipeline is stable across repeated runs of the same input, and localise any instability to the stage where it leaked in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## System under test

The testing environment is the **headless pipeline** (client → model → Search API MCP server → Arranger server). The GUI host is **not under test** here. Its only relevance here is that the pipeline emits telemetry logs that are carried forward to aid [user testing](./07-User-Testing.md).

| Surface                   | Boundary                                                    | Role                                                                        |
| ------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Headless MCP pipeline** | MCP client + model + Search API MCP server + live catalogue | **The SUT.** Fully exercised; all correctness gates apply.                  |
| **GUI host**              | The conversational front-end                                | Out of scope; relevant only as a source of telemetry logs for user testing. |

## Data constraints

| ID     | Constraint                              | Detail                                                                                                                                                                                                                    |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | Reuse the model-eval corpus and scorers | The regression corpus is the model-evaluation fixture set with its reference queries and difficulty tags; correctness reuses the same query-equivalence scorers. The suite inherits both their coverage and their limits. |
| **D2** | Introspection is pinned                 | Fixtures pin the introspection snapshot they were authored against, so drift can be detected (F4) and a live schema can be compared to the pinned one before blame is assigned.                                           |

## Non-functional requirements

### Observability & log alignment

A failure is only useful if it is debuggable. A single trace identifier must be **propagated through every stage** (client → server → catalogue) and logged by each, so the harness record joins the client, server, and catalogue logs by id rather than by timestamp. Because the record/telemetry format may be shared across all three activities, a system-test regression and a user-testing complaint must be correlatable on the same keys (model, prompt-template version, introspection snapshot).

## Expected deliverables

Outcomes, not implementations:

1. A regression suite that runs the fixtures through the live pipeline and returns query-equivalence metrics.
2. A drift detector that separates schema movement from genuine regression.
3. One identifier linking harness, client, server, and arranger logs.

# User Testing

User Testing is the human-in-the-loop pilot that captures what automated scoring cannot: does the model capture researcher intent, does the user trust the plain-language summary enough to confirm, and when the model gets it wrong, how costly is recovery? It is also the only workstream where the system runs end-to-end against real researchers with real questions.

## Study Design

**8 researchers × 2 sessions × 6 tasks = 96 task instances**, within-subjects, counterbalanced by interface and task order. Within-subjects is necessary at small N; counterbalancing controls for order effects.

### Stratification

| Dimension          | Levels                                                                                                   | Why                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Interface          | Conversational UI; Facet Search UI (existing)                                                            | Within-subjects baseline against the existing facet search UI; isolates the value the conversational interface adds |
| Researcher profile | Bioinformatician (8 participants)                                                                        | Single profile in Aim 1; cross-profile comparison deferred to Aim 2                                                 |
| Task category      | Single-field filter; multi-field AND/OR; negation/exclusion; multi-step logic; out-of-scope; stress task | Coverage of the SQON operator surface; explicit refusal/clarification testing                                       |

Each participant completes 2 sessions: one using the conversational UI and one using the facet search UI, with session order counterbalanced between participants (Latin square). The same 6 tasks are completed in each session, ensuring within-subject comparability. This yields 48 task instances per interface (8 × 1 × 6) and 96 total.

The MCP server is exercised over both HTTP+SSE (via LM Studio) and stdio (via off-the-shelf TUI client, candidate `opencode-ai`) during the conversational sessions as part of the deliverable. Transport is recorded in each `QueryRecord.clientIdentity` but is not a stratification dimension in Aim 1 — broader transport comparison is Aim 2 work.

### Pre-Pilot Gate

The pilot does **not** open until:

- All 10 Safety Regression adversarial probes report zero unauthorised executions (see [Regression Testing](./05-Regression-Testing))
- An internal dry-run against 4 architect-supplied tasks completes without confirmation-gate failure
- The pilot model from [Model Selection](./04-Model-Selection) has cleared the ≥95% execution-equivalence gate

This is a hard gate — slipping it delays the pilot rather than weakening the criterion.

## Instrumentation

Each session captures:

| Stream                                    | Source                                  | Format                                    |
| ----------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Per-turn `QueryRecord`                    | MCP server log writer                   | NDJSON v1.1.0                             |
| Generated SQON + executed query arguments | Per `QueryRecord`                       | JSON in record                            |
| Plain-language confirmation summaries     | Captured in `confirmationSummary` field | String in record                          |
| Post-task survey                          | Google Forms or equivalent              | CSV, joined on `participantId` + `taskId` |
| Observer rubric                           | Architect or PM, real-time              | Markdown + structured fields              |

Provenance pinned per record: `modelId`, `mcpServerVersion`, `sqonPackageVersion`, `systemPromptHash`, `userPrompt`, `catalogDataRelease`, `samplingParams`, `clientIdentity`, `sessionMetadata.profile`, `sessionMetadata.participantId`.

## Headline KPIs from the Pilot

| KPI                             | Definition                                                                                                                                                                                                                                                                                                                                                                         | Stratified By                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Task completion rate            | Tasks where the participant accepted a final SQON (conv) or applied a final filter (facet)                                                                                                                                                                                                                                                                                         | Interface (both strata)               |
| Turns to first approved query   | Median turn count from initial question to first `confirmationOutcome: approved`                                                                                                                                                                                                                                                                                                   | Conversational UI only                |
| Per-turn structural validity    | % of turns with Layer 1 pass                                                                                                                                                                                                                                                                                                                                                       | Conversational UI only                |
| Per-attempt structural validity | % of `attempts[]` entries passing Layer 1 (raw LLM behaviour, not researcher experience)                                                                                                                                                                                                                                                                                           | Conversational UI only                |
| Hallucination rate by category  | Fabricated fields / values / operators / catalogues per 100 turns                                                                                                                                                                                                                                                                                                                  | Conversational UI only                |
| Confirmation-gate compliance    | Unauthorised executions during pilot sessions                                                                                                                                                                                                                                                                                                                                      | Conversational UI only — **Must = 0** |
| Perceived intent fidelity       | Survey 5-point Likert, "the summary matched what I meant"                                                                                                                                                                                                                                                                                                                          | Conversational UI only                |
| Recovery effort                 | Median turns between a rejected confirmation and the next approved query                                                                                                                                                                                                                                                                                                           | Conversational UI only                |
| Confirmation summary fidelity   | Post-task survey: did the plain-language summary accurately reflect what the researcher intended? (5-point Likert) Captured per-turn in `confirmationSummary`; rated per-task via survey. Earlier signal than single-judge review.                                                                                                                                                 | Conversational UI only                |
| Result relevance                | Post-task survey: did the records returned match what you were looking for? (5-point Likert, per-task). Distinct from summary fidelity — a plausible-sounding summary can be confirmed yet still return the wrong record set if the model misinterpreted the query. This is the only pilot KPI that directly probes semantic correctness of the result, not the description of it. | Conversational UI only                |

:::note
The facet search stratum is the within-subjects baseline for task completion rate only. The conversational UI produces SQON via LLM, surfaces a confirmation summary, and supports multi-turn refinement; the facet UI has no LLM, no summary, and no notion of "turns." All KPIs that depend on those mechanics are conversational-only by construction. See [Evaluation Plan §4 note](./03-Evaluation-Plan#4-pilot-results-stratified-by-interface).
:::

<!-- Pilot recruitment plan, task catalogue with exact prompts, survey instruments, observer rubric template, and analysis pipeline to follow. -->

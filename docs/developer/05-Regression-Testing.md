# Regression Testing

Regression Testing is the continuous CI/CD suite that runs against the two finalist models selected in [Model Selection](./04-Model-Selection). It exists for one purpose: to detect when a change to the model, system prompt, MCP server, SQON schema, or catalogue introspection breaks behaviour that previously passed the selection gates. The suite is deliberately a re-run of those gates — same 5-metric rubric (Intent Capture, Field Validity, Operator Correctness, Structural Compliance, Output Stability), same ≥95% execution equivalence threshold, same LLM-as-judge protocol (Claude Opus 4.7, `temperature=0`) — so a regression is defined as "a finalist no longer clears a bar it already cleared."

It has two sub-suites:

- **Correctness Regression** — 15 reference prompts with ground-truth SQON outputs scored against the 5-metric rubric and the ≥95% execution equivalence gate. This is a tight smoke test, intentionally smaller than the 100-query test set used in Phase 3 of Model Selection so it runs on every PR without dominating CI time.
- **Safety Regression** — 10 adversarial probes targeting mandatory confirmation-gate bypass. Binary pass/fail; any direct execution without user approval is a critical system failure (see Key Decisions in [Evaluation Plan](./03-Evaluation-Plan)).

:::note
**How execution equivalence is measured in CI:** for each Correctness Regression prompt, the candidate's generated SQON is executed against the Arranger API alongside the pinned reference SQON, and the two record sets are compared for exact match (record IDs and counts). The run's execution equivalence score is the percentage of prompts where the sets match (e.g., 14/15 = 93.3%). The ≥95% threshold is the same gate Phase 3 of Model Selection applied to clear finalists, so a CI dip below it means the deployed model has regressed past its own selection bar — by definition a release blocker.
:::

Baselines, ground-truth SQON, and provenance metadata (Model ID, MCP version, SQON schema version, system prompt hash, catalogue release version) are inherited from Model Selection and pinned per run, so any CI failure can be traced to a specific upstream change. Sign-off contribution: ≥95% execution equivalence on Correctness Regression for both finalists, and zero failures on Safety Regression.

<!-- Detailed test fixtures, CI harness wiring, and the `make eval` target to follow as the MCP server reaches integration readiness. -->

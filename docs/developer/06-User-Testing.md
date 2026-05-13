# User Testing

User Testing is the human-in-the-loop pilot that validates whether the system actually serves researchers — not just whether it produces schema-valid SQON. Where [Regression Testing](./05-Regression-Testing) re-runs the selection gates in CI, this pilot answers the questions automated scoring cannot: does the model capture what the user _meant_, does the user trust the plain-language summary enough to confirm, and when the model gets it wrong, how costly is the recovery?

The study recruits **8 researchers × 12 tasks each** drawn from realistic data-discovery workflows across the active catalogues. Each session captures:

- Full conversation histories (turn-by-turn prompts, model responses, confirmation events)
- The generated SQON for every executed query and the resulting record counts
- Post-task surveys covering perceived accuracy, trust in the summary, and effort to reach the intended result
- Structured usage logs (latency, retries, abandoned queries, edits to model-proposed SQON)

These streams let us measure intent capture, trust calibration, and recovery cost directly, and produce a citable baseline that complements the automated suite. Provenance is pinned per session using the same metadata as Regression Testing (Model ID, MCP version, SQON schema version, system prompt hash, catalogue release version) so pilot results remain comparable to CI baselines and to future runs.

Sign-off contribution: a citable baseline derived from pilot transcripts, SQON, surveys, and logs, regenerable from raw artefacts. Pass/fail thresholds for the qualitative dimensions are to be set during pilot design once the MCP server reaches integration readiness.

<!-- Pilot recruitment plan, task catalogue, survey instruments, and analysis pipeline to follow. -->

# Evaluation Plan

We want to establish, measure, and publish a defensible baseline for the Aim 1 conversational-discovery capability by **August 31, 2026**. The evaluation answers three core questions about translating natural language into structured queries that retrieve relevant datasets.

1. **Feasibility:** How do local models run, for our use cases, within well defined hardware constraints?
2. **Accuracy:** Can we produce valid queries with no hallucinated fields, valid filter operators, and stable outputs across repeated runs?
3. **Usefulness:** Does the system clear safety gates under adversarial pressure, and does it serve real researchers in a controlled pilot?

Our evaluation plan is divided into three workstreams:

1. **[Model Selection](./05-Model-Benchmarks.md):** A benchmark of 6 local LLM candidates, three per deployment, run against a standardized fixture set at deterministic settings. This produces a reproducible ranking under identical conditions and selects one pilot model per tier. A single commercial frontier model is run once to sanity-check the fixtures; it does not participate in the ranking. See Model Selection for the full protocol.

2. **[System Testing](./06-System-Benchmarks.md):** An automated regression protocol that exercises the assembled MCP stack end-to-end on every release, detecting when a change on our side degrades accuracy, refusal reliability, token efficiency or latency. Because the model is ranked offline in Model Selection, this is what separates platform-level (system) regressions from model capability. It includes a safety suite that re-runs the adversarial probes end-to-end and flags any regression in refusal behaviour against the baseline. See System Testing for the full protocol.

3. **[User Testing](./07-User-Testing.md):** A pilot study of approximately 8 OICR Drug Discovery researchers capturing full conversation histories, session logs, and post-task surveys. Recruitment, protocol, and analysis plan are detailed in User Testing.

The three activities differ only in what they hold as ground truth:

| Activity                      | Tests                       | Ground truth                       | Gates                 |
| ----------------------------- | --------------------------- | ---------------------------------- | --------------------- |
| Model evaluation              | the model in isolation      | reference query (no execution)     | pilot selection       |
| **System testing (this doc)** | the assembled MCP pipeline  | reference query **+ live records** | integration / release |
| User testing                  | real researchers on the GUI | none (behavioural signal)          | next priorities       |

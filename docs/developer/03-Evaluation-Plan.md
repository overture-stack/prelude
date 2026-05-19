# Evaluation Plan

We are want to establish, measure, and publish a defensible baseline for the Aim 1 conversational-discovery capability by **August 31, 2026**. The evaluation answers three core questions about translating natural language into structured queries that retrieve relevant datasets.

1. **Feasibility:** How do local models run, for our use cases, within researcher hardware constraints?
2. **Accuracy:** Can we produce valid queries with no hallucinated fields, valid filter operators, and stable outputs across repeated runs?
3. **Usefulness:** Does the system clear safety gates under adversarial pressure, and does it serve real researchers in a controlled pilot?

Our evaluation plan is divided into three workstreams:

1. **Model Selection**: A benchmark of 6 local LLM candidates and 1 commercial frontier baseline run against a standardized fixture set. This produces a deterministic ranking of candidates under identical conditions to inform LLM capability recommendations and identify our pilot model. See [Model Selection](./04-Model-Selection) for the full protocol.

2. **Regression Testing**: An automated evaluation protocol to detect when updates break or degrade functionality. This separates system-level failures from model capability and includes a safety regression suite of adversarial probes that must report zero unauthorised executions prior to release. See [Regression Testing](./05-Regression-Testing) for the full protocol.

3. **User Testing**: A pilot study of ~8 researchers capturing full conversation histories, session logs, and post-task surveys. Recruitment, protocol, and analysis plan are detailed in [User Testing](./06-User-Testing).

# Evaluation Plan

This page outlines our plan to establish, measure, and publish a defensible baseline for our application by **August 31, 2026**. The goal is to establish a comprehensive benchmark balancing **latency, cost, and strict data privacy constraints**.

The evaluation answers three core questions:

1. **Compliance:** Which models meet hardware and privacy constraints?
2. **Performance:** Which models deliver the best accuracy, instruction-following, and lowest hallucination rates?
3. **Value:** Which model provides the best quality-to-cost ratio for production use?

## Functional Scope

The system is evaluated on translating natural language into **Serializable Query Object Notation (SQON)** using a multi-tier testing framework:

1. **Automated Benchmarking:** 15 reference prompts with predefined ground truth outputs tested against 3 candidate models. This will serve as the baseline for SQON generation accuracy comparison.

2. **Automated Adversarial Probe Testing (10 tests):** designed to trigger safety failures. For example, attempts to bypass required consent before execution. Any direct execution without approval is a critical system failure.

3. **Pilot Task Evaluation (96 test cases)** using 8 researchers × 12 tasks each to measure real-world user behavior. Each test case will include a log of the full conversation history and a final survey for feedback.

:::Info
Items 1 and 2 are functional tests, and will run as part of our CI/CD pipeline.
:::

## Key Decisions

1. **Structural Scoring (SQON-Focused):** For this phase we are not using traditional text similarity metrics as our outputs are structured JSON objects. We will use **execution equivalence:** to validate whether query outputs match our reference result sets. Additionally we will implement **semantic tree edit distance (STED)** to measures hierarchical JSON similarity.

2. **Zero Tolerance model on confirmation-gate bypasses:** The model must always produce a **plain-language summary before any execution**. As such direct tool execution without user confirmation is not allowed. Any bypass attempt during adversarial tests will be classified as a **critical system failure**.

3. **Provenance Pinning:** Every evaluation record is fully traceable via logged metadata including, Model ID, MCP version, SQON schema version, System prompt hash, Catalogue release version. This ensures any performance change can be traced to a specific system modification.

## Hardware Envelope

Model performance is evaluated across a defined set of compute environments representing local development, institutional-scale compute, and cloud deployment. This ensures benchmarking reflects realistic constraints in latency, cost, memory limits, and deployment flexibility.

| Infrastructure Profile | Hardware           | Memory / VRAM                      | Feasible Model Sizes                                            |
| ---------------------- | ------------------ | ---------------------------------- | --------------------------------------------------------------- |
| Local Deployment       | Apple M4 / M5      | 28–64 GB Unified                   | 7B–14B (excellent), 32B (heavy quant / swap), 70B (slow / swap) |
| Institutional Server   | NVIDIA A100        | 40–80 GB HBM2e                     | 7B–32B (trivial), 70B (viable via multi-GPU), MoE (stable)      |
| Cloud GPU Instance     | L40S / H100 / B200 | 48–80+ GB VRAM (per GPU, scalable) | 70B (excellent via FP8), MoE (high-concurrency multi-GPU)       |
| Managed API            | Claude 4.6 / GPT-5 | N/A (abstracted)                   | Frontier-class (70B–1T+ equivalent)                             |

## Sign-Off Criteria

A successful evaluation requires:

- A **citable baseline document** with core KPIs documented
- A **zero-failure report** for the confirmation-gate adversarial tests
- Full **hardware specification mapping** for realistic deployed models
- **Complete reproducibility**, all automated testing results can be regenerated via `make eval` using raw logs

# Model Selection & Optimization

Following the framework established by [Wada et al. (2026)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12894992/), we will employ a progressive screening process to identify optimal local LLMs. We will evaluate a panel of candidates against a performance "ceiling" set by frontier cloud models. We do not view model selection as a one-time decision, but as an iterative cycle. Our goal is to systematically identify models that align with the AI-assisted workflows we are building and the hardware constraints of prospective users, then apply targeted optimizations to narrow the reasoning gap between local and frontier models.

### Selection Criteria

Candidates are selected based on three primary dimensions to ensure a defensible baseline:

1. **Architectural Diversity:** Models spanning 3B to 70B+ parameters, both dense and MoE. This identifies the best accuracy-to-latency tradeoff at each hardware tier and tests whether MoE efficiency gains justify the added complexity.

2. **Specialization:** Models with strong reasoning and code generation. Must translate natural language into valid SQON with high intent-capture accuracy.

3. **Quantization Efficiency:** Must maintain ≥95% execution equivalence and ≥90% of unquantized accuracy under 4-bit and 8-bit quantization. This enables deployment on both researcher workstations (16–48 GB) for interactive use and multi-GPU HPC nodes (320+ GB) for batch analysis. Quantization is critical for local accessibility.

### Hardware Envelope

We evaluate models across two hardware tiers: **Workstation Tier** and **Institutional Tier**. These represent realistic deployment environments for research groups with varying computational resources.

**Workstation Tier (Local)**

The baseline evaluation target is a researcher running experiments on their own machine, a MacBook Pro M3/M4 Pro or Max, or an equivalent Linux workstation, with 16–48 GB of unified memory. This reflects the realistic minimum hardware available to a dry lab researcher or bioinformatician who does not have institutional compute.

At this tier, 4-bit quantized models up to 14B parameters run comfortably with acceptable latency. Models in the 27–32B range are feasible on 36–48 GB configurations using Q4_K_M quantization, though inference is noticeably slower. Models requiring more than ~40 GB at Q4 are impractical for interactive use on this tier.

:::note
**Quantization notation:** Q4 means storing model numbers in a smaller format—instead of using 32-bit precision, we use just 4 bits per weight, shrinking the model by about 8×. Q4_K_M is a variant (used by Ollama) that groups weights into blocks and stores adjustment factors for each block, preserving more detail than basic 4-bit and improving accuracy by 1–3 percentage points. On Workstation Tier hardware, Q4_K_M is the standard choice: a 27B model fits into ~17 GB, letting researchers run it interactively on their laptop with an estimated 10–15% speed penalty.
:::

**Institutional Tier (Multi-GPU HPC)**

A typical institutional HPC node configuration provides 4× NVIDIA A100 80GB (320 GB aggregate HBM2e), enabling multi-GPU inference of models up to approximately 150 GB at full precision, or larger MoE models via tensor parallelism and quantization.

At this tier, 70B dense models run without constraint. MoE architectures with large total parameter counts but low active parameters (e.g., 400B total / 17B active) are viable and efficient.

| Tier               | Hardware               | Memory           | Feasible Model Sizes                                                |
| ------------------ | ---------------------- | ---------------- | ------------------------------------------------------------------- |
| Workstation Tier   | Apple M3/M4 Pro or Max | 16–48 GB Unified | 7B–14B (comfortable), 27–32B (Q4 heavy quant), >40 GB (impractical) |
| Institutional Tier | 4× NVIDIA A100 80GB    | 320 GB HBM2e     | 32B–70B (trivial), MoE up to ~150 GB (multi-GPU), larger via quant  |

:::note
The Wada et al. study used a Mac Studio M3 Ultra with 512 GB of unified memory and Ollama for model management, enabling inference on models up to 67 GB without quantization. Their hardware represents an exceptional configuration. Our envelope is scoped to realistic research settings: a mid-range workstation for daily interactive use, or institutional HPC access for batch and large-model runs. This constraint makes 4-bit quantization a primary evaluation criterion. However, we can assess the feasibilibility of labs adopting dedicated compute for running LLMS (Eg. Mac Studio, NVIDIA DGX Spark, Dell Pro Max GB10).
:::

### Screening Phases

We will use a four-phase process (adapted from [Wada et al. (2026)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12894992/)) to narrow an initial pool of 15 candidates down to two models:

| Phase                    | Methodology                                                                             | Optimization Goal                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1. Baseline Screening    | Uniform minimal zero-shot testing across 15 candidates.                                 | Establish raw performance using Arranger introspection data.                           |
| 2. Prompt Optimization   | Applying Chain-of-Thought (CoT) and capacity-matched Few-Shot examples.                 | Determine which models possess the reasoning depth to handle multi-step SQON logic.    |
| 3. Hardware-Task Mapping | Evaluating top 4 candidates across both hardware tiers (Workstation and Institutional). | First measure execution equivalence; optimize latency vs. accuracy at each tier.       |
| 4. Finalist Optimization | Implementation of Self-Refine loops and iterative error correction.                     | Maintain ≥95% execution equivalence (gating threshold) while improving 5-point rubric. |

Phase 2 uses a **capacity-matched prompting** strategy adapted from Wada et al.: after Phase 1 scoring, candidates are split into two groups based on raw performance (above or below Q1 ≥ 84 points). High-performing models receive complex Chain-of-Thought instructions with multi-step SQON examples; lower-scoring models receive simplified, low-cognitive-load prompts targeting format compliance before accuracy. This prevents prompt complexity from masking a capable model's true ceiling and, as Wada et al. found, the simpler prompt often produces larger absolute gains in the lower group.

:::note
If a model consistently makes a specific mistake, like hallucinating a field name or misusing a combination operator, we do not discard it immediately. We first apply a targeted correction: a specific rule or example addressing that exact failure mode. A model is only eliminated if it remains unreliable after receiving clear corrective instructions.
:::

### Benchmark Evaluation Panel

Three commercial API providers serve as performance benchmarks, each configured with `temperature=0` and `top_p=1.0` for reproducibility. These models represent the most capable APIs available at the time of the evaluation and define our performance ceiling for comparison with local implementations.

| Classification       | Model              | GPQA Diamond | MMLU-Pro | Context Window |
| -------------------- | ------------------ | ------------ | -------- | -------------- |
| Frontier Proprietary | Claude Opus 4.7    | —            | —        | 1,000,000      |
| Frontier Proprietary | GPT-4.1            | —            | —        | 1,000,000      |
| Frontier Proprietary | Gemini 2.5 Pro     | —            | —        | 2,000,000      |
| Frontier Open-Weight | Kimi K2.5          | —            | —        | 256,000        |
| Frontier Open-Weight | Qwen 3.5-397B-A17B | —            | —        | 256,000        |
| Frontier Open-Weight | GLM-5              | —            | —        | 200,000        |

:::note
**Sampling parameters:** `temperature` controls randomness in token selection, 0 means deterministic (always pick the most likely next token), while higher values introduce variability. `top_p` (nucleus sampling) limits the model to tokens that make up the top cumulative probability, 1.0 considers all tokens, lower values focus on the most likely tokens only. We use `temperature=0` and `top_p=1.0` for benchmarking to ensure reproducible, deterministic outputs across runs, isolating model capability from sampling variability.
:::

### Candidate Panel

We are benchmarking 15 state-of-the-art LLMs, all available through Ollama v0.23+, an open-source platform for running LLMs locally. This ensures reproducibility across different research environments. The models represent diverse architectures from 3B to ~1T (MoE) parameters.

Phase 2 screening applies capacity-matched prompts to all models, evaluating performance using SQON-specific KPIs. Four models are selected for Phase 3 based on performance, stability, and absence of critical failures. Based on Wada et al., Phase 3 finalists are expected to achieve a composite Q1 score of ≥84 points — the threshold that separated high-performing candidates in their study and can guide our initial model selection.

| ID    | Model              | Classification     | Architecture | Total / Active Params | VRAM (Q4) | Publisher   | Description / Notes                                          |
| ----- | ------------------ | ------------------ | ------------ | --------------------- | --------- | ----------- | ------------------------------------------------------------ |
| LLM1  | Llama 4 Maverick   | Institutional Tier | MoE          | 400B / 17B            | ~24 GB    | Meta        | Balanced quality-to-resource ratio; SOTA vision capabilities |
| LLM2  | Llama 4 Scout      | Institutional Tier | MoE          | 109B / 17B            | ~12 GB    | Meta        | Extreme long-context optimization (up to 10M tokens)         |
| LLM3  | Qwen 3.5-397B-A17B | Frontier Benchmark | MoE          | 397B / 17B            | ~214 GB   | Alibaba     | Flagship coding and scientific reasoning model               |
| LLM4  | Qwen 3.5-122B-A10B | Institutional Tier | MoE          | 122B / 10B            | ~72 GB    | Alibaba     | High-throughput engineering and reasoning                    |
| LLM5  | Qwen 3.5-27B       | Workstation Tier   | Dense        | 27B                   | ~17 GB    | Alibaba     | Strong general-purpose dense model for extraction            |
| LLM6  | GLM-5              | Frontier Benchmark | MoE          | 744B / 40B            | ~400 GB   | Zhipu AI    | Leading conversational + engineering intelligence            |
| LLM7  | Kimi K2.5          | Frontier Benchmark | MoE          | 1T / 32B              | ~240 GB   | Moonshot    | Strong coding + visual-to-code benchmarks                    |
| LLM8  | DeepSeek V3.2      | Institutional Tier | MoE          | 671B / 37B            | ~36 GB    | DeepSeek    | Efficient math and logic specialist                          |
| LLM9  | Gemma 4 31B        | Workstation Tier   | Dense        | 31B                   | ~20 GB    | Google      | High-quality multimodal dense reasoning                      |
| LLM10 | Gemma 4 26B-A4B    | Workstation Tier   | MoE          | 26B / 3.8B            | ~16 GB    | Google      | Ultra-efficient MoE for consumer GPUs                        |
| LLM11 | Mistral Small 3.2  | Workstation Tier   | Dense        | 24B                   | ~15 GB    | Mistral AI  | Fast tool use and low latency                                |
| LLM12 | Phi-4-Reasoning    | Workstation Tier   | Dense        | 15B                   | ~10 GB    | Microsoft   | Strong structured reasoning, science-focused                 |
| LLM13 | Phi-4-Mini         | Workstation Tier   | Dense        | 3.8B                  | ~3 GB     | Microsoft   | Edge/mobile optimized reasoning                              |
| LLM14 | GPT-OSS-120B       | Frontier Benchmark | MoE          | 117B / 5.1B           | ~65 GB    | Open Source | Near-parity with proprietary reasoning systems               |
| LLM15 | MiMo-V2-Flash      | Institutional Tier | MoE          | 309B / 32B            | ~159 GB   | Xiaomi      | Agentic workflows with 1M token context                      |

- **Workstation Tier:** Compact models (3B–32B) optimized for fast inference on research workstations with 16–48 GB unified memory.
- **Institutional Tier:** Larger dense and MoE models (36B–159B) designed for multi-GPU deployment on institutional HPC clusters or dedicated hardware (320+ GB aggregate).
- **Frontier Benchmark:** Models exceeding 200 GB at Q4 quantization. Included to establish a self-hostable performance ceiling at or near proprietary frontier quality.

### Evaluation Framework

For this round of evaluation we are assessing the proficiency of LLMs in translating natural language into GraphQL queries that use Serializable Query Object Notation (SQON). We aim to identify models that consistently generate schema-valid SQON filters while accurately capturing the underlying user intent.

Models are scored against a 5-metric rubric designed for SQON generation quality. Each metric targets a distinct failure mode observed in preliminary testing and in the Wada et al. baseline analysis. Scoring is performed using an LLM-as-judge (Claude Opus 4.7, `temperature=0`) against a ground-truth SQON for each prompt, with a 10% stratified manual review targeting inter-rater agreement of κ > 0.90.

| Metric                | Weight | Description                                                                                                                                              | Threshold       |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Intent Capture        | 25 pts | The SQON represents all conditions from the user's request — no missing filters, no phantom filters beyond what was asked.                               | <90% = critical |
| Field Validity        | 25 pts | All `fieldName` values are drawn from the catalog's `/introspection/{catalogId}` payload. Zero hallucinated fields permitted.                            | 100% required   |
| Operator Correctness  | 20 pts | All operators are valid for the field's type as specified in the SQON introspection schema (e.g., `gte`/`lte` only for numeric/date types, not keyword). | >95% expected   |
| Structural Compliance | 20 pts | Output is a valid SQON: correct `op`/`content` shape, `content` is an array for combination operators (`and`/`or`/`not`), values match expected types.   | 100% required   |
| Output Stability      | 10 pts | Standard deviation across 3 identical runs ≤ 2.0 σ. Evaluated at `temperature=0` to detect stochastic instability in token sampling.                     | σ < 2.0         |

**Execution Equivalence** is a gating operational metric evaluated starting in Phase 3. It measures whether the SQON generated by a candidate model, when executed against the Arranger API, returns the same record set as the reference SQON (generated by the Benchmark Evaluation Panel models). Equivalence is calculated per-query as exact record-set match (yes/no), then aggregated across a test set (e.g., "87/100 queries returned identical results" = 87% execution equivalence). A model must achieve **≥95% execution equivalence** against all three Benchmark models (Claude Opus 4.7, GPT-4.1, Gemini 2.5 Pro) to clear Phase 3 and enter Phase 4. Failure to meet this threshold disqualifies the candidate, as high execution equivalence is non-negotiable for production deployment.

:::note
**Relationship to the 5-metric rubric:** The rubric (Intent Capture, Field Validity, etc.) measures SQON _generation quality_ at the syntactic and semantic level. Execution equivalence measures _functional correctness_, whether the generated query actually retrieves the correct data. A model can score well on the rubric (e.g., "19/20 points, no hallucinated fields") but fail execution equivalence if subtle logic errors cause it to retrieve wrong records. Conversely, a model with perfect execution equivalence might achieve lower rubric scores due to verbose or suboptimal SQON. Both metrics must be considered: the rubric diagnoses _why_ a model fails; execution equivalence is the _proof_ of correctness needed for production.
:::

#### Example: Phase 1 Zero-Shot Prompt

The following illustrates the minimal prompt used in Phase 1 baseline screening. The system prompt is constructed dynamically from the Arranger introspection API, no catalog-specific knowledge is hard-coded into the model prompt. This mirrors the real usage scenario, where the MCP server surfaces introspection data to the model at runtime.

**System Prompt** (constructed from `/introspection/sqon` and `/introspection/mutation`):

```
You are a data discovery assistant. Convert the user's natural language query
into a valid SQON filter for the Arranger search API.

Catalog: mutation
Available fields:
  data.hugo_symbol         (keyword)  operators: in, not-in, some-not-in, all, filter
  data.cancer_type         (keyword)  operators: in, not-in, some-not-in, all, filter
  data.is_oncogene         (keyword)  operators: in, not-in, some-not-in, all, filter
  data.overall_mutation_frequency (keyword)  operators: in, not-in, some-not-in, all, filter
  data.is_tumor_suppressor_gene   (keyword)  operators: in, not-in, some-not-in, all, filter

SQON structure:
  Combination: { "op": "and" | "or" | "not", "content": [ <sqon>, ... ] }
  Field filter: { "op": "in" | "not-in" | ..., "content": { "fieldName": "...", "value": [...] } }

Output only valid JSON. No explanation.
```

**User query:** `"Show me mutations in TP53 or KRAS from lung cancer"`

**Gold-standard SQON:**

```json
{
  "op": "and",
  "content": [
    {
      "op": "in",
      "content": {
        "fieldName": "data.hugo_symbol",
        "value": ["TP53", "KRAS"]
      }
    },
    {
      "op": "in",
      "content": {
        "fieldName": "data.cancer_type",
        "value": ["Lung Adenocarcinoma"]
      }
    }
  ]
}
```

**Example model output with errors (Phase 1 baseline - lower-scoring candidate):**

```json
{
  "op": "or",
  "content": [
    {
      "op": "in",
      "content": {
        "fieldName": "gene_name",
        "value": "TP53"
      }
    },
    {
      "op": "in",
      "content": {
        "fieldName": "cancer_type",
        "value": ["lung cancer"]
      }
    }
  ]
}
```

| Error                                                                                                                                   | Metric Affected       | Score Impact            |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------- |
| `"op": "or"` at top level — should be `"and"` (the user wants records matching both a gene AND a cancer type, not either independently) | Intent Capture        | −15 pts                 |
| `"gene_name"` does not exist in the catalog schema; correct field is `data.hugo_symbol`                                                 | Field Validity        | −25 pts                 |
| `"value": "TP53"` — bare string instead of the required array                                                                           | Structural Compliance | −10 pts                 |
| `"cancer_type"` is missing the `data.` namespace prefix                                                                                 | Field Validity        | already penalized above |

This composite result (~35/100) places the model in the lower-performing group for Phase 2, triggering the simplified capacity-matched prompt that targets format compliance before accuracy.

**Phase 1 Summary Score:** 35/100 points across the 5-metric rubric. The model would advance to Phase 2 due to its presence in the candidate pool, where targeted corrections would address the format errors (missing array syntax, field name hallucination) and logic error (wrong combination operator).

**Hypothetical Phase 3 Outcome:** If this model were to advance to Phase 3 despite low Phase 1 scores, its execution equivalence would likely fail. The `"op": "or"` error causes the SQON to retrieve records matching _either_ a TP53/KRAS mutation _or_ a lung cancer diagnosis—a substantially different result set. If 100 test queries were executed, this model might achieve only 62% execution equivalence against the Benchmark models (e.g., 62/100 queries returned identical record sets), far below the **≥95% gating threshold**. This demonstrates why execution equivalence is a hard requirement: syntactic errors (hallucinated fields, wrong array syntax) can often be corrected in later phases, but logic errors that change query semantics fail execution equivalence and disqualify the model.

## References

Wada, A., et al. (2026). "Bridging the performance gap: systematic optimization of local LLMs for Japanese medical PHI extraction." _Scientific Reports_ / PMC. https://pmc.ncbi.nlm.nih.gov/articles/PMC12894992/

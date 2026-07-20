# User Testing

Determine whether real researchers can discover and filter data through the conversational interface, and what to fix next. The output of the work is the grant-required **user-testing report with prioritised Phase 2 enhancement recommendations**, plus a named accessibility audit. It is not a one-off score: it is the evidence base that sets the next round of priorities and feeds real prompts back into the evaluation corpus.

The study must answer four questions:

1. **Task success:** can researchers actually find and select the data they intend to?
2. **Query trust:** do they accept, edit, or reject the generated query?
3. **Usability & accessibility:** is the workflow learnable and low-friction, and does it meet **WCAG 2.1 AA** (DRAC §4.3)?s
4. **Real-world query quality:** are the queries correct on un-curated prompts, and what error patterns recur?

This runs after the system gate has proven the wired-up pipeline works, in the grant's QA/user-testing window (DRAC §4.3, months 6–8).

## Background

The platform turns a sentence such as _"show me all breast cancer samples with RNA-seq data from Canadian donors"_ into a structured query. [Model evaluation](./05-Model-Benchmarks.md) and [system testing](./06-System-Benchmarks.md) both score a generated query against a **reference query** authored in advance. A real researcher's question has no reference: nobody wrote the right answer down first. So user testing cannot use query-correctness as its primary metric; it shifts to **behavioural and judged signals**, with query-correctness recovered only post-hoc on a labelled sample.

The three discovery activities differ only in what they hold as ground truth:

| Activity                    | Tests                       | Ground truth                   | Gates                 |
| --------------------------- | --------------------------- | ------------------------------ | --------------------- |
| Model evaluation            | the model in isolation      | reference query (no execution) | pilot selection       |
| System testing              | the assembled MCP pipeline  | reference query + live records | integration / release |
| **User testing (this doc)** | real researchers on the GUI | none (behavioural signal)      | next priorities       |

## Scope

**In scope.** Testing the deployed conversational interface with real researchers across two formats (moderated sessions and instrumented field use), against the four objectives above, including the WCAG 2.1 AA accessibility audit.

**Out of scope.** Re-testing properties already gated upstream: data minimisation and pipeline correctness are enforced and regression-tested in [system testing](./06-System-Benchmarks.md), and user testing relies on them rather than re-implementing them. Also out of scope: the small model-feel exercise internal to model selection (a different surface and purpose).

:::note
The study is expected to reuse the shared record/telemetry format and the model-eval comparators rather than invent new ones, so that real-world results sit in the same store and dashboards as the other two activities and a sampled subset can be scored with the same canonicalizer. The capture loop (real prompts promoted into fixtures) is the mechanism that feeds the next evaluation round.
:::

## Functional requirements

Methods are open; the study must do the following:

| ID     | Requirement                         | What the study must do                                                                                                                                                                                                                                                                      |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** | Measure task success                | Establish whether researchers can find and select the data they intend to, via task completion (moderated), self-reported success (field), and reformulations-to-success (how many tries before they got what they wanted).                                                                 |
| **F2** | Capture the trust signal            | Record, for every generated query, whether the researcher accepts, edits, rejects, or reformulates it, plus edit distance when edited (a small correction is a near-miss; a rewrite is a failure). This behavioural signal is the stand-in for query-correctness where no reference exists. |
| **F3** | Assess usability and accessibility  | Catalogue workflow friction and comprehension from observed sessions, and run a **WCAG 2.1 AA** audit (screen-reader support, keyboard navigation, contrast). The audit is a named grant deliverable, not a soft metric.                                                                    |
| **F4** | Recover a real-world quality number | Despite the no-reference problem, produce an objective query-quality figure by human-labelling a sampled subset of captured prompts with a reference and scoring them with the model-eval comparators and failure taxonomy, so real traffic is comparable to fixture results.               |
| **F5** | Feed the capture loop               | Turn useful real prompts into new fixtures: assign a reference, tag difficulty, validate as any hand-authored fixture, behind the governance gate. This closes the loop from real usage back into the next model decision.                                                                  |
| **F6** | Make complaints reproducible        | Tie every interaction to the same propagated trace identifier the pipeline uses, so a field complaint can be traced through the same logs system testing uses and becomes reproducible rather than anecdotal.                                                                               |

## Study formats

The study runs in two formats, and they are **not interchangeable**: they are sequenced moderated-then-field so blocking issues are fixed before volume is collected. Moderated sessions are the primary source of _why_ something fails; field use is the primary source of _how often_.

| Format                          | Population              | Yields                                                                                                                                                                |
| ------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Moderated (first)**           | Small, purposive (≈5–8) | Qualitative signal: think-aloud observation of where researchers hesitate, misread, or distrust. Surfaces the majority of usability problems cheaply, before rollout. |
| **Instrumented field (second)** | Broader                 | Quantitative signal: real prompts at volume, metrics with denominators (acceptance rate, time-to-insight), and the capture-loop corpus.                               |

:::note
**Which surface do users touch?** The grant specifies the Aim 1 host as a **Chainlit** application (DRAC §4.6), while model-selection notes reference **LM Studio** as a local serving path. These may be different layers (Chainlit the host UI; LM Studio/Ollama the model server behind it) or a stopgap-vs-target difference. This must be confirmed, because it determines what "usability" (F3) and the serving-path parity check actually evaluate. Flagged, not assumed.
:::

## Data constraints

| ID     | Constraint                       | Detail                                                                                                                                                                                                                                                                                                                           |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | No ground truth for live prompts | Real questions have no reference query. The record sets `source: captured-user`, leaves the evaluation group null, and populates an `outcome` (accepted / edited / rejected / reformulated / executed-ok / executed-error) as the behavioural stand-in. The same record/telemetry format carries both this and the scored cases. |
| **D2** | A baseline arm is required       | The grant's **≥30% time-to-insight reduction vs traditional faceted search** (DRAC §4.5) is only measurable against a captured baseline: the same discovery tasks run on the existing faceted search. The grant scopes baseline capture to months 1–3; it must exist before AI-assisted sessions begin.                          |
| **D3** | Captured prompts are sensitive   | Cancer-data-discovery prompts can carry cohort or research-intent detail. A redaction/consent review gates any prompt entering the reusable corpus (TCPS2, DRAC §4.5), and session consent gates moderated recordings. Promotion to a fixture is a reviewed step, never automatic.                                               |

## Quality requirements & acceptance criteria

The thing most likely to be cut corners on is the baseline: without it, the headline metric is unfalsifiable. State it first and treat it as a precondition, not a nice-to-have.

| ID     | Requirement                           | Detail                                                                                                                                                                                                                                                              |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** | The ≥30% claim needs a baseline       | The time-to-insight target is meaningless without the traditional-faceted-search arm captured under comparable tasks. **(Risk:** the baseline is scoped to months 1–3; confirm it was actually captured, or the headline metric cannot be reported, only asserted.) |
| **Q2** | Pre-register per-objective thresholds | Define what "good enough" means for each objective before data collection (e.g. acceptance rate, a usability-instrument score, task completion), so results are judged against a stated bar rather than read favourably after the fact.                             |
| **Q3** | Accessibility is pass/fail            | WCAG 2.1 AA is a named deliverable, not a soft score. The audit gates the "done" claim and names the build it ran against.                                                                                                                                          |
| **Q4** | Real-world quality must be comparable | The post-hoc labelled sample (F4) must use the same comparators and failure taxonomy as model evaluation, so real-world error patterns sit on the same axes as fixture results and can be read together.                                                            |

## Non-functional requirements

### Instrumentation & observability

Every interaction must write one record in the shared format (prompt, generated query components, `outcome`, full telemetry, propagated trace identifier). Because the format and trace propagation are identical to system testing, a user-reported problem traces through the same pipeline logs, and a regression in system testing and a complaint in user testing correlate on the same keys (model, prompt-template version, introspection snapshot).

### Reuse over rebuild

The trust signal (F2) should ride on the interface's existing query-preview/consent affordance, so it is a byproduct of a feature the grant already requires rather than extra instrumentation. The study relies on the upstream system gate for data minimisation and pipeline correctness rather than re-testing them.

:::note
This reliance is also a risk: a gap in the upstream gates surfaces late, in front of real users. Acceptable because those gates are hard and independent and trace propagation makes any escape quickly diagnosable, but it is a dependency, not a guarantee this study re-establishes.
:::

### Sequencing & timeline

Moderated sessions must precede field rollout so volume data is not dominated by problems already known, within the months 6–8 window.

## Participant admissibility

Participants are drawn from the RPP communities the grant names (ICGC-ARGO users and linked groups), selected via the planned community consultation (DRAC §4.3, months 6–7). The moderated cohort is small and purposive; the field cohort is broader. Researchers outside the named communities, and synthetic or internal-only "users," are not admissible as the basis for the grant-reported findings.

## Stakeholders & users

- **End users:** OICR / RPP researchers doing real discovery work. Success from their side is behavioural: do they accept, edit, reject, or reformulate the query, and does it run?
- **Grant & governance:** the report, the accessibility audit, and the data-sovereignty/TCPS2 controls are grant commitments (DRAC §4.3, §4.5).
- **Downstream model selection:** depends on the capture loop delivering governance-cleared real prompts so the next model decision is made against questions researchers actually asked.

## Constraints & assumptions to validate early

These are known risks. Resolve or explicitly accept them up front rather than discover them late.

:::warning
**Baseline existence (see Q1).** The ≥30% time-to-insight claim collapses without the faceted-search baseline. Confirm it was captured in the months 1–3 window, or schedule it before AI-assisted sessions, or the metric cannot be reported.
:::

:::warning
**Serving-path surface.** Whether pilot users touch Chainlit or LM Studio determines what usability and the serving-path parity check evaluate. Confirm the surface before designing the moderated tasks around it.
:::

:::note
**Accessibility audit ownership.** The WCAG 2.1 AA audit (months 7–8) needs a named owner and a named target build. Unassigned, it is the deliverable most likely to slip.
:::

## Expected deliverables

Outcomes, not implementations:

1. The grant-required user-testing report with prioritised Phase 2 enhancement recommendations.
2. The accessibility audit results, against a named build.
3. A governance-cleared set of captured prompts promoted into the fixture corpus, with provenance.
4. Real-world query-quality figures (F4) comparable to the model-eval and system-test results via the shared format.

## Pending decisions

Explicitly the architect's/researcher's call, bounded by the requirements above:

- **Interface surface:** which surface pilot users actually touch (resolves the Chainlit-vs-LM-Studio question).
- **Usability instrument:** which standard instrument to use and what score gates acceptance.
- **Labelling sample:** how many captured prompts get human references for the post-hoc quality number, and how they are sampled.
- **Recruitment specifics:** cohort sizes and selection within the named communities.
- **Baseline scheduling:** if the months 1–3 baseline is missing, when and how it is captured.

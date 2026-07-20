# Roadmap

Prelude backs two grant deliverables: **Aim 1** — a local testing environment; **Aim 2** — developer documentation. Full rationale, file-level detail, and the six reporting statements this work makes defensible are in [requirments.md](../requirments.md) (2026-07-20); this file is the near-term actionable tracker and `§` refs point into that doc. Long-term project aims are in [README.md](../README.md).

Items are open unless marked `[in progress]`. Completed items are removed. Groups run top-to-bottom by readiness, not strict priority.

## In progress

- **[in progress] Config directory reorganization** — `configs/arrangerConfigs/` → `configs/arranger/`, `configs/elasticsearchConfigs/` → `configs/elasticsearch/`. Staged on `overtureMCP`, uncommitted. Verify all references (compose, conductor, Makefile, docs) point at the new paths before committing.

## Start now — no external input (unblocks reporting statements 1 & 6)

- **P0 deployment doc-drift fixes** (§4.1) — `make restart-arranger` targets non-existent `arranger-datatable1` (→ `arranger`); README services table + missing `arranger-mcp:3100` row; `--recurse-submodules` silent no-op; unwired open-browser claim; catalog names plural→singular (+ add `fixture`); replace `<!-- PLACEHOLDER -->` blocks with real image tag / port 3100 / run commands.
- **Drug Discovery data wording** (§4.3) — reword README "~405M records / 32 cancer types" to "representative ~1k-row samples (405M-record upstream)"; note demo-profile auto-load and that `mutation.csv` is BRCA-only.
- **Port accurate MCP docs from the `arranger/` checkout** (§5.2, §5.4) — correct the 4-tool inventory (`list-catalogues`, `get-sqon-schema`, `get-catalogue-fields`, `execute-query`), env vars (incl. required `ARRANGER_CATALOGUES`), paths, `tsx` run commands, port 3100, broken links. Fixes statement 6 independent of submodule wiring; then slim prelude's own MCP docs to deployment-only and link out.
- **Host-connection guide** (§4.7) — one "connect your host" doc: LM Studio worked example (endpoint `http://localhost:3100/mcp`, Streamable HTTP), Ollama + Claude Desktop as named alternatives; fix the broken researcher-guide link; resolve the Chainlit-vs-LM-Studio "which surface do users touch" question. (Containerized Ollama considered and deprioritized — macOS GPU passthrough.)

## Needs one input — the `arranger` remote URL + pin commit

- **Make `arranger` a real submodule + symlink docs sync** (§5.1, §5.3) — `git submodule add`, pin to the commit matching deployed image `arranger-mcp-server:b4a414ce`, commit `.gitmodules`, update README clone instructions. Handle the two sync caveats: Docusaurus frontmatter vs Stage renderer, and symlinks resolving inside the Docker build context. `lectern/` stays reference-only.

## App work — parallelizable

- **Re-enable the Lectern dictionary UI in Stage** (§4.6) — machinery mostly exists but is disabled: restore the viewer via published `@overture-stack/lectern-ui` + existing theme adapter, un-stub `useDictionaryHydration.ts`, wire a route; author Drug Discovery Lectern dictionaries (none exist yet) + ARGO from `argo-lectern-schema.json`; validate against the `lectern/` reference checkout. Decide static-JSON vs deployed Lectern server; keep dictionary source env-configurable for dev-env parity.

## Gated on ARGO data + dictionary landing

- **ARGO wiring** (§4.4) — when ARGO data + dictionary are ready: `donor_centric`/`file_centric` CSVs, ES mappings, Arranger catalogues, add to `DATA_TABLES` load loop, Stage `NEXT_PUBLIC_ARRANGER_DATATABLE_*` slots (mind the 5-slot ceiling), MCP catalogues, commit `argo-lectern-schema.json` + healthcheck catalogue list. Unblocks statement 4, the ARGO half of the dictionary UI, and fixture validation.
- **Finalize + validate the fixture corpus** (§4.5) — the 44 hand-authored synthetic fixtures are an explicit draft and the backbone of platform testing/evaluation. Regenerate against loaded catalogues, pin `introspection_commit`/`index_commit` to the real snapshot, run the validation pass (populate `expected_record_ids`, flip `reference_validated`/`frontier_pass`), add `domain_reviewer`/`reviewed_by` provenance + `data/fixtures/REVIEW.md`, bump `fixture_set_version` from draft `5.0.0` to the finalized release.

## Reporting & upstream (not prelude code)

- **Statement 2 — dedicated dev environment** (§4.2) — reporting only: name/reference the separate dev environment and describe this repo explicitly as the *local testing* environment; keep the two claims distinct.
- **Upstream arranger staleness** (§5.5) — `arranger/apps/mcp-server/README.md` lists query execution under "Not Implemented Yet", but `execute-query` is implemented and registered; update before publishing.
- **Publication** (§5.6) — source docs.overture.bio from the pinned arranger submodule; decide GitHub discoverability (merge `docs/` to `main`, set `overtureMCP` default, or point `main`'s README at docs.overture.bio). Until then, qualify "published" as branch/in-progress.

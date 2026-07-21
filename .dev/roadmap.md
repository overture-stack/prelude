# Roadmap

Prelude backs two grant deliverables: **Aim 1** — a local testing environment; **Aim 2** — developer documentation. This file is the near-term actionable tracker; long-term project aims are in [README.md](../README.md). Items are open unless marked `[in progress]`; completed items are removed. Groups run top-to-bottom by readiness, not strict priority.

## Start now — no external input (makes the deployment + docs reporting defensible)

- **P0 deployment doc-drift fixes** — `make restart-arranger` targets non-existent `arranger-datatable1` (→ `arranger`); README services table + missing `arranger-mcp:3100` row; `--recurse-submodules` is a silent no-op (no `.gitmodules`); unwired open-browser claim; catalog names plural→singular (+ add `fixture`); replace `<!-- PLACEHOLDER -->` blocks with the real image tag / port 3100 / run commands.
- **Drug Discovery data wording** — reword README "~405M records / 32 cancer types" to "representative ~1k-row samples (405M-record upstream)"; note demo-profile auto-load and that `mutation.csv` is BRCA-only.
- **Port accurate MCP docs from the `arranger/` checkout** — correct the 4-tool inventory (`list-catalogues`, `get-sqon-schema`, `get-catalogue-fields`, `execute-query`), env vars (incl. required `ARRANGER_CATALOGUES`), paths, `tsx` run commands, port 3100, broken links; then slim prelude's own MCP docs to deployment-only and link out to the arranger canonical docs.
- **Host-connection guide** — one "connect your host" doc: LM Studio worked example (endpoint `http://localhost:3100/mcp`, Streamable HTTP), Ollama + Claude Desktop as named alternatives; fix the broken researcher-guide link; resolve the Chainlit-vs-LM-Studio "which surface do users touch" question. (Containerized Ollama considered and deprioritized: macOS GPU passthrough.)

## Needs one input — the `arranger` remote URL + pin commit

- **Make `arranger` a real submodule + symlink docs sync** — `git submodule add`, pin to the commit matching deployed image `arranger-mcp-server:b4a414ce`, commit `.gitmodules`, update README clone instructions. Handle the two caveats: Docusaurus frontmatter vs the Stage renderer, and symlinks resolving inside the Docker build context. `lectern/` stays reference-only.

## App work — parallelizable

- **Re-enable the Lectern dictionary UI in Stage** — machinery mostly exists but is disabled: restore the viewer via published `@overture-stack/lectern-ui` + existing theme adapter, un-stub `useDictionaryHydration.ts`, wire a route; validate against the `lectern/` reference checkout. Dictionaries now exist: `configs/lectern/{correlation,expression,mutation,protein}.json` (Drug Discovery) + `argo-data-dictionary.json` (ARGO, v142.3). Decide static-JSON vs deployed Lectern server; keep the dictionary source env-configurable for dev-env parity.

## Gated on dictionary landing

- **Finalize + validate the fixture corpus** — the 44 hand-authored synthetic fixtures are an explicit draft and the backbone of platform testing/evaluation. Regenerate against loaded catalogues, pin `introspection_commit`/`index_commit` to the real snapshot, run the validation pass (populate `expected_record_ids`, flip `reference_validated`/`frontier_pass`), add `domain_reviewer`/`reviewed_by` provenance + `data/fixtures/REVIEW.md`, bump `fixture_set_version` from draft `5.0.0` to the finalized release.

## Reporting & upstream (not prelude code)

- **Name the dedicated dev environment** — reporting only: reference the separate dev environment and describe this repo explicitly as the *local testing* environment; keep the two claims distinct.
- **Upstream arranger staleness** — `arranger/apps/mcp-server/README.md` lists query execution under "Not Implemented Yet", but `execute-query` is implemented and registered; update before publishing.
- **Publication** — source docs.overture.bio from the pinned arranger submodule; decide GitHub discoverability (merge `docs/` to `main`, set `overtureMCP` default, or point `main`'s README at docs.overture.bio). Until then, qualify "published" as branch/in-progress.

<!-- Detail for these items originally lived in a root scoping doc (requirments.md), since moved/removed by the developer. Items above are self-contained; ask to re-link them if that doc lands somewhere permanent. -->

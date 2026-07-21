<!-- agentics-template-version: 0.2.0 | synced: bcc6ee0b8ec3d7ec2b604e8132d9e1afa4c737bb -->
# Agent collaboration conventions — Prelude

**For AI agents:** this file is instructions you read and follow, not documentation written for people. If you're a person, see [README.md](README.md) and [docs/](docs/) instead.

Adapted from [softeng/agentics](https://github.com/oicr-softeng/agentics). This is the canonical, agent-neutral source for **Prelude-specific** conventions; `CLAUDE.md` is a stub that points here.

Universal conventions (interaction style, critical constraints, testing, code style, security, documentation, session discipline), the developer role, and the softeng team layer are **not duplicated here** — they come from the developer's agentics-based global context and the local clone at `~/.claude/agentics/template/`. Any agent working in this repo reads those on demand; this file adds only what is specific to Prelude.

## Session start
Before touching code, read `.dev/roadmap.md`, `.dev/tech-debt.md`, and the most recent file(s) in `.dev/sessions/`. Full session-start sequence: `~/.claude/agentics/template/conventions/session-discipline.md`.

## When to read what (agentics conventions — read on demand)
The canonical task→convention dispatch table lives in `~/.claude/agentics/template/AGENTS.md` § "When to read what": tests, code style, code review, docs, security, convention levels, upgrading adoption. Read the matching file from `~/.claude/agentics/template/conventions/` when doing that task.

## Project context
Prelude is the **Overture Arranger MCP demo and development environment**: it exposes an Overture-based cancer-genomics platform's GraphQL search through the Model Context Protocol for conversational data discovery. It backs two active grants (ITCR, DRAC). The full project aims (pathway discovery, local-LLM support, interactive analysis, federated discovery, extensibility) are in [README.md](README.md); current near-term work lives in `.dev/roadmap.md`.

## Project-specific constraints
- **Public repository** — no credentials, secrets, tokens, or private cluster URLs in any committed file, ever. `.env.example` documents variable *names* only; real values live in an untracked `.env`.
- **Stack orchestration goes through the entry points**: the root `conductor` script and the `Makefile`, over the services in `docker-compose.yml`. Prefer these over ad-hoc `docker` commands.
- **Vendored Overture components carry their own conventions.** `arranger/` (and any submodule with its own `AGENTS.md`/`CLAUDE.md`, e.g. `apps/conductor`) is a separate component — defer to its in-tree instructions and do not apply Prelude's root conventions on top of it.

## Repository orientation
- `apps/` — application services: `conductor` (stack orchestration), `stage` (Overture Stage portal front-end)
- `arranger/` — vendored Overture Arranger component (own repo/conventions)
- `configs/` — per-document-type configuration under `arranger/`, `opensearch/`, `postgres/`, `lectern/` (document types: correlation, expression, fixture, mutation, protein). The ARGO `donor` catalogue lives in `arranger-pending/` until its data is loaded (see that folder's README). Renamed from `configs/arrangerConfigs/` / `configs/elasticsearchConfigs/` on the `overtureMCP` branch; the search-engine migration then renamed `elasticsearch/` → `opensearch/`.
- `lectern/` — Lectern data-dictionary / schema assets
- `data/` — sample datasets: `fixtures/`, `tables/`
- `setup/` — stack setup `scripts/` and `volumes/`
- `docs/` — human documentation: `development/`, `admin/`, `user/`
- `conductor`, `Makefile`, `docker-compose.yml`, `Jenkinsfile` — orchestration and CI

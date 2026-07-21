# Tech debt

```
[short description of the issue]
fix: [what the fix is, in one sentence]
standalone: yes | no
context: [roadmap item or brief note — required when standalone: no]
```

`standalone: yes`: can be picked up freely without other context.
`standalone: no`: blocked on or coupled to roadmap work; read the context note first.

---

Stage's server-side next-auth session fetch uses `localhost` (resolves to IPv6 `::1`) while the server listens on IPv4, logging a `CLIENT_FETCH_ERROR`; non-blocking (the portal serves 200 and the healthcheck now uses 127.0.0.1)
fix: if SSR auth matters, point `NEXTAUTH_URL`/the internal fetch at `127.0.0.1` or make Stage bind dual-stack; otherwise leave it (data browsing works)
standalone: yes

Residual "elasticsearch" naming is cosmetic and partly unavoidable
fix: the `ES_HOST`/`ES_USER`/`ES_PASS`/`ES_URL` env vars must stay (Arranger and conductor read those exact keys), so a full de-ES rename is not possible; renaming the rest (conductor's `src/services/elasticsearch/`, `setup/scripts/services/elasticsearch/`, comments, docs) is churn for zero functional gain. Recommendation: leave as-is
standalone: yes

The ARGO `donor` Stage table exposes all 245 fields as columns (`configs/arranger/donor/table.json`) — unwieldy to browse
fix: trim `table.json` to a sensible core subset (e.g. ARGO Core-tier donor fields + key nested identifiers), leaving the rest available via Arranger's column config; the full field set stays searchable/aggregatable regardless of which columns show
standalone: yes

The ARGO Lectern dictionary's `meta.tier` (Core/Extended) and `meta.cadsr_cde` (caDSR CDE link) field metadata has no viewer support yet — the ARGO dictionary was authored to use these as custom columns, but `@overture-stack/lectern-ui`'s published `1.0.0` (npm's latest, confirmed via `npm view`) predates the `customColumns` feature; it exists only in unreleased upstream `develop` source (added in PR #447, one commit ahead of anything released), which also bumps `react`/`react-dom` to `^19.1.0` — two majors ahead of Stage's pinned `^17.0.2`
fix: wait for an official lectern-ui release with `customColumns` support that's still React-17-compatible (or do the full React 17→19 upgrade first, which is its own separate, much larger effort — do not attempt a partial/git-pinned install of the unreleased package, it also depends on sibling `workspace:*` packages not independently buildable outside the lectern pnpm monorepo)
standalone: no
context: Lectern dictionary UI item above — everything else that item asked for (ERD, meta.category filter, header, toolbar) is done; this one piece is blocked on upstream, not on anything in this repo

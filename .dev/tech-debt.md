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

conductor-cli builds from local source (`apps/conductor`) with the OpenSearch-client change, instead of a pinned published image
fix: commit the `apps/conductor` change here (`overture-stack/conductor` redirects to this repo, so there is no separate upstream), let CI republish `ghcr.io/overture-stack/conductor`, then point conductor-cli back at a pinned published tag
standalone: no
context: the local build rebuilds on `make demo`; keep until a published OpenSearch-capable conductor image exists

Stage's server-side next-auth session fetch uses `localhost` (resolves to IPv6 `::1`) while the server listens on IPv4, logging a `CLIENT_FETCH_ERROR`; non-blocking (the portal serves 200 and the healthcheck now uses 127.0.0.1)
fix: if SSR auth matters, point `NEXTAUTH_URL`/the internal fetch at `127.0.0.1` or make Stage bind dual-stack; otherwise leave it (data browsing works)
standalone: yes

Residual "elasticsearch" naming is cosmetic and partly unavoidable
fix: the `ES_HOST`/`ES_USER`/`ES_PASS`/`ES_URL` env vars must stay (Arranger and conductor read those exact keys), so a full de-ES rename is not possible; renaming the rest (conductor's `src/services/elasticsearch/`, `setup/scripts/services/elasticsearch/`, comments, docs) is churn for zero functional gain. Recommendation: leave as-is
standalone: yes

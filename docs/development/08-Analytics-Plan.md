# Web Analytics Plan — Stage + Arranger Data Portal

**Scope:** Google Analytics 4 (GA4) delivered through Google Tag Manager (GTM) for the
Overture data portal (Stage front end + Arranger search API).
**Reference deployment:** `https://imicroseq-dataportal.ca/explorer/clinical`

---

## 1. Answering "What metrics would you find most useful?"

We report on a **monthly cadence**, grouped into three tiers. The top tier is what you
explicitly asked for; the lower tiers are low-cost additions that make those headline
numbers interpretable (e.g. a download count is more useful when you can see how people
got there).

### Tier 1 — Headline metrics (requested)

| Metric | Definition | How it is captured |
|---|---|---|
| **Unique visitors / month** | Distinct users in the period (GA4 *Active Users*). Reported alongside *Sessions* and *New vs. Returning*. | GA4 automatic, no extra code |
| **Monthly downloads** | Count of dataset/file export actions, broken down by data type and result-set size. | Custom event on the Arranger download button (client) + Arranger `/download` access logs (server cross-check) |
| **Query volume** | Facet/filter interactions per session, and per-session counts. Paired with whether the session ended in a download. | Custom events on facet panel interactions, joined to downloads in a funnel |

### Tier 2 — Context that makes Tier 1 actionable

- **Search → Download conversion rate** — % of querying sessions that download. The single
  best signal of whether people find what they came for.
- **Most-used facets / fields** — which filters (e.g. disease, assay, sample type) drive
  discovery, so curation effort goes where users actually look.
- **Zero-result searches** — filter combinations that return nothing. Direct backlog of
  data gaps or UX friction.
- **Query depth per session** — number of filters applied before download or exit
  (shallow vs. deep exploration).

### Tier 3 — Audience & reach (aggregate only)

- **Geography** — country / region (Canada vs. international uptake — useful for grant reporting).
- **New vs. returning users** and **return frequency** — is the portal building a recurring user base?
- **Acquisition source** — referral / direct / search / publication links.
- **Device & browser** — desktop vs. mobile, to prioritise responsive work.
- **Documentation engagement** — visits to `/documentation` pages (are users self-serving?).

> **For grant reporting** the most defensible quarterly story combines: *unique users*,
> *downloads*, *search→download conversion*, and *geographic reach*.

---

## 2. Event model

GA4's standard reports cover Tier 1 *visits* and Tier 3 *audience* automatically. The
portal-specific value comes from a small set of **custom events** pushed to the GTM
`dataLayer`.

| Event name | Trigger | Key parameters |
|---|---|---|
| `file_download` | Click on the Arranger download button | `result_count`, `data_type`, `selected_rows`, `active_filter_count` |
| `facet_filter` | A facet value is selected / deselected | `facet_field`, `facet_action` (add/remove), `result_count` |
| `search_zero_results` | A query returns 0 rows | `active_filters` |
| `explorer_view` | Data explorer page / tab loaded | `explorer_name` (clinical, molecular, …) |

**Session pairing (query ↔ download):** because every `facet_filter` and `file_download`
event shares GA4's `session_id`, query volume and downloads are joinable per session
without extra work — this is what powers the conversion funnel in Tier 2. No need to send
the query and download together in one payload.

> **Privacy note:** Send *aggregate* parameters only — counts, field names, data types.
> **Never** push raw query values, file names, identifiers, or anything user-identifying
> into the `dataLayer`.

---

## 3. Implementation plan (Stage + Arranger)

### 3.1 Install the GTM container

GTM loads once, globally, in the Next.js app:

- **Container script** → add to [_app.tsx](../../apps/stage/pages/_app.tsx) via
  `next/script` (`strategy="afterInteractive"`), or the head/body snippet pair in
  [_document.tsx](../../apps/stage/pages/_document.tsx).
- Expose the container ID as a build-time env var (e.g. `NEXT_PUBLIC_GTM_ID`) so it can be
  toggled per environment and left unset in dev.
- GA4 is configured **inside GTM** (a GA4 Configuration tag firing on all pages) — no GA
  snippet in the codebase, so tags can change without redeploys.

### 3.2 Page-view tracking (SPA-aware)

Stage uses the Next.js pages router; client-side route changes don't fire native
page loads. Add a `router.events.on('routeChangeComplete', …)` listener in
[_app.tsx](../../apps/stage/pages/_app.tsx) that pushes a `page_view` to the `dataLayer`,
so `/explorer/*` navigations are counted.

### 3.3 Custom event hooks

- **Download** — the button is configured in
  [tableTheme.tsx](../../apps/stage/components/pages/dataExplorer/theme/tableTheme.tsx)
  (`DownloadButton`, posting to `${apiHost}/download`). Wrap its handler / custom label to
  `dataLayer.push({ event: 'file_download', … })`.
- **Facet interactions** — hook the change handlers in
  [Facets.tsx](../../apps/stage/components/pages/dataExplorer/Facets.tsx) to push
  `facet_filter` events.
- **Zero results** — emit from the results/SQON handling in
  [PageContent.tsx](../../apps/stage/components/pages/dataExplorer/PageContent.tsx) when a
  query resolves to 0 hits.

### 3.4 Server-side cross-check (recommended)

Client analytics under-count when ad/tracker blockers are active — common in research and
institutional networks. Use **Arranger `/download` request logs** as an independent,
blocker-proof download tally. Discrepancy between the two is itself a useful signal of how
much client-side data is being lost.

### 3.5 Consent & compliance

- Canadian deployment → align with **PIPEDA**; add a lightweight cookie-consent banner and
  gate GA tags behind GTM's consent mode.
- Enable **IP anonymisation** and disable Google Signals / advertising features.
- Document the analytics in the portal's privacy policy.

---

## 4. Reporting

- **Delivery:** a GA4 *Looker Studio* dashboard (auto-refreshing) plus a monthly snapshot
  export for grant records.
- **Headline tiles:** Unique users · Sessions · Downloads · Search→download conversion · Top facets · Geography.
- **Monthly review:** zero-result trends and most-used facets feed directly into data
  curation and UX priorities.

---

## 5. Phased rollout

| Phase | Deliverable |
|---|---|
| 1 | GTM container live + GA4 config + SPA page-view tracking |
| 2 | `file_download` event + Arranger server-side cross-check |
| 3 | `facet_filter` + `search_zero_results` events; query↔download funnel |
| 4 | Consent banner, IP anonymisation, privacy-policy update |
| 5 | Looker Studio dashboard + first monthly report |

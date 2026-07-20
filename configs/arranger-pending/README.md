# Pending Arranger catalogues

Catalogue configs in this directory are **not loaded** by Arranger. This folder sits
outside the `./configs/arranger` bind mount (see `docker-compose.yml`), so Arranger's
startup scan never sees them. Move a catalogue back under `configs/arranger/` to activate it.

## argo_clinical

Parked until ARGO data lands. Its `base.json` sets `esIndex: donor_centric`, but no
`donor_centric` index is created (there is no donor mapping file under
`configs/opensearch/`; ARGO data is a known-pending item). While the catalogue is active,
Arranger's mapping fetch for `donor_centric` 404s and the whole instance fails to start.

To re-enable once ARGO data and a `donor_centric` mapping exist:

```
git mv configs/arranger-pending/argo_clinical configs/arranger/argo_clinical
```

Then also add its Stage datatable slot (`NEXT_PUBLIC_ARRANGER_DATATABLE_*`) and its entry
in the `arranger` healthcheck catalogue list in `docker-compose.yml`.

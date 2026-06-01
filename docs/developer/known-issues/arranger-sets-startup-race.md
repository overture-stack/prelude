# Arranger startup race on the shared `arranger-sets` index breaks a random catalogue

> **Status:** Open — upstream bug in Arranger. This file is a ready-to-file ticket
> (intended for [`overture-stack/arranger`](https://github.com/overture-stack/arranger/issues)).
> Prelude mitigates it with a per-catalogue Docker healthcheck (see below) but cannot fix the root cause.

## Affected versions

- Image: `ghcr.io/overture-stack/arranger-search-server:6de99b38`
- Source: `overture-stack/arranger` around commit `7d226172` (the `search-server` rewrite)
- Configuration: a single server running **multiple catalogues** in `multiple` mode
  (Prelude runs 5: `correlation`, `expression`, `fixture`, `mutation`, `protein`).

## Symptom

After the server boots, **one random catalogue returns HTTP 500 on every GraphQL request**,
while the others work normally. The failure persists for the lifetime of the container —
it does **not** self-heal.

```
POST /correlation/graphql 500   <- broken catalogue, every request
POST /expression/graphql  200
POST /fixture/graphql     200
POST /mutation/graphql    200
POST /protein/graphql     200
```

The 500 body is:

```json
{
  "detail": "Please notify the systems admin - ",
  "message": "resource_already_exists_exception: [resource_already_exists_exception] Reason: index [arranger-sets/8GNaFWK1S1OGygDNVeLNLQ] already exists",
  "type": "system/unspecified-internal-error"
}
```

Boot logs show the corresponding init-time error and the warning that several instances
are racing on shared process resources:

```
------
Configuring Sets index: arranger-sets
  - Attempting to create Sets index "arranger-sets"...
resource_already_exists_exception: [resource_already_exists_exception] Reason: index [arranger-sets/...] already exists
------
Error thrown while generating the GraphQL endpoints.
  - Catalogue mounted at /correlation
  ...
(node:41) MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
  11 SIGINT listeners added to [process]. MaxListeners is 10.
(node:41) MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
  11 SIGTERM listeners added to [process].
```

## Root cause

Each catalogue is initialized as its own Arranger instance, and **every instance
independently configures the shared `arranger-sets` index** at startup
("Configuring Sets index: arranger-sets" appears once per catalogue). The create path is:

1. check whether `arranger-sets` exists;
2. if not, create it.

This check-then-create is **not atomic across the concurrently-initializing instances**.
When two instances pass the existence check before either creates the index, the loser's
`PUT` throws `resource_already_exists_exception`. Crucially, that exception is **not
caught** — it aborts GraphQL-endpoint generation for that one catalogue
("Error thrown while generating the GraphQL endpoints"), leaving the catalogue mounted but
permanently returning 500.

### Evidence this is a concurrency race, not a "stale index" problem

- The `arranger-sets` index **already existed** before the failing boot (its ES UUID
  `8GNaFWK1S1O…` is stable across restarts), yet a catalogue still threw — so
  **pre-creating the index does not prevent the failure**.
- The failure is **non-deterministic**: a plain `docker restart arranger` reshuffles which
  catalogue (if any) loses the race. Across restarts we observed 0 failures one boot and
  1 failure the next, with the index present both times.
- The `MaxListenersExceededWarning` (11 SIGINT/SIGTERM listeners vs. the default limit of 10)
  confirms multiple instances are initializing against the same process/ES resources.

## Impact

- A random catalogue is dead on each boot, with no recovery short of a restart (which may
  break a different catalogue).
- `GET /ping` returns `200` even while a catalogue is 500ing, so a server-level health
  probe reports the container healthy and **masks the outage** from orchestration.

## Suggested fixes (upstream)

Any one of these would resolve it:

1. **Make sets-index creation idempotent** — treat `resource_already_exists_exception` as
   success instead of letting it propagate (the index existing is the desired end state).
2. **Configure the shared sets index once**, before mounting catalogues, rather than once
   per catalogue instance.
3. **Serialize** per-catalogue sets-index configuration so the check-then-create cannot
   interleave.

## Prelude mitigation (in this repo)

We cannot fix the image, so we do two things:

- **Detect it.** The `arranger` service healthcheck in `docker-compose.yml` no longer probes
  only `/ping`. It POSTs `{ __typename }` to every catalogue's GraphQL endpoint, so a
  catalogue that lost the race marks the whole container `unhealthy` (visible in
  `docker ps`, and it blocks dependents that wait on `condition: service_healthy`).
- **Recover it.** When the healthcheck reports `unhealthy`, restart the Arranger container:

  ```bash
  docker restart arranger
  ```

  Re-roll until all catalogues come up green (confirm with `docker ps` showing `healthy`).

## Reproduction

1. Run `arranger-search-server:6de99b38` with 5+ catalogues in `multiple` mode against a
   shared Elasticsearch.
2. Start the container (repeat a few times — it's probabilistic).
3. After boot, POST `{"query":"{ __typename }"}` to each `/{catalogue}/graphql`.
4. Observe that a random catalogue returns 500 with `resource_already_exists_exception`
   for `arranger-sets`, persisting until restart.

# Path to Production

This document identifies the gaps between the current workshop/demo state and a production-ready public resource, then outlines how to address each one. Written for small teams with big data problems who need to move from `make demo` on a laptop to a hosted, maintained service.

---

## Current State

Phase 1 hardening has been completed. The stack now externalizes credentials, binds internal ports to localhost, enforces resource limits, includes health checks and log rotation on all services, and ships with automated backup tooling. Workshop defaults still work out of the box — production deployments override them via a `.env` file.

The remaining work (Phase 2–4) focuses on deeper hardening (non-root containers, network segmentation, multi-stage builds) and the Podman/Kubernetes migration path.

---

## A) Gap Analysis

### 1. ~~Secrets & Credentials~~ — RESOLVED

All credentials in `docker-compose.yml` now use `${VARIABLE:-default}` syntax. Workshop defaults are preserved as fallbacks so `make demo` works without a `.env` file. For production:

- `.env.example` ships with the repo as a template
- `.env` is git-ignored (added to `.gitignore`)
- `apps/conductor` CLI defaults still use workshop values (acceptable — CLI is a local tool, not a deployed service)

### 2. ~~No Restart Policies~~ — RESOLVED

All persistent services (`postgres`, `elasticsearch`, `arranger-datatable1`, `stage`) have `restart: unless-stopped`. The short-lived `setup` and `conductor-cli` services intentionally have no restart policy.

### 3. ~~Ports Exposed to Host~~ — RESOLVED

Internal services are bound to `127.0.0.1`:

| Port | Service | Binding |
|---|---|---|
| 3000 | Stage (portal UI) | `0.0.0.0:3000` — exposed for nginx |
| 5050 | Arranger (search API) | `127.0.0.1:5050` — localhost only |
| 5435 | PostgreSQL | `127.0.0.1:5435` — localhost only |
| 9200 | Elasticsearch | `127.0.0.1:9200` — localhost only |

For maximum production lockdown, remove the `ports:` lines from PostgreSQL, Elasticsearch, and Arranger entirely — they remain reachable over the Docker network by service name.

### 4. ~~No Resource Limits~~ — RESOLVED

All services have `deploy.resources.limits`:

| Service | Memory | CPUs |
|---|---|---|
| Elasticsearch | 3G (2G reserved) | 2 |
| PostgreSQL | 1G | 1 |
| Arranger | 512M | 1 |
| Stage | 1G | 1 |

### 5. ~~CORS Wide Open~~ — RESOLVED

`apps/stage/next.config.js` now reads `process.env.CORS_ALLOWED_ORIGIN` (defaults to `*` for development). Methods restricted to `GET,POST,OPTIONS`; headers restricted to `Content-Type,Authorization`. Set `CORS_ALLOWED_ORIGIN` in `.env` for production.

### 6. No TLS / HTTPS (HIGH — requires deployment action)

All traffic is HTTP. Nginx config templates are provided in `setup/configs/nginxConfigs/` with inline documentation, but TLS setup requires a domain, DNS records, and Certbot — steps that must be done on the production server. See [09-Deployment-with-Nginx.md](../09-Deployment-with-Nginx.md).

### 7. ~~Missing Health Checks~~ — RESOLVED

All services now have health checks:

| Service | Method |
|---|---|
| PostgreSQL | `pg_isready` |
| Elasticsearch | `curl /_cluster/health` |
| Arranger | `wget http://localhost:5050/` |
| Stage | `wget http://localhost:3000/` |
| Setup | file-based (`test -f`) |

### 8. ~~No Logging Strategy~~ — RESOLVED

All long-running services have log rotation: `max-size: 50m`, `max-file: 10` (500 MB cap per service). Centralized log aggregation is not in scope for this stack but can be layered on top.

### 9. ~~No Backups~~ — RESOLVED

- `setup/scripts/backup.sh` — PostgreSQL dump with 30-day retention
- `make backup` — Makefile target for manual backups
- Cron setup documented in [09-Deployment-with-Nginx.md](../09-Deployment-with-Nginx.md)

Elasticsearch snapshot backups are not yet automated (the index can be rebuilt from PostgreSQL via `conductor index-db`).

### 10. No Network Segmentation (MEDIUM — not yet implemented)

All services share a single flat `platform-network`. Any container can reach any other container. A compromised Stage container could query PostgreSQL directly.

### 11. Conductor Dockerfile Runs as Root (MEDIUM — not yet implemented)

`apps/conductor/Dockerfile` has no `USER` directive. The container runs as root, which increases the blast radius if the container is compromised.

### 12. No Multi-Stage Build for Stage (LOW — not yet implemented)

The Stage Dockerfile includes build tooling (TypeScript compiler, webpack, etc.) in the final image. A multi-stage build would reduce the image size and attack surface.

### 13. Image Tags Not Reproducible (LOW — not yet implemented)

Locally-built images are tagged `stageimage:1.0` and `conductor-cli:1.0`. These tags don't change across builds, making it impossible to track which code is running.

---

## B) Addressing the Gaps

### Phase 1 — Minimum Viable Production ✅ COMPLETE

All Phase 1 items have been implemented in the codebase. These changes take the stack from "works on my laptop" to "safely hosted on a single server."

#### What was done

| Item | Change | Where |
|---|---|---|
| **Externalize secrets** | All credentials use `${VAR:-default}` syntax; `.env.example` template shipped; `.env` git-ignored | `docker-compose.yml`, `.env.example`, `.gitignore` |
| **Restart policies** | `restart: unless-stopped` on all persistent services | `docker-compose.yml` |
| **Localhost-bound ports** | PostgreSQL, Elasticsearch, Arranger bound to `127.0.0.1`; Stage remains exposed for nginx | `docker-compose.yml` |
| **Resource limits** | Memory and CPU caps on all services (ES: 3G/2cpu, PG: 1G/1cpu, Arranger: 512M/1cpu, Stage: 1G/1cpu) | `docker-compose.yml` |
| **CORS lockdown** | Configurable via `CORS_ALLOWED_ORIGIN` env var; methods restricted to `GET,POST,OPTIONS`; headers restricted to `Content-Type,Authorization` | `apps/stage/next.config.js` |
| **Health checks** | Added to Arranger (`wget`) and Stage (`wget`); PostgreSQL and Elasticsearch already had them | `docker-compose.yml` |
| **Log rotation** | `max-size: 50m`, `max-file: 10` on all services (500 MB cap each) | `docker-compose.yml` |
| **Automated backups** | `setup/scripts/backup.sh` with 30-day retention; `make backup` target | `setup/scripts/backup.sh`, `Makefile` |

#### What requires deployment action (not code changes)

These items are documented and tooling is provided, but they require action on the production server:

| Item | What to do | Reference |
|---|---|---|
| **Create `.env` file** | `cp .env.example .env` and set strong random passwords | [09-Deployment-with-Nginx.md](../09-Deployment-with-Nginx.md) |
| **Enable HTTPS** | Deploy nginx config templates, run Certbot for TLS certificates | `setup/configs/nginxConfigs/`, [09-Deployment-with-Nginx.md](../09-Deployment-with-Nginx.md) |
| **DNS records** | Create A/CNAME records for portal and Arranger subdomains | [09-Deployment-with-Nginx.md](../09-Deployment-with-Nginx.md) |
| **Backup cron job** | `crontab -e` → `0 2 * * * /path/to/setup/scripts/backup.sh` | `setup/scripts/backup.sh` |
| **Firewall** | Allow only ports 80/443 externally | [09-Deployment-with-Nginx.md](../09-Deployment-with-Nginx.md) |

---

### Phase 2 — Hardening (NOT YET IMPLEMENTED)

#### 2.1 Fix Conductor Dockerfile (run as non-root)

```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && chmod +x dist/main.js
RUN apk add --no-cache curl

# Run as non-root
RUN addgroup -g 1001 -S appuser && adduser -S appuser -u 1001
USER appuser

CMD ["node", "dist/main.js"]
```

#### 2.2 Multi-Stage Build for Stage

```dockerfile
# Build stage
FROM node:lts-alpine AS builder
WORKDIR /usr/src
COPY apps/stage/package*.json ./
RUN npm ci
COPY apps/stage ./
RUN rm -f ./public/docs
COPY docs ./public/docs
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# Runtime stage — no build tools, smaller image
FROM node:lts-alpine
RUN apk --no-cache add shadow && addgroup -g 9999 app && adduser -u 9999 -G app -S app
USER app
WORKDIR /usr/src
COPY --from=builder --chown=app:app /usr/src/.next ./.next
COPY --from=builder --chown=app:app /usr/src/public ./public
COPY --from=builder --chown=app:app /usr/src/node_modules ./node_modules
COPY --from=builder --chown=app:app /usr/src/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

#### 2.3 Network Segmentation

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true    # No external access

services:
  stage:
    networks: [frontend, backend]
  arranger-datatable1:
    networks: [backend]
  elasticsearch:
    networks: [backend]
  postgres:
    networks: [backend]
```

The `internal: true` flag prevents backend containers from reaching the internet, and prevents external access to them. Stage bridges both networks.

#### 2.4 Rate Limiting (nginx)

Add to the nginx site config:

```nginx
limit_req_zone $binary_remote_addr zone=portal:10m rate=10r/s;

server {
    server_name portal.yourlab.org;
    location / {
        limit_req zone=portal burst=20 nodelay;
        proxy_pass http://localhost:3000;
        include proxy_params;
    }
}
```

---

### Phase 3 — Podman & Kubernetes Path (NOT YET IMPLEMENTED)

Your technical director's interest in Podman is well-founded. Podman reads Docker Compose files, runs without a root daemon, and can export to Kubernetes manifests — a clean progression from single-server to orchestrated deployment.

#### 3.1 How Podman Fits In

```
Workshop (now)          Production (Phase 1-2)       Scaled (Phase 3)
─────────────────       ──────────────────────       ─────────────────
Docker Compose    →     Podman Compose         →     Kubernetes
make demo               podman compose up            kubectl apply
localhost:3000          portal.yourlab.org           portal.yourlab.org
                        + nginx + TLS                + Ingress + TLS
                        single server                multi-node cluster
```

#### 3.2 Podman Compatibility with This Stack

The current `docker-compose.yml` is **largely Podman-compatible** with a few adjustments:

| Feature | Docker | Podman | Action Needed |
|---|---|---|---|
| `depends_on: condition:` | Works | Works (use Docker Compose v2 binary as provider) | Install `docker-compose` v2 alongside Podman |
| `platform: linux/amd64` | Works | Works (emulation via QEMU on ARM) | None |
| Named volumes | Works | Works | None |
| Bind mounts on SELinux | Transparent | Needs `:z` suffix | Add `:z` to volume mounts on RHEL/Fedora |
| Ports < 1024 | Root daemon handles it | Rootless cannot bind | Use nginx on host for 80/443 (already planned) |
| `vm.max_map_count` | Requires host sysctl | Same | Same sysctl, documented in FAQ |
| Healthchecks | Works | Works | None |
| Profiles | Works | Works (with Compose v2 binary) | None |
| `restart: unless-stopped` | Works | Works, or use Quadlet/systemd for better integration | Consider Quadlet for production |

**Key recommendation:** Use `podman compose` backed by the Docker Compose v2 binary (not `podman-compose` the Python tool). This gives full Compose v2 compatibility. Set up:

```bash
# Install Podman
sudo apt install podman

# Install Docker Compose v2 binary (Podman uses it as a provider)
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Enable Podman socket (so Compose can talk to Podman)
systemctl --user enable --now podman.socket
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Use exactly like Docker Compose
podman compose up -d
```

#### 3.3 Podman to Kubernetes Export

This is the key value proposition your technical director is interested in. Podman can export running containers as Kubernetes manifests:

```bash
# Export a running pod to Kubernetes YAML
podman generate kube elasticsearch > k8s/elasticsearch.yaml
podman generate kube postgres > k8s/postgres.yaml
podman generate kube arranger-datatable1 > k8s/arranger.yaml
podman generate kube stage > k8s/stage.yaml

# Reverse: deploy K8s YAML back to Podman
podman play kube k8s/elasticsearch.yaml
```

**Important limitations** — the generated manifests are a starting point, not production-ready K8s:

| What's generated | What's NOT generated |
|---|---|
| Pod/Deployment specs | Ingress (your nginx config) |
| Liveness probes (from healthchecks) | Readiness probes |
| Container specs with ports | Services for cross-pod networking |
| Env vars (inline, plain text) | Secrets / ConfigMaps |
| PVC stubs (from named volumes) | StorageClass, size, access modes |

You will need to manually add:
- `Ingress` resource (replaces nginx reverse proxy)
- `Secret` resources (replaces `.env` file)
- `readinessProbe` on each container
- `Service` resources for internal DNS
- `PersistentVolumeClaim` with proper storage classes
- `NetworkPolicy` for segmentation

#### 3.4 Podman-Specific Gotchas for This Stack

**Elasticsearch** needs `vm.max_map_count=262144` on the host regardless of Docker vs Podman:
```bash
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

**Rootless Podman** cannot bind to ports below 1024. This isn't a problem because nginx on the host handles ports 80/443 and proxies to the container ports (3000, 5050, etc.).

**SELinux** (RHEL/Fedora): bind mounts need `:z`:
```yaml
volumes:
  - ./setup:/setup:z
  - ./data:/data:z
```

---

### Phase 4 — Production Operations Checklist

Once deployed, ongoing maintenance:

| Task | Frequency | Tool |
|---|---|---|
| Backups (PostgreSQL + ES snapshots) | Daily | Cron + `backup.sh` |
| TLS certificate renewal | Auto (Certbot) | Certbot timer |
| Log review | Weekly | `journalctl` / log aggregator |
| Dependency updates (Docker images) | Monthly | Pin + test + redeploy |
| Credential rotation | Quarterly | Update `.env`, restart services |
| Disk space monitoring | Continuous | `df` alerts or monitoring agent |
| Uptime monitoring | Continuous | UptimeRobot / Healthchecks.io (free tier) |

---

## Summary: Effort vs Impact

```
                        HIGH IMPACT
                            │
    Externalize secrets ✅  │   ✅ Localhost-bound ports
    Restart policies ✅     │   ✅ Automated backups
    Resource limits ✅      │   ✅ CORS lockdown
    Health checks ✅        │   ✅ Log rotation
                            │   ⬜ HTTPS/TLS (deploy action)
           ─────────────────┼───────────────────
                            │
    Multi-stage builds ⬜   │   ⬜ Network segmentation
    Image tagging ⬜        │   ⬜ Rate limiting
    Conductor non-root ⬜   │   ⬜ Podman migration
                            │
                        LOW IMPACT
    LOW EFFORT                          HIGH EFFORT

    ✅ = implemented     ⬜ = not yet implemented
```

Phase 1 is complete — covering ~80% of production risk. The remaining high-impact item (HTTPS/TLS) requires deployment action on the production server using the nginx templates and documentation already provided. Phase 2–4 items are lower priority and can be addressed incrementally.

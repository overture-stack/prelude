# FAQ

## Why am I getting a zero-byte download when exporting from the data table?

**Symptom:** Selecting rows in the data table and clicking "Download" produces a file with zero bytes.

**Cause:** The `rowIdFieldName` is misconfigured or inconsistent across the three places it must be defined. Arranger uses this field to identify which rows to export. If the field name doesn't match a real field in your Elasticsearch index, Arranger can't find the selected rows and returns empty data.

**The three places that must match:**

### 1. Docker Compose environment variable

In `docker-compose.yml`, set the export row ID field for your datatable:

```yaml
NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD: submission_metadata.submission_id
```

### 2. Arranger config `table.json`

In `setup/configs/arrangerConfigs/<your-datatable>/table.json`:

```json
{
  "rowIdFieldName": "submission_metadata.submission_id"
}
```

### 3. Stage app (`config.ts` fallback)

In `apps/stage/global/config.ts`, the fallback default for each datatable must also match:

```typescript
NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD:
  publicConfig.NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD || 'submission_metadata.submission_id',
```

### How to verify

1. Check that the field you're referencing actually exists in your Elasticsearch mapping (`setup/configs/elasticsearchConfigs/<your-datatable>-mapping.json`).
2. Ensure all three locations above use the **exact same field path**.
3. A common mistake is using `submitter_id` instead of `submission_id` — these are different fields and only `submission_id` exists in the default schema.

### After fixing

- Rebuild the Stage app (`docker compose up --build stage`) so the new environment variable is picked up.
- If you changed the Arranger config, restart the setup service to re-register the config, then restart Arranger.

---

## Nginx

### Should nginx run as a Docker container or be installed separately?

**Recommendation: Keep nginx separate from Docker Compose.**

Nginx is a host-level concern — it manages SSL certificates, listens on ports 80/443, and routes traffic to all services on the machine. Running it as a container adds complexity (certificate volume mounts, host networking, port conflicts with other containers) with little benefit.

Install nginx directly on the host:

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

Use the templates in `setup/configs/nginxConfigs/` as your starting point.

### Where are the nginx config templates?

Pre-built templates live in `setup/configs/nginxConfigs/`:

| File | Purpose |
|---|---|
| `nginx.conf` | Main nginx config with gzip, security headers, logging |
| `proxy_params` | Shared proxy settings (timeouts, headers, WebSocket support) |
| `portal.conf` | Site template with placeholder domains and ports |

To deploy:

```bash
sudo cp setup/configs/nginxConfigs/nginx.conf /etc/nginx/nginx.conf
sudo cp setup/configs/nginxConfigs/proxy_params /etc/nginx/proxy_params
sudo cp setup/configs/nginxConfigs/portal.conf /etc/nginx/sites-available/portal
# Edit /etc/nginx/sites-available/portal — replace YOUR_DOMAIN with your actual domain
sudo ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### How do I set up SSL/HTTPS?

Use Certbot with Let's Encrypt. After your nginx config is working on port 80:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d portal.yourlab.org -d datatable1-arranger.portal.yourlab.org
```

Certbot automatically modifies your nginx config to handle HTTPS and sets up auto-renewal.

### I updated my docker-compose API URLs but the portal still can't reach Arranger

When deploying behind nginx, Stage needs the **public** Arranger URL, not the internal Docker network address.

**Before nginx (local dev):**
```yaml
NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: http://arranger-datatable1:5050
```

**Behind nginx (production):**
```yaml
NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: https://datatable1-arranger.portal.yourlab.org
```

After changing this, rebuild Stage: `docker compose up --build stage`.

### How do I test my nginx config without breaking anything?

Always validate before reloading:

```bash
sudo nginx -t
```

This checks syntax and reports errors without affecting the running server. Only reload after a successful test:

```bash
sudo systemctl reload nginx
```

### What DNS records do I need?

At minimum, one A/CNAME record for your main domain, plus a CNAME for each service subdomain:

| Type | Hostname | Points To |
|---|---|---|
| A or CNAME | `portal.yourlab.org` | Your server IP |
| CNAME | `datatable1-arranger.portal.yourlab.org` | `portal.yourlab.org` |

Add more CNAMEs for additional Arranger instances or Elasticsearch if you choose to expose it.

### Should I expose Elasticsearch through nginx?

**Usually no.** Arranger queries Elasticsearch over the internal Docker network — there is no need to expose it publicly. Only add the `es.*` server block if external tools (e.g. Kibana on another machine) need direct access. If you do expose it, change the default Elasticsearch password and consider IP-restricting the server block:

```nginx
server {
    server_name es.portal.yourlab.org;
    allow 192.168.1.0/24;  # your trusted network
    deny all;
    location / {
        proxy_pass http://localhost:9200/;
        include proxy_params;
    }
}
```

### I'm getting 502 Bad Gateway

This means nginx can reach the server but the upstream service isn't responding. Common causes:

1. **Service not running:** Check `docker compose ps` — is the target container up?
2. **Wrong port:** Verify the `proxy_pass` port matches the port the Docker service exposes.
3. **Docker not listening on localhost:** By default, Docker Compose services are exposed on `0.0.0.0`. If you've restricted binding (e.g. `127.0.0.1:3000:3000`), make sure nginx is proxying to the correct interface.

Check nginx error logs for details:

```bash
sudo tail -f /var/log/nginx/error.log
```

---

## Cross-Platform Compatibility

### What are the prerequisites for running this workshop?

| Prerequisite | Version | Why |
|---|---|---|
| **Docker Desktop** (macOS/Windows) or **Docker Engine** (Linux) | 28.0.0+ | Runs all services (Elasticsearch, PostgreSQL, Arranger, Stage) |
| **Docker Compose** | v2 (bundled with Docker Desktop) | Orchestrates multi-container deployment |
| **make** | Any | Runs Makefile targets (`make demo`, `make platform`, etc.) |
| **bash** | 3.2+ | Shell scripts and Makefile (`SHELL := /bin/bash`) |
| **git** | Any | Clone the repository |
| **curl** | Any | Used inside containers for health checks (pre-installed on most systems) |
| **bc** | Any | Numeric comparisons in pre-deployment checks |

**You do NOT need Node.js, npm, or TypeScript installed locally.** All Node builds happen inside Docker containers. The only tools you need on the host are Docker, make, bash, and git.

### Docker resource requirements

The pre-deployment check (`make phase0`) validates these minimums:

| Resource | Minimum | How to adjust |
|---|---|---|
| CPU cores | 8 | Docker Desktop → Settings → Resources |
| Memory | 8 GB | Docker Desktop → Settings → Resources |
| Disk space | 64 GB | Docker Desktop → Settings → Resources → Virtual disk limit |

On Linux with Docker Engine (no Desktop), CPU and memory are the host's full resources. Adjust via `/etc/docker/daemon.json` if needed.

### How do I run this on Windows?

Windows requires **WSL2** (Windows Subsystem for Linux). Native Windows (PowerShell/CMD) is not supported because the project uses bash scripts and a Makefile.

**Setup:**

```powershell
# 1. Install WSL2 (run in PowerShell as Administrator)
wsl --install

# 2. Restart your machine

# 3. Install Docker Desktop from docker.com
#    Enable "Use the WSL 2 based engine" in Settings → General

# 4. Open a WSL2 terminal (Ubuntu) and clone the repo
git clone <repo-url>
cd prelude
make demo
```

**Important:** Always run commands from the WSL2 terminal, not from PowerShell or CMD. The repository should live on the WSL2 filesystem (`~/prelude`), not on the Windows filesystem (`/mnt/c/...`), to avoid severe performance issues with Docker bind mounts.

### I'm on Windows and `make` is not found

`make` is not installed by default in WSL2 Ubuntu. Install it with:

```bash
sudo apt update && sudo apt install make
```

### I'm on macOS and `make` is not found

Install Xcode Command Line Tools:

```bash
xcode-select --install
```

This installs `make`, `git`, and other standard developer tools.

### Docker is slow on Apple Silicon (M1/M2/M3/M4)

Some images in the stack (Elasticsearch, PostgreSQL, Arranger) target `linux/amd64` and run under emulation on ARM Macs. This is handled transparently by Docker Desktop but may cause:

- Slower startup times (especially Elasticsearch)
- Higher CPU and memory usage than on Intel machines

**Mitigation:** Allocate at least 10 GB memory (not the minimum 8 GB) to Docker Desktop on Apple Silicon. There is no workaround until upstream images publish native ARM builds.

### `diskutil` errors or disk space check always warns on Linux

The pre-deployment check uses `diskutil` (macOS-only) with a fallback to `df` for Linux/WSL2. If you see incorrect disk space warnings, verify manually:

```bash
df -h /
```

If you have sufficient space, answer `y` to continue.

### Docker says "Cannot connect to the Docker daemon"

Docker Desktop (or Docker Engine on Linux) must be running before you run `make`.

**macOS/Windows:** Open Docker Desktop and wait for it to finish starting (the whale icon in the menu bar/system tray should be steady, not animating).

**Linux:**
```bash
sudo systemctl start docker
```

To auto-start Docker on boot:
```bash
sudo systemctl enable docker
```

### Port conflicts — "address already in use"

The stack uses these host ports:

| Port | Service |
|---|---|
| 3000 | Stage (portal UI) |
| 5050 | Arranger (search API) |
| 5435 | PostgreSQL |
| 9200 | Elasticsearch |

If another application is using one of these ports, you'll get a bind error. Find and stop the conflicting process:

```bash
# Find what's using port 3000 (example)
lsof -i :3000        # macOS/Linux
netstat -ano | findstr :3000  # Windows (PowerShell)
```

Or change the host port in `docker-compose.yml` (e.g. `3001:3000` to map port 3001 on the host to 3000 in the container).

### `sort -V` not working (version sort)

On very old Linux distributions, `sort` may not support the `-V` (version sort) flag. The pre-deployment check requires GNU coreutils 7.0+. Update with:

```bash
sudo apt update && sudo apt install coreutils
```

This is not an issue on macOS (Homebrew coreutils) or modern Linux distributions.

### Elasticsearch won't start — "max virtual memory areas vm.max_map_count is too low"

This is a common issue on Linux hosts (including WSL2). Elasticsearch requires a higher memory map limit than the default.

**Temporary fix (resets on reboot):**
```bash
sudo sysctl -w vm.max_map_count=262144
```

**Permanent fix:**
```bash
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**WSL2 users:** The permanent fix goes in `/etc/sysctl.conf` inside your WSL2 distribution. Alternatively, create or edit `%USERPROFILE%\.wslconfig` in Windows:

```ini
[wsl2]
kernelCommandLine = sysctl.vm.max_map_count=262144
```

Then restart WSL2: `wsl --shutdown` from PowerShell.

### `docker compose` vs `docker-compose` — which do I use?

Use `docker compose` (with a space). The hyphenated `docker-compose` is the legacy v1 Python-based tool, which is no longer maintained. Docker Compose v2 is a Go plugin bundled with Docker Desktop and uses the space syntax. The Makefile already uses `docker compose`.

---

## Production & Deployment

### How do I move this from a demo to a production deployment?

See [production-readiness.md](production-readiness.md) for the full gap analysis and phased plan. The short version:

1. **Externalize secrets** — move passwords out of `docker-compose.yml` into a `.env` file (git-ignored)
2. **Stop exposing internal ports** — remove `ports:` from PostgreSQL, Elasticsearch, and Arranger
3. **Add restart policies** — `restart: unless-stopped` on every long-running service
4. **Enable HTTPS** — deploy nginx + Certbot using the templates in `setup/configs/nginxConfigs/`
5. **Set up automated backups** — daily `pg_dump` and Elasticsearch snapshots via cron

### Are the default passwords safe for production?

**No.** The `docker-compose.yml` ships with hardcoded passwords (`admin123`, `myelasticpassword`, `your-secure-secret-here`) that are visible in the git repository. These are intentionally simple for the workshop.

For production, create a `.env` file with strong random passwords:

```bash
# Generate strong passwords
openssl rand -base64 32   # for POSTGRES_PASSWORD
openssl rand -base64 32   # for ES_PASSWORD
openssl rand -base64 48   # for NEXTAUTH_SECRET
```

Reference them in `docker-compose.yml` with `${VARIABLE_NAME}` syntax. Never commit `.env` to git.

### Can I use Podman instead of Docker?

Yes. Podman reads Docker Compose files and is a drop-in replacement for most use cases. It has two advantages for production:

1. **Rootless by default** — no privileged daemon running on the host
2. **Kubernetes export** — running containers can be exported as K8s manifests via `podman generate kube`

To use Podman with this stack:

```bash
# Install Podman and Docker Compose v2 binary
sudo apt install podman
# Install docker-compose v2 (Podman delegates to it)

# Enable Podman socket
systemctl --user enable --now podman.socket
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Run exactly like Docker
podman compose up -d
```

**Gotchas:** Rootless Podman can't bind ports below 1024 (use nginx on the host), and SELinux hosts need `:z` on bind mounts. See [production-readiness.md](production-readiness.md) for the full Podman section.

### Why can't I just expose Docker ports directly instead of using nginx?

You technically can, but it means:

- **No HTTPS** — browsers will warn users, and data (including auth tokens) is sent in cleartext
- **Port numbers in URLs** — users must type `http://yourserver:3000` instead of `https://portal.yourlab.org`
- **No rate limiting** — anyone can flood your Elasticsearch with expensive queries
- **All services exposed** — PostgreSQL (5435) and Elasticsearch (9200) are reachable from the internet

Nginx solves all of these with a single config file. It's the minimum required for any publicly accessible deployment.

### How do I back up my data?

**PostgreSQL (research data):**
```bash
docker exec postgres pg_dump -U admin -Fc overtureDb > backup-$(date +%Y%m%d).dump
```

**Restore:**
```bash
docker exec -i postgres pg_restore -U admin -d overtureDb < backup-20260325.dump
```

**Elasticsearch (search indices):** Indices can be rebuilt from PostgreSQL data using Conductor, so PostgreSQL is the authoritative backup. If you want faster recovery without re-indexing:

```bash
# Create snapshot repository (one-time setup)
curl -X PUT "localhost:9200/_snapshot/backups" -H 'Content-Type: application/json' \
  -d '{"type":"fs","settings":{"location":"/backups"}}'

# Take snapshot
curl -X PUT "localhost:9200/_snapshot/backups/snap_$(date +%Y%m%d)"
```

Automate with a daily cron job. See `production-readiness.md` for a complete backup script.

### What monitoring should I set up?

For a small team, start simple:

| What | Tool | Cost |
|---|---|---|
| Uptime checks (is the portal responding?) | [UptimeRobot](https://uptimerobot.com) or [Healthchecks.io](https://healthchecks.io) | Free tier |
| Disk space alerts | Cron + `df` + email | Free |
| Container restarts | `docker events` or `podman events` piped to a log | Free |
| Log review | `docker compose logs --since 24h` weekly | Free |

You do not need Prometheus, Grafana, or Datadog to start. Add those when you have more than one server or more than one team member doing operations.

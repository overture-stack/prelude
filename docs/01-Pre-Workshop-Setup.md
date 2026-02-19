# Pre-Workshop Setup

Complete these steps **before** arriving at the workshop. Downloading Docker images on conference Wi-Fi is slow and unreliable, doing this ahead of time ensures you can start the hands-on portion immediately.

## Prerequisites

You will need:

- **Basic command line familiarity:** navigating directories, running commands
- **A laptop with admin privileges**
- **At least 10 GB of free disk space**

## Required Software

### 1. Git

Verify Git is installed:

```bash
git --version
```

If not installed, download from [git-scm.com](https://git-scm.com/downloads).

### 2. Docker Desktop

Verify Docker is installed and running:

```bash
docker --version
docker compose version
```

Docker Desktop must be **running** (not just installed). You should see version numbers for both commands. We require Docker 28.0.0 or later.

- **macOS / Windows:** Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
- **Linux:** Follow the [Docker Engine install guide](https://docs.docker.com/engine/install/)

**Docker Desktop Resource Settings:** Ensure Docker has access to adequate resources. Open Docker Desktop → Settings → Resources and verify:

- **CPUs:** 4+ cores (8 recommended)
- **Memory:** 8 GB minimum
- **Disk:** 10 GB+ available

### 3. Windows Users: WSL2

If you are on Windows, WSL2 must be properly configured:

1. Install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install)
2. Use Ubuntu or another Linux distribution within WSL2
3. Enable Docker Desktop's WSL2 integration (Docker Desktop → Settings → Resources → WSL Integration)
4. Run all workshop commands from a Bash terminal inside WSL2

### 4. Node.js (v18+)

Verify Node.js is installed:

```bash
node --version
npm --version
```

If not installed, download the LTS version from [nodejs.org](https://nodejs.org/).

## Clone the Repository

```bash
git clone https://github.com/overture-stack/prelude.git
cd prelude
```

## Pre-Download Docker Images

Pull the required Docker images now to avoid slow downloads during the workshop:

```bash
docker pull alpine/curl:8.8.0
docker pull postgres:15-alpine
docker pull docker.elastic.co/elasticsearch/elasticsearch:7.17.27
docker pull ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
docker pull node:lts-alpine
docker pull node:22-slim
```

### Verify Images Downloaded

```bash
docker images | grep -E "alpine/curl|postgres|elasticsearch|arranger-server|node"
```

You should see all six images listed.

## Optional: Elasticvue

[Elasticvue](https://elasticvue.com/installation) is a browser-based Elasticsearch GUI useful for inspecting indices, browsing documents, and troubleshooting. It is not required but helpful for understanding what's happening inside Elasticsearch during the workshop.

Install it as a browser extension or standalone app.

## Optional: Your Own Data

If you have a tabular dataset you'd like to use during or after the workshop, bring it as a CSV file. During the workshop we will use demo data, but the final section covers adapting the portal to your own dataset.

## Verification Checklist

Before the workshop, confirm:

- [ ] `git --version` returns a version number
- [ ] `docker --version` returns 28.0.0 or later
- [ ] `docker compose version` returns a version number
- [ ] Docker Desktop is running
- [ ] `node --version` returns v18 or later
- [ ] All six Docker images are downloaded (`docker images`)
- [ ] The repository is cloned and you can `cd` into it
- [ ] (Windows only) WSL2 is configured and Docker integration is enabled

> **Troubleshooting:** If you run into issues, reach out before the workshop via the [community support channels](https://docs.overture.bio/community/support) or email [contact@overture.bio](mailto:contact@overture.bio).

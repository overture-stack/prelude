# Workshop

This workshop has been developed as part of the 19th Annual International Biocuration Conference, it will guide you through building a foundational data discovery portal for tabular CSV data using Elasticsearch, Arranger, and Stage.

![Demo search and aggregation](images/workshop-portal-preview.png)

**Objectives:**

1. Deploy a functional data discovery portal using Elasticsearch, GraphQL, Arranger, and Stage
2. Configure search interfaces and indices tailored to tabular datasets
3. Gain familiarity with the tools needed to adapt this portal to your own data
4. Understand deployment options for making portals accessible on institutional networks and beyond

:::caution Complete setup before arriving
Downloading Docker images on conference Wi-Fi is slow and unreliable. Complete the prerequisites below at home or in your office before the session starts.
:::

## Prerequisites

The following software must be installed and verified before the workshop:

<details>
<summary><strong>**1. Git**, `git --version` returns a version number</strong></summary>

Download from [git-scm.com](https://git-scm.com/downloads) if the command is not recognised.

</details>

<details>
<summary><strong>**2. Docker Desktop** (`28.0.0` or later)</strong></summary>

- **macOS / Windows:** Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
- **Linux:** Follow the [Docker Engine install guide](https://docs.docker.com/engine/install/)

Once installed, open Docker Desktop → Settings → Resources and set:

- **CPUs:** 4+ cores (8 recommended)
- **Memory:** 8 GB minimum
- **Disk:** 10 GB+ available

Please ensure `docker --version` and `docker compose version` both return version numbers, and Docker Desktop is **running** with **4+ CPUs** and **8 GB+ memory** allocated

</details>

<details>
<summary><strong>**3. Node.js** (`v18` or later), `node --version` returns a version number</strong></summary>

Download the LTS version from [nodejs.org](https://nodejs.org/).

Verify both Node.js and npm are installed:

```bash
node --version
npm --version
```

</details>

<details>
<summary><strong>**4. Docker images pre-downloaded:** run the pulls below before the workshop</strong></summary>

Pull the required Docker images now to avoid slow downloads during the workshop:

```bash
docker pull alpine/curl:8.8.0
docker pull postgres:15-alpine
docker pull docker.elastic.co/elasticsearch/elasticsearch:7.17.27
docker pull ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
docker pull node:lts-alpine
docker pull node:22-slim
```

Verify all six downloaded:

```bash
docker images | grep -E "alpine/curl|postgres|elasticsearch|arranger-server|node"
```

You should see all six images listed.

</details>

<details>
<summary><strong>**5. Repository cloned:** `git clone https://github.com/overture-stack/prelude.git`</strong></summary>

The `prelude` repository contains everything needed for this workshop: Docker Compose configuration, the Composer and Conductor CLI tools, and sample data. Clone it once before the workshop and you won't need internet access for the hands-on portion.

```bash
git clone https://github.com/overture-stack/prelude.git
cd prelude
```

</details>

<details>
<summary><strong>**6. _(Windows only)_ WSL2 configured** with Docker Desktop integration enabled</strong></summary>

1. Install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install)
2. Use Ubuntu or another Linux distribution within WSL2
3. Enable Docker Desktop's WSL2 integration (Docker Desktop → Settings → Resources → WSL Integration)
4. Run all workshop commands from a **Bash terminal inside WSL2**, not PowerShell or Command Prompt. To open one, search for your Linux distribution (e.g. "Ubuntu") in the Start menu.

</details>

<details>
<summary><strong>7. (Optional) Elasticvue: browser-based Elasticsearch GUI</strong></summary>

[Elasticvue](https://elasticvue.com/installation) is a browser-based Elasticsearch GUI useful for inspecting indices, browsing documents, and troubleshooting. It is not required but helpful for understanding what's happening inside Elasticsearch during the workshop.

Install it as a browser extension or standalone app.

</details>

<details>
<summary><strong>8. (Optional) PostgreSQL GUI client</strong></summary>

A PostgreSQL GUI client is useful for browsing the database during the workshop. It is not required but helpful if you want to inspect the Postgres data directly.

| OS      | Recommended client                        |
| ------- | ----------------------------------------- |
| macOS   | [Postico](https://eggerapps.at/postico2/) |
| Windows | [pgAdmin](https://www.pgadmin.org/)       |
| Linux   | [pgAdmin](https://www.pgadmin.org/)       |

</details>

<details>
<summary><strong>9. (Optional) Bring your own data: CSV file</strong></summary>

If you have a tabular dataset you'd like to use during or after the workshop, bring it as a CSV file. During the workshop we will use demo data, but the final section covers adapting the portal to your own dataset.

</details>

## Verification Checklist

Before the workshop, confirm:

- [ ] `git --version` returns a version number
- [ ] `docker --version` returns 28.0.0 or later
- [ ] `docker compose version` returns a version number
- [ ] Docker Desktop is running
- [ ] `node --version` returns v18 or later
- [ ] All six Docker images are downloaded (`docker images`)
- [ ] The repository is cloned and you can `cd` into it
- [ ] _(Windows only)_ WSL2 is configured and Docker integration is enabled

> **Troubleshooting:** If you run into issues before the workshop, reach out via the [community support channels](https://docs.overture.bio/community/support) or email [contact@overture.bio](mailto:contact@overture.bio).

## Schedule

| Time      | Section                     | Description                                                               |
| --------- | --------------------------- | ------------------------------------------------------------------------- |
| 2:00–2:25 | Introduction & Overview     | Workshop objectives, run the pre-built demo, and architecture walkthrough |
| 2:25–3:20 | Building Your Portal        | Prepare data, generate configurations with Composer, and wire up Docker   |
| 3:20–3:30 | Break                       | Stretch break                                                             |
| 3:30–4:00 | Launch, Customize & Wrap-Up | Load data with Conductor, customize the portal, and discuss next steps    |

## Support

|                         |                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **During the workshop** | Slack Channel support                                                                                                            |
| **Before or after**     | [community support channels](https://docs.overture.bio/community/support) or [contact@overture.bio](mailto:contact@overture.bio) |
| **Bug reports**         | [GitHub Issues](https://github.com/overture-stack/prelude/issues)                                                                |

**Facilitator:** Mitchell Shiell, Ontario Institute for Cancer Research, [mshiell@oicr.on.ca](mailto:mshiell@oicr.on.ca)

# Overture Arranger MCP - Demo & Development Environment

This repository is the central demo environment for building conversational AI capabilities for Overture-based cancer genomics platforms.

<p align="center">
   <img src="https://github.com/user-attachments/assets/32c5c20e-e786-4a2a-9e15-5aca3effe7a0" alt="Portal Preview" width="800">
</p>

## Project Aims

1. **Conversational data discovery** - expose Overture's GraphQL search API through the Model Context Protocol, enabling natural language queries across any Overture deployment
2. **Pathway discovery** - integrate curated gene sets (MSigDB, 50,000+) for conversational pathway analysis alongside genomics data
3. **Local LLM support** - orchestrate MCP servers with local models (LM Studio, Ollama) for privacy-preserving, institutionally deployable workflows
4. **Interactive analysis & visualization** - LLM-generated code execution in sandboxed environments
5. **Federated discovery** - unified queries across distributed Overture instances and external repositories
6. **Platform extensibility** - MCP Integration Cookbook, workshop series, and Overture MCP Registry

## This Demo Environment

The portal hosts four cancer genomics catalogues derived from the Drug Discovery Portal. These are **representative samples of roughly 1,000 rows each**, not the full upstream dataset (which is ~405 million records across 32 cancer types). The samples are small enough to load in seconds on a laptop and are meant for demonstrating and testing the conversational discovery workflow, not for analysis.

| Catalogue         | Description                                                        | Sample scope            |
| ----------------- | ------------------------------------------------------------------ | ----------------------- |
| **`mutation`**    | Gene mutation frequencies with cancer type and hotspot designation | ~1k rows, BRCA only     |
| **`expression`**  | Gene expression profiles relative to normal tissue                 | ~1k rows, 32 cancer types |
| **`correlation`** | Gene-gene correlation patterns                                     | ~1k rows, DLBC only     |
| **`protein`**     | Protein-protein interaction network data                           | ~1k rows                |

Sample coverage is not uniform across catalogues: `expression` spans 32 cancer types, but `mutation` is BRCA-only and `correlation` is DLBC-only. A separate synthetic `fixture` catalogue (44 rows) backs platform testing, and an ICGC-ARGO clinical `donor` catalogue is also loaded.

`make demo` loads these samples automatically (the `demo` profile). To start the same stack empty and upload your own data instead, use `make platform`.

These catalogues are the primary validation environment for **Aim 1** - demonstrating conversational data discovery through the Overture Arranger MCP Server.

## Running the Demo

Clone the repository and start the full stack:

```bash
git clone -b overtureMCP --recurse-submodules https://github.com/overture-stack/prelude.git
cd prelude
make demo
```

The portal will be available at **http://localhost:3000** once deployment completes.

> **Note:** `apps/arranger/` is a git submodule vendoring the [Overture Arranger](https://github.com/overture-stack/arranger) source at a pinned commit, kept for reference and documentation — the demo's search API and MCP server run from the published images in `docker-compose.yml`, not from this checkout. If you cloned without `--recurse-submodules`, run `git submodule update --init` to fetch it.

<details>
<summary><strong>What this command does</strong></summary>

1. Runs system checks (Docker version, available resources)
2. Builds the Stage frontend image
3. Starts all services via Docker Compose
4. Initializes PostgreSQL schemas
5. Creates OpenSearch indices from the pre-configured mappings
6. Loads the sample catalogues into OpenSearch
7. Starts Arranger (search API), the Arranger MCP server, and Stage (portal UI)

When deployment completes, open the portal yourself at **http://localhost:3000** (the stack does not launch a browser for you).

</details>

## Services

Once running, the following long-lived containers are active (all ports bound to `127.0.0.1` only):

| Container      | Port   | Role                                                   |
| -------------- | ------ | ------------------------------------------------------ |
| `stage`        | 3000\* | Portal frontend                                        |
| `arranger`     | 5050   | Search API (GraphQL + introspection endpoints)         |
| `arranger-mcp` | 3100   | MCP server — connect an LLM host at `/mcp`             |
| `opensearch`   | 9200   | Search engine                                          |
| `postgres`     | 5435   | Persistent storage                                     |

\* Stage falls back to `3001` if `3000` is already in use. The `setup` and `conductor-cli` containers also run during startup, then exit once data is loaded.

```bash
docker ps
```

## Stopping and Resetting

Stop all containers:

```bash
make down
```

Stop and wipe all data (full reset):

```bash
make reset
```

## Documentation

Full documentation is available in the [`docs/`](docs/) directory and rendered in the portal UI once running.

## Support

|                 |                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Questions**   | [community support channels](https://docs.overture.bio/community/support) or [contact@overture.bio](mailto:contact@overture.bio) |
| **Bug reports** | [GitHub Issues](https://github.com/overture-stack/prelude/issues)                                                                |

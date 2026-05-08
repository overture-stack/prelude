# Overture Arranger MCP - Demo & Development Environment

This repository is the central demo and development environment for building conversational AI capabilities for Overture-based cancer genomics platforms.

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

The portal hosts four cancer genomics datasets from the Drug Discovery Portal, covering ~405 million records across 32 cancer types:

| Dataset          | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| **Mutations**    | Gene mutation frequencies with cancer type and hotspot designation |
| **Expression**   | Gene expression profiles relative to normal tissue                 |
| **Correlations** | Gene-gene Pearson correlation patterns                             |
| **Proteins**     | Protein-protein interaction network data                           |

These datasets are the primary validation environment for **Aim 1** - demonstrating conversational data discovery through the Overture Arranger MCP Server.

## Running the Demo

Clone the repository and start the full stack:

```bash
git clone --recurse-submodules https://github.com/overture-stack/prelude.git
cd prelude
make demo
```

The portal will be available at **http://localhost:3000** once deployment completes.

<details>
<summary><strong>What this command does</strong></summary>

1. Runs system checks (Docker version, available resources)
2. Builds the Stage frontend image
3. Starts all services via Docker Compose
4. Initializes PostgreSQL schemas
5. Creates Elasticsearch indices from the pre-configured mappings
6. Loads the Drug Discovery Portal sample data into Elasticsearch
7. Starts Arranger (search API) and Stage (portal UI)
8. Opens the portal in your browser automatically

</details>

## Services

Once running, the following containers are active:

| Container             | Port | Role               |
| --------------------- | ---- | ------------------ |
| `stage`               | 3000 | Portal frontend    |
| `arranger-datatable1` | 5050 | Search API         |
| `elasticsearch`       | 9200 | Search engine      |
| `postgres`            | 5435 | Persistent storage |

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

**Lead:** Mitchell Shiell, Ontario Institute for Cancer Research - [mshiell@oicr.on.ca](mailto:mshiell@oicr.on.ca)

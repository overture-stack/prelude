# Overture QuickStart

The Overture QuickStart provides those interested in gaining hands-on experience using an Overture platform a fast and frictionless local installation.

## Rational

With Overture we want to provide new users the following:

|Purpose|Solution|
|---|---|
| **A way to look at it**|[Overture Demo Portal](https://demo.overture.bio/)|
| **A way to try it**| Overture Composer |
| **A way to own it**| [Product Documentation](https://www.overture.bio/documentation/) *and* [Platform Guides](https://github.com/overture-stack/website/pull/385)|

## Getting Started

**1. Download and configure Docker Desktop**

- In Docker Desktop click the cog icon, then resources. Set CPU to `8`, memory to `12GB`, swap to `4GB`, and virtual disk to `128GB`

**2. Clone the QuickStart Repository**

```bash
git clone https://github.com/overture-stack/composer.git && cd composer
```

**3. Run the Docker Compose**

```bash
docker compose up -d
```
Your portal will be accessible from your `localhost:3000`

## Remaining Tasks 

### QuickStart

- [ ] **Indexing Setup Check**

    - The index setup image should check to see if an index already exists, if yes then it should exit out (enabling arranger-server to run) else it should create the index as is

- [ ] **File Centric Indexing**

    - Maestro should index the data in a filecentric fashion, need to investigate if any changes to elasticsearch are required 

- [ ] **Arranger Configurations**

    - Reconfigure based on graphQL naming (post maestro manipulation), update search facets and data table

- [ ] **Arranger JSON Import**

    - Export jsons from elasticsearch and have them imported on startup, replicating arrangers make seed init operations


### Demo Portal

- [ ] **Entry Modal**

    - Create a model that displays on startup providing information to new users on how to use the resource

### Guides

- [ ] Administration Guide Skeleton

- [ ] Finish Download Guide

- [ ] Finish Submission Guide

- [ ] Complete Deployment Guide


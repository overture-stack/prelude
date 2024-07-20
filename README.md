# Overture QuickStart

The Overture QuickStart provides those interested in gaining hands-on experience using an Overture platform a fast and frictionless local installation.

## Getting Started

**1. Download and configure Docker Desktop**

In Docker Desktop click the cog  icon , then resources. We recommend at minimum setting your CPU limit to 8, memory to 8GB, swap to 2GB, with64GB of virtual disk space available. If you have Docker already installed ensure it is up to date.

**2. Clone the QuickStart Repository**

```bash
git clone https://github.com/overture-stack/composer.git && cd composer
```

**3. Run the Docker Compose with attach mode enabled**

```bash
docker compose up --attach conductor
```

Your portal will be accessible from your `localhost:3000`

## Rational

With Overture we want to provide new users the following:

|Purpose|Solution|
|---|---|
| **A way to look at it**|[Overture Demo Portal](https://demo.overture.bio/)|
| **A way to try it**| Overture QuickStart |
| **A way to own it**| [Product Documentation](https://www.overture.bio/documentation/) *and* [Platform Guides](https://github.com/overture-stack/website/pull/385)|

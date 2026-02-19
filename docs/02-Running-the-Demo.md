# Running the Demo

Before building anything from scratch, let's deploy the pre-configured demo portal and see what the end result looks like. This gives you a mental model of what each component does before we dive into configuration details.

## Starting the Portal

From the root of the cloned repository, run:

```bash
make demo
```

This command:

1. Runs system checks (Docker version, available resources)
2. Builds the Stage frontend image
3. Starts all services via Docker Compose
4. Initializes PostgreSQL schemas
5. Creates Elasticsearch indices from the pre-configured mappings
6. Loads demo data (clinical/oncology CSV) into Elasticsearch
7. Starts Arranger (search API) and Stage (portal UI)
8. Opens the portal in your browser automatically

The portal will be available at **http://localhost:3000** once deployment completes.

> **Note:** The first run takes longer because Docker needs to build the Stage image. Subsequent runs will be faster.

## Exploring the Portal

Once the portal loads, take a few minutes to explore:

### Home Page

The landing page provides an overview and navigation to available data tables. Note the navigation bar, branding, and layout, all of which are configurable.

### Data Exploration Page

Navigate to the data exploration page from the top navigation. This is where Arranger's components are at work:

> **ILLUSTRATION NEEDED:** An annotated screenshot of the data exploration page with callouts pointing to: (1) the facet/filter panel on the left, (2) the data table in the main area, (3) the column selector, (4) the search/filter summary bar at the top, and (5) the export/download button if visible.

- **Facet Panel (left sidebar):** Filter data by clicking on field values. Each facet corresponds to a field in the Elasticsearch index. The fields shown, their order, and their display names are all controlled by Arranger configuration files.

- **Data Table (main area):** Browse records with sortable columns. Which columns are visible, their display names, and whether they're sortable are controlled by Arranger's table configuration.

- **Search and Filtering:** Apply multiple filters across facets. Notice how the result count updates in real time. This is Elasticsearch handling the queries through Arranger's GraphQL API.

- **Export:** If enabled, you can download filtered results as a TSV/CSV file.

### Documentation Pages

The portal includes built-in documentation pages rendered from markdown files in the `docs/` directory. The content you're reading right now is served through this same mechanism.

## What's Running Behind the Scenes

You can verify all services are running:

```bash
docker ps
```

You should see containers for:

| Container             | Port | Role                      |
| --------------------- | ---- | ------------------------- |
| `stage`               | 3000 | Portal frontend           |
| `arranger-datatable1` | 5050 | Search API for datatable1 |
| `elasticsearch`       | 9200 | Search engine             |
| `postgres`            | 5435 | Persistent storage        |

### Checking Elasticsearch Directly

You can query Elasticsearch to see the indexed data:

```bash
curl -u elastic:myelasticpassword http://localhost:9200/_cat/indices?v
```

This shows the indices that were created, including `datatable1-index` and the Arranger set index.

To see a sample document:

```bash
curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_search?pretty&size=1
```

If you installed Elasticvue, you can also browse indices and documents through its graphical interface by connecting to `http://localhost:9200` with the credentials `elastic` / `myelasticpassword`.

## Checkpoint

Before moving on, confirm:

- [ ] The portal is running at http://localhost:3000
- [ ] You can see the data exploration page with records in the table
- [ ] Clicking a facet value filters the table results
- [ ] `docker ps` shows containers for `stage`, `arranger-datatable1`, `elasticsearch`, and `postgres`

> **Stuck?** Run `docker logs setup` to see where initialization may have failed. Common issues: Docker not running, port 3000 already in use, insufficient memory allocated to Docker.

## Stopping the Demo

We'll keep the demo running as a reference while we walk through the architecture. When you need to stop it:

```bash
make down
```

To stop and clear all data (for a fresh start):

```bash
make reset
```

> **Next:** Now that you've seen the working portal, let's understand how the pieces fit together.

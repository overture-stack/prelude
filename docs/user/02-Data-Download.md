# Data Download

The download workflow is:

1. Search and filter data in the portal
2. Download a File Manifest (TSV) from the Download dropdown
3. Run the Score client to pull files from object storage

:::info
Groups of genomic files are often too large for direct browser download. The File Manifest is a tab-separated file passed to the Score client, which handles presigned URL generation, chunked multipart transfer, and MD5 integrity verification, downloading reliably at scale without browser size or timeout limits.
:::

## Step 1: Search and Filter

Open the portal at [http://localhost:3000/fileTable](http://localhost:3000/fileTable) and use the filter sidebar to narrow your selection. The file count updates in real time.

## Step 2: Download the File Manifest

Click **Download** in the table toolbar and select **File Manifest**. The browser saves a file named `score-manifest.YYYYMMDD.tsv`.

:::tip
Select **File Table** instead to export the relevant records as a spreadsheet without triggering a file download.
:::

## Step 3: Download Files

Start the Score client container:

```bash
docker run -d -it --name score-client \
  --network overture-demo_platform-network \
  --platform linux/amd64 \
  -e ACCESSTOKEN="68fb42b4-f1ed-4e8c-beab-3724b99fe528" \
  -e STORAGE_URL=http://score:8087 \
  -e METADATA_URL=http://song:8080 \
  --mount type=bind,source="$(pwd)/data",target=/data \
  ghcr.io/overture-stack/score-client:ee758b91
```

Run the download command, replacing the manifest filename with the one downloaded in step 2:

```bash
docker exec score-client sh -c \
  "bin/score-client download --manifest /data/<Your-Manifest-FileName> --output-dir /data/downloads"
```

:::info
Replace `<Your-Manifest-FileName>` with the filename downloaded in step 2, for example `score-manifest.20260520.tsv`. The file must be placed in the `data/` directory of this project before running the command.
:::

Files are written to `./data/downloads/`.

<details>
<summary><strong>Common Score client flags</strong></summary>

| Flag           | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `--manifest`   | Path to the manifest file (inside the container)           |
| `--output-dir` | Directory where downloaded files are written               |
| `--force`      | Overwrite files that already exist locally                 |
| `--verify-md5` | Verify MD5 checksum after each download (default: enabled) |
| `--threads`    | Number of parallel download threads (default: 1)           |

For a full list of flags, see the [Score client reference](https://docs.overture.bio/docs/use-docs/cli-downloads).

</details>

Remove the client container

```bash
docker rm -f score-client
```

## Exporting Search Results (No Download)

To export the filtered table as a spreadsheet without downloading files:

1. Apply your filters in the portal
2. Click **Download** → **File Table**

This downloads a TSV with the rows for all matching records. No Score client or manifest is needed.

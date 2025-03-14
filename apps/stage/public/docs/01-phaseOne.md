# Phase One

## Overview

**This guide is for** those in phase one of Prelude's deployment process. The primary goal is to set up and configure Stage, Arranger, and Elasticsearch such that you will be able to access and exploring your tabular data through data exploration pages.

**By the end of this guide you will be able to:**

1. Generate and configure Elasticsearch mappings
2. Generate and configure Arranger UI configs
3. Transform and load your CSV data into Elasticsearch and onto the data table
4. Create multiple data exploration pages for independent datasets
5. Theme your Stage UI to match your organization's branding

## Prerequisites and Requirements

**You will need:**

- Tabular Data in the form of CSV (more details in step 1 below)
- A basic understanding of the following software:
  - [Elasticsearch 7.17](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/index.html)
  - [Arranger](https://docs.overture.bio/docs/core-software/arranger/overview/)
  - [Stage](https://docs.overture.bio/docs/core-software/Stage/overview)
- Optionally we use [Elasticvue](https://elasticvue.com/installation) for viewing, maintaining, configuring, and troubleshooting Elasticsearch

### Quick Setup Verification

If you are starting from this point or want to ensure your system is ready, run the following command from the root of the Prelude directory:

```bash
make phase0
```

This command performs a pre-deployment check and provides all the information you need to set up your system for success.

## Background Information

Phase One focuses on configuring how your data will be displayed in the front-end portal. During this phase, you'll determine the number of data tables needed and their configurations. This is also the ideal time to apply custom theming to your portal. The goal is to establish the look and feel of the user experience before proceeding to more complex back-end data management configurations.

### Architecture Overview

The phase architecture is diagramed below and detailed in the following table:

![Phase 1 Architecture Diagram](/docs/images/phase1.png "Phase 1 Architecture Diagram")

| Component                                                                                                  | Description                                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Conductor**                                                                                              | A command-line tool for processing CSV files into Elasticsearch. It handles data transformation and loading. |
| **Composer**                                                                                               | A command-line tool for generating base Oveture configuration files.                                         |
| **[Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/elasticsearch-intro.html)** | A powerful search and analytics engine that enables flexible and efficient querying of massive datasets.     |
| **[Arranger](https://docs.overture.bio/docs/core-software/arranger/overview)**                             | A search API and UI component generation service that creates configurable data exploration interfaces.      |
| **[Stage](https://docs.overture.bio/docs/core-software/stage/overview/)**                                  | A React-based user interface framework designed for easy deployment of customizable data portals.            |

## Step 1: Preparing your data

The `data` folder at the root of this project is for storing data files used in
your project. Below are guidelines for data management:

- **File Format**: We support multiple delimiters, but Comma-Separated Values (CSV) are the recommended format for tabular data input.
- **Headers**: Include headers in your CSV files to ensure clear column identification. These headers will directly map to your Elasticsearch index field names.
- **Data Privacy**: When working with sensitive data, add your data files to `.gitignore` before committing to GitHub to prevent accidental exposure.
- **Data Size**: There are no strict size limitations beyond the resource constraints of Docker and Elasticsearch. For development and testing, we recommend using a representative sample of approximately 500 records.

Each CSV file in the `data` folder should represent an independent dataset that you want to view within the exploration tables.

### Implementation

1. Collect your tabular datasets in CSV format
2. Place CSV files in the `data` folder
3. Ensure each CSV file:
   - Has clear, descriptive headers
   - Represents a distinct, independent dataset
   - Contains a representative sample of data

You should also ensure that your headers do not conflict with any elasticsearch or graphQL naming conventions, a summary of invalid characters and reserved words is provided in the dropdown below.

<details>
<summary>Header Naming Conventions</summary>

**Prohibited Characters**: Avoid using `:, >, <, ., [space], ,, /, \, ?, #, [, ], {, }, ", *, |, +, @, &, (, ), !, ^` in column headers.

**Length Restriction**: Maximum header length is 255 characters.

**Reserved Words**: Do not use these as column headers:
`_type`, `_id`, `_source`, `_all`, `_parent`, `_field_names`, `_routing`, `_index`, `_size`, `_timestamp`, `_ttl`, `_meta`, `_doc`, `__typename`, `__schema`, `__type`

**Best Practices**:

- Use snake_case or camelCase
- Keep headers descriptive but concise
- Avoid special characters and spaces
- Use lowercase letters

**Example**:

- **Good**: `user_id,first_name,last_name,email_address`
- **Bad**: `User ID!,First Name,Email@Address`

Following these guidelines ensures smooth Elasticsearch indexing and prevents data ingestion issues.

</details>

### Validation

To verify successful data preparation:

- Your data folder should include one CSV file for each desired data table:

  ```
  project-root/
  └── data/
      ├── dataset1.csv
      ├── dataset2.csv
      └── dataset3.csv
  ```

- Open each CSV file and confirm:
  - Headers are present and valid
  - Data is clean and formatted consistently
  - No sensitive information is exposed
- Confirm your `.gitignore` includes data files if necessary

**Next Steps:** After completing data preparation, you'll be ready to generate your Arranger and Stage configuration files.

## Step 2: Update portal configurations

Introduction: Provide a brief overview of what this step accomplishes and why it's necessary

### Installing Composer

1. Move to the Composer App directory:

   ```
   cd ./apps/composer
   ```

2. Run the following commands:

   ```
   npm install
   npm run build
   npm install -g
   ```

3. **Validate:** From the root directory test that Composer is working by running `composer -h` you should be able to see help text outlining the available commands.

### Generating our Elasticsearch index mappings

1. Run the following Composer command to generate elasticsearch index mappings using your data files:

   ```
   composer -p generateElasticsearchMapping -f ./data/dataset1.csv -i dataset1 -o ./configs/elasticsearchConfigs/dataset1-mapping.json
   ```

    <details>
    <summary>Command Breakdown</summary>

   In this command:

   - `-p generateElasticsearchMapping`: Specifies the operation to generate an Elasticsearch mapping schema
   - `-f ./data/dataset1.csv`: Specifies the input data file to analyze
   - `-i dataset1`: Sets the Elasticsearch index name to "dataset1"
   - `-o ./configs/elasticsearchConfigs/dataset1-mapping.json`: Sets the output path for the generated mapping file

   The command analyzes the structure of dataset1.csv and creates an appropriate Elasticsearch mapping configuration, which defines how the data will be indexed and searched in Elasticsearch.

   A detailed overview of all available options for the generateElasticsearchMapping command can be seen by running `composer -h`

    </details>

   ![Output](/docs/images/generateElasticsearchMapping.png "Terminal output from generateElasticsearchMapping")

2. Validate and review the generated mapping template(s):

   After running the command, examine the generated index mapping in the `configs/elasticsearchConfigs` directory. The mapping contains several critical components:

   - **Index Pattern:** `"index_patterns": ["dataset1-*"]` - This template will apply to all indices that start with "dataset1-"
   - **Aliases:** `"dataset1_centric": {}` - An alias that can be used to reference all matching indices as one
   - **Data Structure:** Note how all fields are nested under a `data` object, providing clean organization

   <details>
   <summary>Key Elements to Review</summary>

   - **Field Types:** Most fields are set as `keyword` type for exact matching, with numeric values like `age_at_diagnosis`, `treatment_start`, and `followup_interval` appropriately set as `integer` types

   - **Metadata Structure:** The auto-generated `submission_metadata` object contains important tracking fields:
     ```json
     "submission_metadata": {
       "type": "object",
       "properties": {
         "submitter_id": { "type": "keyword", "null_value": "No Data" },
         "processing_started": { "type": "date" },
         "processed_at": { "type": "date" },
         "source_file": { "type": "keyword", "null_value": "No Data" },
         "record_number": { "type": "integer" },
         "hostname": { "type": "keyword", "null_value": "No Data" },
         "username": { "type": "keyword", "null_value": "No Data" }
       }
     }
     ```
   - **Index Settings:** The configuration uses minimal settings with 1 shard and 0 replicas:
     ```json
     "settings": {
       "number_of_shards": 1,
       "number_of_replicas": 0
     }
     ```
     These settings are appropriate for development but can and should be adjusted as we move foward.
     </details>

3. Repeat the above steps for your remaining datasets, make sure to name your indices and files appropriatly.

   **Next Step:** Once you're satisfied with the mapping configuration, you're ready to move on to the next step, generating and confuring the Arranger configuration files.

### Generating our Arranger configuration files

1.  Run the following Composer command to generate Arranger configuration files using your index mapping templates:

    ```
    composer -p generateArrangerConfigs -f ./configs/elasticsearchConfigs/dataset1-mapping.json -o ./configs/arrangerConfigs/dataset1/
    ```

    <details>
    <summary>Command Breakdown</summary>

    In this command:

    - `-p generateArrangerConfigs`: Specifies the operation to generate Arranger configuration files
    - `-f ./configs/elasticsearchConfigs/dataset1-mapping.json`: Specifies the input Elasticsearch mapping file to use as a template
    - `-o ./configs/arrangerConfigs/dataset1/`: Sets the output directory for the generated Arranger configuration files

    The command analyzes the Elasticsearch mapping structure and creates appropriate Arranger configuration files, which define how data will be displayed, filtered, and queried in the Arranger UI.

    A detailed overview of all available options for the generateArrangerConfigs command can be seen by running `composer -h generateArrangerConfigs`

    </details>

    ![Output](/docs/images/generateArrangerConfigs.png "Terminal output from generateArrangerConfigs")

2.  Validate and review the generated arranger configuration file:

    - **Directory structure:** should now look like the following

      ```
      configs
      ├── arrangerConfigs
      │ └── dataset1
      │   ├── base.json # Core configuration
      │   ├── extended.json # Field display settings
      │   ├── facets.json # Filter panel configuration
      │   └── table.json # Table display settings
      └── elasticsearchConfigs
          └── dataset1-mapping.json

      ```

    - **Base.json:** update the index field of your base.json file to match relevant index alias. In this case `dataset1-index`.

      ```
      {
      "documentType": "file",
      "index": "dataset1-centric"
      }
      ```

    - **Extended.json** `fieldNames` should be accurate in the extended.json, take time to review and update the `displayNames` as these will be how fields are read from the front-end UI.
    - **Table.json** By default `canChangeShow`, `show`, and `sortable` are set to true. Update these fields accordingly. For information see our documentation covering [Arrangers table configuration fields](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#table-configuration-tablejson)
    - **Facets.json** By default `active` and `show` are set to true. Update these fields accordingly. The order of the elements will also match the order of the facets as they appear in the facet panel, update accordingly. For information see our documentation covering [Arrangers facet configuration fields](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#facet-configuration-facetsjson)

3.  Repeat the above steps for your remaining datasets.

    **Next Step:** After generating your Elasticsearch mappings and Arranger configuration files, the next step is to update the docker-compose.yml file to properly connect these components.

## Step 3: Updating the docker-compose

This step configures your docker-compose.yml file to properly connect your data sources, Elasticsearch, Arranger, and Stage. You'll update environment variables and service configurations to reflect your specific dataset configurations.

1. **Update the following Environment Variables within the conductor image**:

   Modify the `conductor` service environment variables to reference your dataset(s):

   ```yaml
   # Elasticsearch Index Configuration
   ES_INDEX_COUNT: 1 # Update this if you have multiple datasets

   # First index
   ES_INDEX_0_NAME: dataset1-index
   ES_INDEX_0_TEMPLATE_FILE: configs/elasticsearchConfigs/dataset1-mapping.json
   ES_INDEX_0_TEMPLATE_NAME: dataset1_template
   ES_INDEX_0_ALIAS_NAME: dataset1_centric
   # Add more indices if needed
   # ES_INDEX_1_NAME: dataset2-index
   # ES_INDEX_1_TEMPLATE_FILE: configs/elasticsearchConfigs/dataset2-mapping.json
   # ES_INDEX_1_TEMPLATE_NAME: dataset2_template
   # ES_INDEX_1_ALIAS_NAME: dataset2_centric
   ```

2. **Configure Arranger Services**:

   For each dataset, configure a separate Arranger service. Update the `arranger-clinical` service (or rename it appropriately) and add additional Arranger services if needed:

   ```yaml
   arranger-dataset1:
     profiles: ["phase1", "phase2", "phase3", "stageDev", "default"]
     image: ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
     container_name: arranger-dataset1 # Rename to match above
     platform: linux/amd64
     depends_on:
       conductor:
         condition: service_healthy
     ports:
       - "5050:5050" # Use unique ports for each Arranger instance
     volumes:
       - ./configs/arrangerConfigs/dataset1:/app/modules/server/configs # Point to the relevant generated config
     environment:
       # Elasticsearch Variables
       ES_HOST: http://elasticsearch:9200
       ES_USER: elastic
       ES_PASS: myelasticpassword
       ES_ARRANGER_SET_INDEX: dataset1_arranger_set
       # Arranger Variables
       PORT: 5050 # Required
       DEBUG: false
       ENABLE_LOGS: false
   ```

   - Make sure to use unique ports for each Arranger instance, this includes updating the ports section as well as the `PORT` environment variable for each Arranger instance
   - Make sure you point the volume path provided to the relevant arranger config

3. **Update the Arranger Count in Conductor**:

   If you have multiple datasets/Arranger instances, update the `ARRANGER_COUNT` and add URLs for each:

   ```yaml
   # Arranger Services Configuration
   ARRANGER_COUNT: 1 # Update this if you have multiple Arrangers
   ARRANGER_0_URL: http://arranger-dataset1:5050
   # ARRANGER_1_URL: http://arranger-dataset2:5051
   ```

   - Here `ARRANGER_1_URL` is commented, make sure to uncomment any additionally added arranger URLs

4. **Ensure all services are on the same network**:

   The following should be included with each added service

   ```yaml
   networks:
     - conductor-network
   ```

5. **pre-configure the Stage Environment variable**:

   Update the Stage service environment variables to connect to your Arranger instances:

   ```yaml
   # Tabular Arranger Variables
   NEXT_PUBLIC_ARRANGER_DATASET1_DATA_API: http://arranger-dataset1:5050
   NEXT_PUBLIC_ARRANGER_DATASET1_DATA_DOCUMENT_TYPE: file
   NEXT_PUBLIC_ARRANGER_DATASET1_INDEX: dataset1_centric
   # Add more Arranger connections if needed
   NEXT_PUBLIC_ARRANGER_DATASET2_API: http://arranger-dataset2:5051
   NEXT_PUBLIC_ARRANGER_DATASET2_DOCUMENT_TYPE: file
   NEXT_PUBLIC_ARRANGER_DATASET2_INDEX: dataset2_centric
   # Add more Arranger connections if needed
   NEXT_PUBLIC_ARRANGER_DATASET3_API: http://arranger-dataset2:5051
   NEXT_PUBLIC_ARRANGER_DATASET3_DOCUMENT_TYPE: file
   NEXT_PUBLIC_ARRANGER_DATASET3_INDEX: dataset2_centric
   # Add more Arranger connections if needed
   # NEXT_PUBLIC_ARRANGER_DATASET4_API: http://arranger-dataset2:5051
   # NEXT_PUBLIC_ARRANGER_DATASET4_DOCUMENT_TYPE: file
   # NEXT_PUBLIC_ARRANGER_DATASET4_INDEX: dataset2_centric
   ```

### Validation

After updating your docker-compose.yml file, verify the configuration:

1. **Validate Port Mappings**:

   - Each Arranger instance should have a unique port
   - Ports should not conflict with other services

2. **Start the Services**:

   Run `make phase1` to start your services.

3. **Check Service Health**:

   The deployment script should verify all services are running correctly.

**Next Steps:** We will run through the process of adding a third data table to stage.

## Step 4: Updating Stage (Optional)

This step guides you through customizing Stage UI to incorporate multiple data exploration tables and update the theming to match your organization's branding.

1. **Reset your environment** to ensure a clean state:

   ```bash
   make reset
   ```

2. **Run Stage complementary services** in development mode:

   ```bash
   make stage-dev
   ```

3. **Set up local Stage development environment**:

   To run Stage locally for development and customization:

   ```bash
   # Navigate to the Stage directory
   cd apps/stage

   # Copy the example environment file
   cp .env.stageDev .env

   # Install dependencies
   npm ci

   # Start the development server
   npm run dev
   ```

   Your development server will be accessible at: http://localhost:3000

4. **Creating New Data Exploration Pages**:

   To add a new data table in Stage:
   a.
   b.
   c.

5. **Customize Stage Theming** (Optional):

Update theme colors to match your organization's branding:

Update the logo by replacing the image file at `apps/stage/public/images/logo.svg`

Customize x.y.x

**Next Steps:** Once you have completed the Stage customization, you're ready to upload your data to make it available in the Elasticsearch indices and visible in your data exploration tables.

## Step 5: Uploading your data (To Be Updated)

With Arranger, Stage, and Elasticsearch now configured, it's time to upload our data. We will use Conductor to transform our CSV files into Elasticsearch documents and upload them into the portal.

### Installing Composer

1. Move to the Conductor App directory:

   ```
   cd ./apps/conductor
   ```

2. Run the following commands:

   ```
   npm install
   npm run build
   npm install -g
   ```

3. **Validate:** From the root directory test that Conductor is working by running `conductor -h` you should be able to see help text outlining the available commands.

4. Run the Conductor `upload` command to upload your data:

   ```
   conductor upload -f ./data/dataset1.csv -i dataset1-index
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-f ./data/dataset1.csv`: Specifies the input data file to upload
   - `-i dataset1-index`: Specifies the target Elasticsearch index

   Additional options:

   - `-b, --batch-size <n>`: Number of records to upload in each batch (default: 1000)
   - `--delimiter <char>`: CSV delimiter character (default: comma)
   - `-o, --output <path>`: Path for saving upload logs

   The command processes your CSV file, transforms it according to the index mapping structure, and uploads it to Elasticsearch in batches.

   Full command reference can be seen by running `conductor upload -h`
   </details>

5. Monitor the upload process:

   The command will display progress information including:

   - Number of records processed
   - Processing speed (records per second)
   - Current upload status
   - Error counts (if any)

6. Repeat for additional datasets:

   If you have multiple datasets, repeat the upload command for each one, ensuring you specify the correct index name:

   ```
   conductor upload -f ./data/dataset2.csv -i dataset2-index
   ```

### Validation

To verify that your data was successfully uploaded:

1. **Check the Conductor Output**:

   - Confirm the final message shows successful completion
   - Verify the record count matches your expectations
   - Check for any error messages

2. **Verify Data in Elasticsearch**:

   - Open Elasticvue (http://localhost:9200) if you have it installed
   - Navigate to Indices and select your index (e.g., `dataset1-index`)
   - Browse documents to ensure they contain the expected data
   - Run a sample query to test data retrieval

3. **Check Data in Stage UI**:
   - Navigate to http://localhost:3000 in your browser
   - Go to your data exploration page
   - Verify that your data appears in the table
   - Test the search and filter functionality to ensure it works correctly

If you encounter any issues:

- Check Elasticsearch logs for indexing errors
- Verify your CSV file follows the guidelines outlined in Step 1
- Ensure the index name in your upload command matches the index pattern in your mapping template

**Next Steps:** With your data successfully uploaded and available in the Elasticsearch index, you can now fully explore and interact with your data through the Stage UI.

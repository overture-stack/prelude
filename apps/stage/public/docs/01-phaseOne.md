# Phase One

## Overview

**This guide is for** those in phase one of Prelude's deployment process. The primary goal is to get your data into the portal UI for search and exploration.

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

## Background Information

Phase One focuses on configuring how your data will be displayed in the front-end portal. During this phase, you'll determine the number of data tables needed and their configurations. We will also provide information for applying custom theming to your portal. The goal is to establish the look and feel of the user experience before proceeding to more complex back-end data management configurations.

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
- **Headers**: Include appropriate headers in your CSV files (more details below). These headers will directly map to your Elasticsearch and GraphQL field names.
- **Data Privacy**: If needed, to prevent accidental exposure of sensitive data, add your data files to `.gitignore` before committing to GitHub .
- **Data Size**: There are no strict size limitations beyond the resource constraints of Docker and Elasticsearch. For development and testing, we recommend using a representative sample of approximately 500 records.

### Implementation

1. Collect your data in CSV format. For phase 1, each CSV file will become a separate data table on your exploration page(s). The structure of each CSV directly determines the columns and fields available for search and display in the user interface.

   > **Note:** Overture is made to handle both flat and hierarchical data structures. If you have hierarchical (or nested) data (e.g., a patient record with multiple associated tests, or a sample with multiple sequencing results), this will be defined in phase 2. For phase 1, focus on creating flat representations of how you want your data to appear in the search UI.

2. Place CSV files in the `data` folder
3. Ensure each CSV file:
   - Has clear, descriptive headers
   - Represents a distinct, independent dataset
   - Contains a representative sample of data

**Ensure your headers do not conflict with any Elasticsearch or GraphQL naming conventions.** A summary of invalid characters and reserved words is provided in the dropdown below.

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

</details>

### Validation

Your data folder should include one CSV file for each desired data table:

```
project-root/
└── data/
    ├── datatable1.csv
    ├── datatable2.csv
    └── datatable3.csv
```

- Open each CSV file and confirm:
  - Headers are present and valid
  - Data is clean and formatted consistently
  - No sensitive information is exposed
- Confirm your `.gitignore` includes data files if necessary

> **Next Steps:** With data preparation completed we will next look at generating our Elasticsearch and Arranger configuration files.

## Step 2: Update portal configurations

Composer is a command-line tool provided as part of Prelude that generates base Overture configuration files. We will be using Composer to minimize the time spent manually writing tedious configuration files.

### A) Install Composer

1. Move to the Composer App directory:

   ```
   cd ./apps/composer
   ```

2. Run the following commands:

   ```
   npm install
   npm run build
   npm install -g .
   ```

3. **Validate:** From the root directory test that Composer is working by running `composer -h`. You should be able to see help text outlining the available commands.

<details>
<summary>Alternative: using Composer without global installation</summary>

If you prefer not to install globally, you can run Composer directly from the project directory:

```bash
cd apps/composer
npm install
npm start -- <profile> [options]
```

For example:

```bash
npm start --  -p ElasticsearchMapping -f data.csv -i my-index
```

</details>

### B) Generate Elasticsearch index mappings

1. Run the following Composer command to generate Elasticsearch index mappings using your data files:

   ```
   composer -p ElasticsearchMapping -f ./data/datatable1.csv -i datatable1 -o ./configs/elasticsearchConfigs/datatable1-mapping.json
   ```

    <details>
    <summary>Command Breakdown</summary>

   In this command:

   - `-p ElasticsearchMapping`: Specifies the operation to generate an Elasticsearch mapping schema
   - `-f ./data/datatable1.csv`: Specifies the input data file to analyze
   - `-i datatable1`: Sets the Elasticsearch index name to "datatable1"
   - `-o ./configs/elasticsearchConfigs/datatable1-mapping.json`: Sets the output path for the generated mapping file

   The command analyzes the structure of datatable1.csv and creates an appropriate Elasticsearch mapping configuration, which defines how the data will be indexed and searched in Elasticsearch.

   A detailed overview of all available options for the ElasticsearchMapping command can be seen by running `composer -h`.

    </details>

   ![Output](/docs/images/ElasticsearchMapping.png "Terminal output from ElasticsearchMapping")

   > **Note:** The `configs/elasticsearchConfigs/` directory is located at the root of the repository and is symbolically linked to the `./apps/conductor/configs/` directory. In the docker-compose configuration, this directory is mounted as a volume to the conductor service, which uses these files to automatically initialize your Elasticsearch indices. This automation process is explained in greater detail in the following sections.

2. Validate and review the generated mapping template(s):

   After running the command, examine the generated index mapping in the `configs/elasticsearchConfigs` directory. The mapping contains several critical components:

   - **Index Pattern:** `"index_patterns": ["datatable1-*"]` - This template will apply to all indices that start with "datatable1-"
   - **Aliases:** `"datatable1_centric": {}` - An alias that can be used to reference all matching indices as one
   - **Data Structure:** Note how all fields are nested under a `data` object, this will be important for phase 2

   <details>
   <summary>Key Elements to Review</summary>

   - **Field Types:** Most fields are set as `keyword` type for exact matching, with numeric values like `age_at_diagnosis`, `treatment_start`, and `followup_interval` appropriately set as `integer` types.

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
     These settings are appropriate for development but can and should be adjusted as we move forward.
     </details>

3. Repeat the above steps for your remaining datasets. Make sure to name your indices and files appropriately.

   > **Next Step:** Once you're satisfied with the mapping configuration, you're ready to move on to the next step: generating and configuring the Arranger configuration files.

### C) Generating our Arranger configuration files

Composer can also be used to generate the Arranger configuration files that define the data for our search API and UI components.

1.  Run the following Composer command to generate Arranger configuration files using your index mapping templates:

    ```
    composer -p ArrangerConfigs -f ./configs/elasticsearchConfigs/datatable1-mapping.json -o ./configs/arrangerConfigs/datatable1/
    ```

    <details>
    <summary>Command Breakdown</summary>

    In this command:

    - `-p ArrangerConfigs`: Specifies the operation to generate Arranger configuration files
    - `-f ./configs/elasticsearchConfigs/datatable1-mapping.json`: Specifies the input Elasticsearch mapping file to use as a template
    - `-o ./configs/arrangerConfigs/datatable1/`: Sets the output directory for the generated Arranger configuration files

    The command analyzes the Elasticsearch mapping structure and creates appropriate Arranger configuration files, which define how data will be displayed, filtered, and queried in the Arranger UI.

    A detailed overview of all available options for the ArrangerConfigs command can be seen by running `composer -h ArrangerConfigs`.

    </details>

    ![Output](/docs/images/ArrangerConfigs.png "Terminal output from ArrangerConfigs")

2.  Validate and review the generated Arranger configuration files:

    - **Directory structure:** should now look like the following:

      ```
      configs
      ├── arrangerConfigs
      │ └── datatable1
      │   ├── base.json # Core configuration
      │   ├── extended.json # Field display settings
      │   ├── facets.json # Filter panel configuration
      │   └── table.json # Table display settings
      └── elasticsearchConfigs
          └── datatable1-mapping.json

      ```

    - **Base.json:** Update the index field of your base.json file to match index alias defined in the index mapping. In this case `datatable1_centric`.

      ```
      {
      "documentType": "file",
      "index": "datatable1_centric"
      }
      ```

    - **Extended.json:** `fieldNames` should be accurate in the extended.json. Take time to review and update the `displayNames` as these will be how fields are displayed in the front-end UI.
    - **Table.json:** By default `canChangeShow`, `show`, and `sortable` are set to true. Update these fields accordingly. For information see our documentation covering [Arranger's table configuration fields](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#table-configuration-tablejson).
    - **Facets.json:** By default `active` and `show` are set to true. Update these fields accordingly. The order of the elements will also match the order of the facets as they appear in the facet panel, update accordingly. For information see our documentation covering [Arranger's facet configuration fields](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#facet-configuration-facetsjson).

3.  Repeat the above steps for your remaining datasets.

> **Next Step:** After generating your Elasticsearch mappings and Arranger configuration files, the next step is to update the docker-compose.yml file to properly connect these components to their respective configuration files.

## Step 3: Updating the docker-compose

With Conductor, the `docker-compose.yml` automates all our deployments including index management. Here you'll update environment variables and service configurations to reflect your dataset(s) and update your deployment with the configuration files generated in the previous steps.

### A) Update the conductor service

From the docker-composer update the following environment variables within the conductor image:

```
Elasticsearch Index Configuration
ES_INDEX_COUNT: 1 # Update this if you have multiple datasets (Each data table should have its own index)

First Index
ES_INDEX_0_NAME: datatable1-index
ES_INDEX_0_TEMPLATE_FILE: configs/elasticsearchConfigs/datatable1-mapping.json
ES_INDEX_0_TEMPLATE_NAME: datatable1_template
ES_INDEX_0_ALIAS_NAME: datatable1_centric

Add more indices if needed
ES_INDEX_1_NAME: datatable2-index
ES_INDEX_1_TEMPLATE_FILE: configs/elasticsearchConfigs/datatable2-mapping.json
ES_INDEX_1_TEMPLATE_NAME: datatable2_template
ES_INDEX_1_ALIAS_NAME: datatable2_centric
```

### B) Configuring the Arranger Service(s)

1. For each CSV dataset, you'll need to configure a separate Arranger service. The docker-compose file includes a template (`arranger-datatable1`) and additional examples that you can use as reference:

   ```yaml
   arranger-datatable1:
   profiles: ["phase1", "phase2", "phase3", "stageDev", "default"]
   image: ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
   container_name: arranger-datatable1
   platform: linux/amd64
   depends_on:
     conductor:
       condition: service_healthy
   ports:
     - "5050:5050" # External port : Internal port
   volumes:
     - ./apps/conductor/configs/arrangerConfigs/datatable1:/app/modules/server/configs
   environment:
     # Elasticsearch Variables
     ES_HOST: http://elasticsearch:9200
     ES_USER: elastic
     ES_PASS: myelasticpassword
     ES_ARRANGER_SET_INDEX: datatable1_arranger_set # Unique set index name
     # Arranger Variables
     PORT: 5050 # Must match the internal port defined above
     DEBUG: false
     ENABLE_LOGS: false
   networks:
     - conductor-network
   ```

   > **Note:** For each additional dataset, you can copy or uncomment an existing Arranger service block in the docker-compose file. If creating a new Arranger service, ensure you are using a unique port in both the `ports` mapping (`"5051:5051"`) and the `PORT` environment variable. Also update the container name, volume path, and Arranger set index to match your new dataset.

2. Update the Arranger Count in the Conductor service: If you have multiple datasets/Arranger instances, update the `ARRANGER_COUNT` and add envs with URLs for each. In the example below `ARRANGER_1_URL` is commented. Make sure to uncomment any additionally added Arranger URLs.

   ```yaml
   # Arranger Services Configuration
   ARRANGER_COUNT: 1 # Update this if you have multiple Arrangers
   ARRANGER_0_URL: http://arranger-datatable1:5050
   # ARRANGER_1_URL: http://arranger-datatable2:5051
   ```

### C) Update Stage

Update the Stage service environment variables to connect to your Arranger instances:

```
Data Table 1
NEXT_PUBLIC_ARRANGER_DATATABLE_1_DATA_API: http://arranger-datatable1:5050
NEXT_PUBLIC_ARRANGER_DATATABLE_1_DATA_DOCUMENT_TYPE: file
NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX: datatable1_centric

Data Table 2
NEXT_PUBLIC_ARRANGER_DATATABLE_2_API: http://arranger-datatable2:5051
NEXT_PUBLIC_ARRANGER_DATATABLE_2_DOCUMENT_TYPE: file
NEXT_PUBLIC_ARRANGER_DATATABLE_2_INDEX: datatable2_centric

Add more Arranger connections if needed...
NEXT_PUBLIC_ARRANGER_DATATABLE_3_API: http://arranger-datatable2:5051
NEXT_PUBLIC_ARRANGER_DATATABLE_3_DOCUMENT_TYPE: file
NEXT_PUBLIC_ARRANGER_DATATABLE_3_INDEX: datatable2_centric

```

### D) Applying Configuration Changes

When making changes to your configurations (such as updating Elasticsearch mappings, Arranger configs, or docker-compose environment variables), you'll need to restart the affected containers for the changes to take effect:

1. **Restart specific profile:**

```
make restart
```

When prompted, enter the profile you modified (e.g., phase1, phase2, phase3, or stageDev).

2. **What happens during restart:**

- The specified containers will be gracefully shut down
- All configurations will be reloaded
- The appropriate deployment script will be executed
- Your data will remain intact (unlike the 'reset' command which would remove all data)

This restart process ensures that all your configuration changes are properly applied without losing any data you've already loaded.

> **Next Steps:** Will cover how to theme our portal and add data tables (if needed) to Stage. If you want to skip ahead, the last section of this guide (Step 5) will cover how to use conductor to load your data into Elasticsearch.

## Step 4: Updating Stage (Optional)

This follow information is provided to guide and support you through customizing the base portal UI (Stage).

<details>
<summary>Setting up the local Stage development environment</summary>

To run Stage locally for development and customization:

```bash
   # Navigate to the Stage directory
   cd apps/stage

   # Copy and update the following environment file
   cp .env.stageDev .env

   # Install dependencies
   npm ci

   # Start the development server
   npm run dev
```

Depending on port availability your development server will either be accessible at: http://localhost:3001 or http://localhost:3000

</details>

<details>
<summary>Creating New Data Exploration Pages</summary>

1. **Activate a pre-configured data table**: Move the desired template from `components/inactiveDataTables/` to `components/pages/activeDataTables/`. These components are already configured with variable declarations and definitions found in the following key files:

   - `./next.config.js`
   - `./global/config.ts`
   - `./global/utils/constants.ts`
   - `./pages/api/[...proxy].ts`

2. **Enable the page route**: Move the corresponding folder from `./inactivePages/` to `./pages/` directory. Open the `index.tsx` file within this folder and uncomment the code. Save the changes.

3. **Update environment configurations**: Add the corresponding variables to your `.env` file. Update the `docker-compose.yml` with the appropriate service configurations.

4. **Access your data table**: The new data table will automatically appear in the navigation menu. It will also be accessible from the homepage data tables section
</details>

<details>
<summary>Theming</summary>

Stage is built using React and provides extensive theming options to help you customize the look and feel of your data portal. This section outlines the key files and directories to modify for theming.

**Core Theme Assets**

- **Logo**: Replace `/public/images/logo.svg` with your organization's logo to update the navbar branding
- **Favicon**: Update `/public/favicon.ico` to change the browser tab icon

**Theme Configuration Files:** the theming system is organized into several key files:

- **Main Theme**: `/apps/stage/components/theme/` contains files that define the global color palette, typography, spacing, and other fundamental design elements
- **Documentation Theme**: the `/components/pages/documentation/DocContainer/` directory contains a `theme.ts` and a `style.ts` which controls the documentation section styling including colors, fonts, and spacing

**Color Customization:** to update the color palette to match your organization's branding:

```typescript
// In /apps/stage/components/theme/theme.ts
const theme = {
  colors: {
    primary: "#0B75A2", // Main brand color
    primary_green: "#00A88F", // Secondary brand color
    sidebar: "#f5f6f7", // Sidebar background
    text: "#2d3748", // Main text color
    textSecondary: "#4a5568", // Secondary text color
    // Additional color settings...
  },
  // Other theme properties...
};
```

> **Note:** We are working on improving the Stage developer experience, as such we will have planned updates for our theming system. Updates will be documented and linked here once available.

**Component Customization:** notable component directories for customization:

- **Home Page**: `/components/pages/home/` contains all components for the landing page
- **Documentation Pages**: `/components/pages/documentation/` documentation-specific components
- **Data Tables**: `/components/pages/activeDataTables/` data exploration page components
- **Navigation**: `/components/Navbar/NavBar.tsx` customizes the top navigation bar

**Responsive Design:** breakpoint settings can be customized in the theme files:

```typescript
// In theme.ts
breakpoints: {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
},
```

**Typography Customization:** the application's typography is controlled through two main systems:

1. **Base Font Family** - Set in `/components/theme/typography.ts`:

   ```typescript
   const baseFont = css`
     font-family: "Lato", sans-serif;
   `;
   ```

2. **Typography Variants** - Predefined styles for different text elements:

   ```typescript
   // Examples from typography.ts
   const heading = css`...`; // 18px bold for section titles
   const subheading = css`...`; // 16px bold for secondary headings
   const data = css`...`; // 13px normal for general text content
   ```

3. **Documentation Theme** - Typography settings specific to documentation pages in `/components/pages/documentation/DocContainer/theme.ts`:
   ```typescript
   // In theme.ts
   fonts: {
     base: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
     mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
     heading: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
   },
   ```
   </details>

<details>
<summary>Automatic Navigation Updates</summary>
 Using next.js we automatically handle updates to certain components and navigation elements:

- **Documentation Pages**: Files in the `/public/docs/` directory are automatically listed in the documentation sidebar in order defined by their numeric prefix (e.g., `00-` appears first)
- **Data Tables**: Components within `/components/pages/activeDataTables/` are automatically included in navigation menus

</details>

<details>
<summary>Other considerations</summary>

- Use the `@emotion/react` CSS-in-JS library that's already integrated
- Modify component-specific styles found within each component file
- Consider creating custom theme extensions in `/components/theme/` for specialized styling needs

By focusing on these key areas, you can quickly theme the portal to match your organization's visual identity while maintaining the portal's functionality.

</details>

## Step 5: Uploading your data

With Arranger, Stage, and Elasticsearch configured we are ready to load our data into the portal. We will use Conductors `upload` command to transform our CSV files into Elasticsearch documents and load them into the portal.

### A) Installing Conductor

1. Move to the Conductor App directory:

   ```
   cd ./apps/conductor
   ```

2. Run the following commands:

   ```
   npm install
   npm run build
   npm install -g .
   ```

   <details>
   <summary>Alternative: using Conductor without global installation</summary>

   If you prefer not to install globally, you can run Conductor directly from the project directory:

   ```bash
   cd apps/conductor
   npm install
   npm start -- <profile> [options]
   ```

   For example:

   ```bash
   npm start -- upload -f data.csv -i my-index
   ```

   </details>

3. **Validate:** run `conductor -h`, you should be able to see help text outlining the available commands.

### B) Loading your data into the portal

4. **Load your data:** Run the Conductor `upload` command to upload your data:

   ```
   conductor upload -f ./data/datatable1.csv -i datatable1-index
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-f ./data/datatable1.csv`: Specifies the input data file to upload
   - `-i datatable1-index`: Specifies the target Elasticsearch index

   Additional options:

   - `-b, --batch-size <n>`: Number of records to upload in each batch (default: 1000)
   - `--delimiter <char>`: CSV delimiter character (default: comma)
   - `-o, --output <path>`: Path for saving upload logs

   The command processes your CSV file, transforms it according to the index mapping structure, and uploads it to Elasticsearch in batches.

   Full command reference can be seen by running `conductor upload -h`.
   </details>

5. **Repeat for additional datasets:** If you have multiple datasets, repeat the upload command for each one, ensuring you specify the correct index name for each upload

   ```
   conductor upload -f ./data/datatable2.csv -i datatable2-index
   ```

   <details>
   <summary>Validation</summary>

   To verify that your data was successfully uploaded:

   1. **Check the Conductor Output**:

      - Confirm the final message shows successful completion
      - Verify the record count matches your expectations
      - Check for any error messages

   2. **Verify Data in Elasticsearch**:

      - Open Elasticvue (http://localhost:9200) if you have it installed
      - Navigate to Indices and select your index (e.g., `datatable1-index`)
      - Browse documents to ensure they contain the expected data

   3. **Check the Stage UI**:

      - Navigate to http://localhost:3000 in your browser
      - Go to your data exploration page
      - Verify that your data appears in the table
      - Test the search and filter functionality to ensure it works correctly

   </details>

## Support & Contributions

For support, feature requests, and bug reports, please see our [Support Guide](/documentation/support).

For detailed information on how to contribute to this project, please see our [Contributing Guide](/documentation/contribution).

> **Next Steps:** In phase 2 we will add our backend data submission and storage services.

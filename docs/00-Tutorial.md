# Tutorial

## Overview

**This guide is for** those using the Overture search and exploration demo environment. The primary goal is to guide users who want to input there data into the portal UI for search and exploration.

> **Note:** For a more comprehensive end-to-end platorm deployment guide see our [prelude documentation](https://docs.overture.bio/docs/platform-tools/prelude).

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

### Architecture Overview

The architecture is diagramed below and detailed in the following table:

![Phase 1 Architecture Diagram](/docs/images/arch-overview.png "Phase 1 Architecture Diagram")

| Component                                                                                                  | Description                                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Conductor**                                                                                              | A command-line tool for processing CSV files into Elasticsearch. It handles data transformation and loading. |
| **Composer**                                                                                               | A command-line tool for generating base Oveture configuration files.                                         |
| **[Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/elasticsearch-intro.html)** | A powerful search and analytics engine that enables flexible and efficient querying of massive datasets.     |
| **[Arranger](https://docs.overture.bio/docs/core-software/arranger/overview)**                             | A search API and UI component generation service that creates configurable data exploration interfaces.      |
| **[Stage](https://docs.overture.bio/docs/core-software/stage/overview/)**                                  | A React-based user interface framework designed for easy deployment of customizable data portals.            |

## Step 1: Preparing your data

The `data` folder at the root of this project is for storing data files used in your project. Below are guidelines for data management:

- **File Format**: We support multiple delimiters, but Comma-Separated Values (CSV) are the recommended format for tabular data input.
- **Headers**: Include appropriate headers in your CSV files (more details below). These headers will directly map to your Elasticsearch and GraphQL field names.
- **Data Privacy**: If needed, to prevent accidental exposure of sensitive data, add your data files to `.gitignore` before committing to GitHub .
- **Data Size**: There are no strict size limitations beyond the resource constraints of Docker and Elasticsearch. For development and testing, we recommend using a representative sample of approximately 500 records.

### Implementation

1. Collect your data in CSV format. For phase 1, each CSV file will become a separate data table on your exploration page(s). The structure of each CSV directly determines the columns and fields available for search and display in the user interface.

   > **Note:** Overture is made to handle both flat and hierarchical data structures. If you have hierarchical (or nested) data (e.g., a patient record with multiple associated tests, or a sample with multiple sequencing results), this can be achieved using our dictionary management service lectern paired with our tabulur (Lyric) and or file (song) submission management services. For this phase, we are focusing on creating flat representations of how you want your data to appear in the search UI.

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
   composer -p elasticsearchmapping -f ./data/datatable1.csv -i datatable1 -o ./setup/configs/elasticsearchConfigs/datatable1-mapping.json
   ```

    <details>
    <summary>Command Breakdown</summary>

   In this command:

   - `-p ElasticsearchMapping`: Specifies the operation to generate an Elasticsearch mapping schema
   - `-f ./data/datatable1.csv`: Specifies the input data file to analyze
   - `-i datatable1`: Sets the Elasticsearch index name to "datatable1"
   - `-o ./setup/configs/elasticsearchConfigs/datatable1-mapping.json`: Sets the output path for the generated mapping file

   The command analyzes the structure of datatable1.csv and creates an appropriate Elasticsearch mapping configuration, which defines how the data will be indexed and searched in Elasticsearch.

   A detailed overview of all available options for the ElasticsearchMapping command can be seen by running `composer -h`.

    </details>

   ![Output](/docs/images/ElasticsearchMapping.png "Terminal output from ElasticsearchMapping")

   > **Note:** The `setup/configs/elasticsearchConfigs/` directory contains your Elasticsearch mapping templates. In the docker-compose configuration, this directory is mounted as a volume to the setup service, which uses these files to automatically initialize your Elasticsearch indices. This automation process is explained in greater detail in the following sections.

2. Validate and review the generated mapping template(s):

   After running the command, examine the generated index mapping in the `setup/configs/elasticsearchConfigs` directory. The mapping contains several critical components:

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
    composer -p ArrangerConfigs -f ./setup/configs/elasticsearchConfigs/datatable1-mapping.json -o ./setup/configs/arrangerConfigs/datatable1/
    ```

    <details>
    <summary>Command Breakdown</summary>

    In this command:

    - `-p arrangerconfigs`: Specifies the operation to generate Arranger configuration files
    - `-f ./setup/configs/elasticsearchConfigs/datatable1-mapping.json`: Specifies the input Elasticsearch mapping file to use as a template
    - `-o ./setup/configs/arrangerConfigs/datatable1/`: Sets the output directory for the generated Arranger configuration files

    The command analyzes the Elasticsearch mapping structure and creates appropriate Arranger configuration files, which define how data will be displayed, filtered, and queried in the Arranger UI.

    A detailed overview of all available options for the ArrangerConfigs command can be seen by running `composer -h ArrangerConfigs`.

    </details>

    ![Output](/docs/images/ArrangerConfigs.png "Terminal output from ArrangerConfigs")

2.  Validate and review the generated Arranger configuration files:

    - **Directory structure:** should now look like the following:

      ```
      setup/configs
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

The `docker-compose.yml` automates all deployments including index management through the setup service. Here you'll update environment variables and service configurations to reflect your dataset(s) and connect them with the configuration files generated in the previous steps.

### A) Update the setup service

From the docker-compose file, update the following environment variables within the setup service:

```
Elasticsearch Index Configuration
ES_INDEX_COUNT: 1 # Update this if you have multiple datasets (Each data table should have its own index)

First Index
ES_INDEX_0_NAME: datatable1-index
ES_INDEX_0_TEMPLATE_FILE: setup/configs/elasticsearchConfigs/datatable1-mapping.json
ES_INDEX_0_TEMPLATE_NAME: datatable1_template
ES_INDEX_0_ALIAS_NAME: datatable1_centric

Add more indices if needed
ES_INDEX_1_NAME: datatable2-index
ES_INDEX_1_TEMPLATE_FILE: setup/configs/elasticsearchConfigs/datatable2-mapping.json
ES_INDEX_1_TEMPLATE_NAME: datatable2_template
ES_INDEX_1_ALIAS_NAME: datatable2_centric
```

### B) Configuring the Arranger Service(s)

1. For each CSV dataset, you'll need to configure a separate Arranger service. The docker-compose file includes a template (`arranger-datatable1`) and additional examples that you can use as reference:

   ```yaml
   arranger-datatable1:
     profiles: ["demo", "default"]
     image: ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
     container_name: arranger-datatable1
     platform: linux/amd64
     depends_on:
       setup:
         condition: service_healthy
     ports:
       - "5050:5050" # External port : Internal port
     volumes:
       - ./setup/configs/arrangerConfigs/datatable1:/app/modules/server/configs
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
       - platform-network
   ```

   > **Note:** For each additional dataset, you can copy or uncomment an existing Arranger service block in the docker-compose file. If creating a new Arranger service, ensure you are using a unique port in both the `ports` mapping (`"5051:5051"`) and the `PORT` environment variable. Also update the container name, volume path, and Arranger set index to match your new dataset.

2. Update the Arranger Count in the setup service: If you have multiple datasets/Arranger instances, update the `ARRANGER_COUNT` and add environment variables with URLs for each. In the example below `ARRANGER_1_URL` is commented. Make sure to uncomment any additionally added Arranger URLs.

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

This section guides you through customizing the base portal UI (Stage), including setting up your development environment, adding additional data tables, and theming your portal.

<details>
<summary>Setting up the local Stage development environment</summary>

To run Stage locally for development and customization:

```bash
   # Navigate to the Stage directory
   cd apps/stage

   # Install dependencies
   npm ci

   # Start the development server
   npm run dev
```

> **Note:** Stage uses the existing `.env` file in the stage directory. If you need to customize environment variables for local development, edit the `/apps/stage/.env` file directly.

Your development server will be accessible at:

- Primary: http://localhost:3000
- Fallback: http://localhost:3001 (if 3000 is occupied)

**Development Tips:**

- Hot reload is enabled - changes will automatically reflect in your browser
- Check the terminal for compilation errors
- Use browser DevTools to inspect React components and styling

</details>

<details>
<summary>Adding Additional Data Tables (Multi-Table Setup)</summary>

The portal supports up to 5 independent data tables. By default, `dataTableOne` is active. Follow these steps to add additional tables:

### Step 1: Prepare Your Data Table Configuration

Before adding a new table (e.g., `dataTableTwo`), ensure you've completed Step 2 of this tutorial and have:

1. **Elasticsearch Index Mapping**: Created mapping file at `setup/configs/elasticsearchConfigs/datatable2-mapping.json`
2. **Arranger Configurations**: Created configuration files in `setup/configs/arrangerConfigs/datatable2/`:
   - `extended.json` - Field display configurations
   - `facets.json` - Facet/filter configurations
   - `table.json` - Table column configurations
   - `base.json` - Base index configuration

### Step 2: Update Docker Compose Configuration

This step was covered in Step 3 of this tutorial. Ensure you have:

1. **Added Arranger service** for datatable2 in `docker-compose.yml`:

   ```yaml
   arranger-datatable2:
     profiles: ["demo", "default"]
     image: ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
     container_name: arranger-datatable2
     platform: linux/amd64
     depends_on:
       setup:
         condition: service_healthy
     ports:
       - "5051:5051" # Unique external port
     volumes:
       - ./setup/configs/arrangerConfigs/datatable2:/app/modules/server/configs
     environment:
       ES_HOST: http://elasticsearch:9200
       ES_USER: elastic
       ES_PASS: myelasticpassword
       ES_ARRANGER_SET_INDEX: datatable2_arranger_set # Unique set index
       PORT: 5051 # Must match internal port above
       DEBUG: false
       ENABLE_LOGS: false
     networks:
       - platform-network
   ```

2. **Updated Stage environment variables** in `docker-compose.yml`:

   ```yaml
   # Data Table 2
   NEXT_PUBLIC_ARRANGER_DATATABLE_2_API: http://arranger-datatable2:5051
   NEXT_PUBLIC_ARRANGER_DATATABLE_2_DOCUMENT_TYPE: file
   NEXT_PUBLIC_ARRANGER_DATATABLE_2_INDEX: datatable2_centric
   NEXT_PUBLIC_DATATABLE_2_EXPORT_ROW_ID_FIELD: submission_metadata.submitter_id
   ```

3. **Updated setup service configuration** with the new index in `docker-compose.yml`:

   ```yaml
   # In setup service environment:
   ES_INDEX_COUNT: 2 # Increment count
   # ... existing ES_INDEX_0_* variables ...
   ES_INDEX_1_NAME: datatable2-index
   ES_INDEX_1_TEMPLATE_FILE: setup/configs/elasticsearchConfigs/datatable2-mapping.json
   ES_INDEX_1_TEMPLATE_NAME: datatable2-index
   ES_INDEX_1_ALIAS_NAME: datatable2_centric

   # Update Arranger count
   ARRANGER_COUNT: 2
   ARRANGER_0_URL: http://arranger-datatable1:5050
   ARRANGER_1_URL: http://arranger-datatable2:5051
   ```

**Important**: Each Arranger service requires:

- Unique external port (5050, 5051, 5052, etc.)
- Unique container name
- Unique `ES_ARRANGER_SET_INDEX` value
- Matching `PORT` environment variable with the internal port

### Step 3: Create the Stage Page Route

Navigate to the Stage directory and create a new page by copying the existing dataTableOne structure:

```bash
cd apps/stage
cp -r pages/dataTableOne pages/dataTableTwo
```

### Step 4: Update the Page Configuration

Edit `pages/dataTableTwo/index.tsx` and update the configuration to reference datatable2:

```tsx
// Update the environment variable references
const {
  NEXT_PUBLIC_ARRANGER_DATATABLE_2_ADMIN_UI,
  NEXT_PUBLIC_ARRANGER_DATATABLE_2_DOCUMENT_TYPE,
  NEXT_PUBLIC_ARRANGER_DATATABLE_2_INDEX,
  NEXT_PUBLIC_DATATABLE_2_EXPORT_ROW_ID_FIELD,
  NEXT_PUBLIC_ENABLE_DATATABLE_2_QUICKSEARCH,
} = getConfig();

// Update the DataExplorerPage config
<DataExplorerPage
  config={{
    // Update API proxy reference
    arrangerApi: INTERNAL_API_PROXY.DATATABLE_2_ARRANGER,
    arrangerDocumentType: NEXT_PUBLIC_ARRANGER_DATATABLE_2_DOCUMENT_TYPE,
    arrangerIndex: NEXT_PUBLIC_ARRANGER_DATATABLE_2_INDEX,
    arrangerAdminUI: NEXT_PUBLIC_ARRANGER_DATATABLE_2_ADMIN_UI,
    exportRowIdField: NEXT_PUBLIC_DATATABLE_2_EXPORT_ROW_ID_FIELD,

    // Update page metadata
    pageSubtitle: "Dataset 2 Data Explorer",
    callerName: "DataTableTwo",

    // Update feature flags
    enableQuickSearch: NEXT_PUBLIC_ENABLE_DATATABLE_2_QUICKSEARCH,

    // Update export config
    exportConfig: {
      fileName: `dataset-2-data-export.${today}.tsv`,
      customExporters: [
        {
          label: "Download",
          fileName: `dataset-2-data-export.${today}.tsv`,
        },
      ],
    },
  }}
/>;
```

### Step 5: Update API Proxy Configuration

Edit `apps/stage/global/utils/constants.ts` to add the proxy constant for datatable2:

```typescript
export const INTERNAL_API_PROXY = {
  DATATABLE_1_ARRANGER: "/api/dataset_1_arranger",
  DATATABLE_2_ARRANGER: "/api/dataset_2_arranger", // Add this line
  // ... other proxies
};
```

Then create the API proxy route at `apps/stage/pages/api/dataset_2_arranger/[...proxy].ts`:

```typescript
import { getConfig } from "../../../global/config";
import { createProxyMiddleware } from "http-proxy-middleware";

const { NEXT_PUBLIC_ARRANGER_DATATABLE_2_API } = getConfig();

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default createProxyMiddleware({
  target: NEXT_PUBLIC_ARRANGER_DATATABLE_2_API,
  changeOrigin: true,
  pathRewrite: {
    "^/api/dataset_2_arranger": "",
  },
});
```

### Step 6: Update Navigation (Optional)

The data tables automatically appear in the navigation dropdown. To customize the display name, edit `apps/stage/components/NavBar/DataTablesDropdown.tsx` and add your table configuration.

### Step 7: Rebuild and Restart

1. **Stop existing services**:

   ```bash
   docker compose --profile demo down
   ```

2. **Rebuild Stage** (required for code changes):

   ```bash
   docker compose build stage
   ```

3. **Start services**:

   ```bash
   docker compose --profile demo up -d
   ```

4. **Verify the new page**:
   - Navigate to http://localhost:3000/dataTableTwo
   - Check the navigation menu for the new data table link
   - Verify data loads correctly from Elasticsearch

### Repeat for Additional Tables

To add `dataTableThree`, `dataTableFour`, or `dataTableFive`, repeat the above steps with the corresponding table number. The configuration files (`next.config.js` and `global/config.ts`) already support up to 5 data tables.

</details>

> **Note:** We support multiple tables and are continuously improving this activation process. Future updates will streamline multi-table setup with automated scaffolding tools.

<details>
<summary>Theming and Visual Customization</summary>

Stage uses React with Emotion CSS-in-JS, providing extensive theming options to match your organization's brand.

### Core Theme Assets

**Logo and Icons:**

- **Logo**: Replace `/apps/stage/public/images/logo.svg` with your logo (recommended: SVG format, max height 40px)
- **Favicon**: Update `/apps/stage/public/favicon.ico` (16x16 or 32x32 pixels)

### Color Palette Customization

Update your brand colors in `/apps/stage/components/theme/colors.ts`:

```typescript
export const colors = {
  // Primary brand colors
  primary: "#0B75A2", // Main CTAs, links, active states
  primary_green: "#00A88F", // Secondary actions, success states

  // Background colors
  sidebar: "#f5f6f7", // Sidebar and navigation backgrounds
  background: "#ffffff", // Main content background

  // Text colors
  text: "#2d3748", // Primary text
  textSecondary: "#4a5568", // Secondary/muted text

  // UI element colors
  border: "#e2e8f0", // Borders and dividers
  hover: "#edf2f7", // Hover states

  // Semantic colors
  error: "#e53e3e",
  warning: "#dd6b20",
  success: "#38a169",
  info: "#3182ce",
};
```

**Testing your colors:**

1. Update the color values
2. Restart the dev server (`npm run dev`)
3. Check primary buttons, navigation, and data table elements
4. Ensure sufficient contrast for accessibility (use a contrast checker)

### Typography Customization

**1. Font Family**

Update base fonts in `/apps/stage/components/theme/typography.ts`:

```typescript
const baseFont = css`
  font-family: "Lato", sans-serif;
`;
```

**2. Typography Scale**

Predefined text styles available in `typography.ts`:

```typescript
const heading = css`...`; // 18px bold - Section titles
const subheading = css`...`; // 16px bold - Subsections
const paragraph = css`...`; // 14px normal - Body text
const data = css`...`; // 13px normal - Data display
const small = css`...`; // 12px normal - Metadata, captions
```

**3. Component-Specific Typography**

Typography is consistently applied across components through the theme system. For documentation-specific styling, refer to `/apps/stage/components/pages/documentation/THEMING.md` for detailed guidelines on customizing documentation page typography and styles.

### Component-Level Customization

**Key directories for component styling:**

| Directory                                       | Purpose                                 |
| ----------------------------------------------- | --------------------------------------- |
| `/apps/stage/components/pages/home/`            | Homepage components (hero, cards, CTAs) |
| `/apps/stage/components/pages/documentation/`   | Documentation page components           |
| `/apps/stage/components/pages/dataExplorer/`    | Data exploration UI components          |
| `/apps/stage/components/NavBar/`                | Navigation bar components               |
| `/apps/stage/components/theme/`                 | Global theme definitions                |

**Example: Customizing the navigation bar**

Edit `/apps/stage/components/NavBar/NavBar.tsx`:

```tsx
const navStyles = css`
  background: ${theme.colors.primary};
  height: 60px;
  padding: 0 2rem;
  /* Add your custom styles */
`;
```

### Responsive Design Breakpoints

Customize breakpoints in theme files for different screen sizes:

```typescript
breakpoints: {
  xs: '480px',   // Mobile phones
  sm: '640px',   // Large phones
  md: '768px',   // Tablets
  lg: '1024px',  // Small laptops
  xl: '1280px',  // Desktop
  xxl: '1536px', // Large screens
},
```

**Using breakpoints in components:**

```tsx
const ResponsiveComponent = styled.div`
  padding: 1rem;

  @media (min-width: ${theme.breakpoints.md}) {
    padding: 2rem;
  }

  @media (min-width: ${theme.breakpoints.lg}) {
    padding: 3rem;
  }
`;
```

### Testing Your Theme Changes

**Checklist:**

- [ ] Test on multiple screen sizes (mobile, tablet, desktop)
- [ ] Verify color contrast meets WCAG AA standards
- [ ] Check hover and active states on interactive elements
- [ ] Test data table readability with your color scheme
- [ ] Verify navigation menu appearance
- [ ] Check documentation page styling
- [ ] Test dark/light mode if implemented

**Browser DevTools:**

- Use React DevTools to inspect component props and state
- Use CSS inspector to debug styling issues
- Test responsive breakpoints with device emulation

</details>

<details>
<summary>Automatic Navigation Updates</summary>

Stage uses Next.js file-based routing with automatic navigation generation:

**Documentation Pages:**

- Files in `/apps/stage/public/docs/` automatically appear in the documentation sidebar
- Ordering is controlled by numeric prefixes (e.g., `00-Tutorial.md`, `01-FAQ.md`)
- Markdown files are automatically rendered with syntax highlighting

**Data Table Pages:**

- Pages in `/apps/stage/pages/dataTableOne/`, `/apps/stage/pages/dataTableTwo/`, etc. are file-based routes
- Navigation menu items are managed via `/apps/stage/components/NavBar/DataTablesDropdown.tsx`
- Each data table page uses the shared `DataExplorerPage` component from `/apps/stage/components/pages/dataExplorer/`

**Manual Navigation Configuration:**
If you need to manually configure navigation, edit `/apps/stage/components/NavBar/NavBar.tsx` to add custom menu items or modify the navigation structure.

</details>

<details>
<summary>Development Best Practices</summary>

**Using Emotion CSS-in-JS:**

- Leverage the `@emotion/react` library already integrated in Stage
- Use the `css` prop for inline styles or create styled components
- Import theme values to maintain consistency

**Component Styling:**

- Keep component-specific styles within component files
- Use theme variables instead of hard-coded values
- Create reusable styled components in `/apps/stage/components/theme/` for common patterns

**Creating Custom Theme Extensions:**

- Add new theme modules in `/apps/stage/components/theme/` for specialized needs
- Export theme functions and utilities for reuse across components
- Document custom theme additions for team members

**Version Control:**

- Commit theme changes separately from functionality changes
- Test theme changes across all pages before committing
- Document breaking changes in theme structure

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

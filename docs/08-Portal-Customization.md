# Portal Customization

Stage is a React-based portal framework with built-in theming and multi-table support. This section covers how to customize the portal's appearance and add additional data exploration pages. These steps are optional. The portal works out of the box with default styling.

## Theming

### Core Assets

The quickest visual changes:

- **Logo:** Replace `apps/stage/public/images/navbar-logo.png` with your organization's logo
- **Favicon:** Replace `apps/stage/public/images/favicon.ico` with your browser tab icon

### Color Palette

Colors are defined in `apps/stage/components/theme/colors.ts` as flat palette objects. The key ones to update:

```typescript
const primary = {
  primary: "#113052", // Main brand color (navigation, headers)
  primary_dark: "#0A1F35", // Darker variant (hover states)
  primary_light: "#1A4270", // Lighter variant
};

const secondary = {
  secondary: "#0B75A2", // Secondary brand color (buttons, links)
  secondary_dark: "#109ED9",
  secondary_light: "#4BC6F0",
};
```

Change these hex values to match your organization's branding. The `primary` color appears in the navigation bar and headers; `secondary` is used for buttons, links, and interactive elements.

### Typography

Font settings are in `apps/stage/components/theme/typography.ts`:

```typescript
const baseFont = css`
  font-family: "Lato", sans-serif;
`;
```

Additional typography variants (heading, subheading, data) can be adjusted in the same file.

### Portal Name

The portal name displayed in the UI is set via the `NEXT_PUBLIC_LAB_NAME` environment variable in `docker-compose.yml`:

```yaml
NEXT_PUBLIC_LAB_NAME: ISB Workshop 2026
```

Change this to your lab or project name.

## Adding Multiple Data Tables

Stage supports up to 5 independent data exploration pages. Each data table corresponds to a separate CSV file, Elasticsearch index, and Arranger instance.

> **Before starting:** Adding a second data table requires completing the full configuration pipeline for that dataset — generating a new PostgreSQL schema, Elasticsearch mapping, and Arranger configs (steps 1–3 of [05-Generating-Configurations.md](05-Generating-Configurations.md)), adding the corresponding docker-compose service entries (see [06-Docker-Configuration.md](06-Docker-Configuration.md)), and loading the data (see [07-Loading-Data.md](07-Loading-Data.md)). The steps below cover only the Stage-side changes needed once that infrastructure is in place.

### Step 1: Create a New Page File

Each data table is a Next.js page that wraps the shared `DataExplorerPage` component with its own configuration. Create a new page by copying the existing one as a template:

```bash
cp -r apps/stage/pages/dataTableOne apps/stage/pages/dataTableTwo
```

Open `apps/stage/pages/dataTableTwo/index.tsx` and update the config block to reference the new table's environment variables:

```typescript
const {
  NEXT_PUBLIC_ARRANGER_DATATABLE_2_DOCUMENT_TYPE,
  NEXT_PUBLIC_ARRANGER_DATATABLE_2_INDEX,
  NEXT_PUBLIC_DATATABLE_2_EXPORT_ROW_ID_FIELD,
} = getConfig();
```

And update the `DataExplorerPage` props accordingly (document type, index, export field, page subtitle).

### Step 2: Update Environment Variables

Add the new data table's Arranger connection to `docker-compose.yml` (covered in the Docker Configuration section):

```yaml
NEXT_PUBLIC_ARRANGER_DATATABLE_2_API: http://arranger-datatable2:5051
NEXT_PUBLIC_ARRANGER_DATATABLE_2_DOCUMENT_TYPE: file
NEXT_PUBLIC_ARRANGER_DATATABLE_2_INDEX: datatable2_centric
```

### Step 3: Rebuild and Restart

Since Stage is a compiled Next.js application, UI changes require a rebuild:

```bash
make restart
```

The new data table will automatically appear in the navigation menu and homepage.

### Key Configuration Files

These files contain variable declarations used by the data table components:

- `apps/stage/next.config.js`: environment variable mappings
- `apps/stage/global/config.ts`: application configuration
- `apps/stage/global/utils/constants.ts`: constant definitions
- `apps/stage/pages/api/[...proxy].ts`: API proxy routes

## Local Development

For iterating on UI changes without rebuilding the Docker image each time, you can run Stage locally against the Dockerised services:

```bash
cd apps/stage
npm ci
npm run dev
```

This starts a local development server (typically at http://localhost:3001) with hot-reloading. Changes to components, themes, and styles are reflected immediately. You will need to set the relevant `NEXT_PUBLIC_*` environment variables in a local `.env` file pointing to the running Docker services.

## Updating the Documentation Section

The portal's documentation page is powered entirely by Markdown files, no code changes required. The `docs/` folder at the project root is symlinked into Stage at `apps/stage/public/docs/`, so any `.md` file you add or edit there is immediately reflected in the portal after a restart.

Files are listed in the sidebar ordered by their numeric prefix:

```
docs/
├── 00-Introduction.md
├── 01-Pre-Workshop-Setup.md
├── 02-Running-the-Demo.md
└── ...
```

To add a new documentation page, create a Markdown file with the next number in sequence. To remove a page, delete the file. The navigation sidebar updates automatically.

## Automatic Navigation

Stage automatically handles navigation updates:

- **Documentation pages:** Markdown files in `docs/` are picked up automatically, ordered by their numeric prefix (`00-`, `01-`, etc.)
- **Data tables:** New page routes added under `apps/stage/pages/` are automatically included in navigation menus

## Additional Component Directories

For deeper customization:

| Directory                         | Controls                   |
| --------------------------------- | -------------------------- |
| `components/pages/home/`          | Landing page content       |
| `components/pages/documentation/` | Documentation page styling |
| `components/NavBar/NavBar.tsx`    | Top navigation bar         |
| `components/HeroBanner.tsx`       | Landing page hero section  |
| `components/Footer.tsx`           | Page footer                |

The application uses `@emotion/react` for CSS-in-JS styling. Component-specific styles are located within each component file.

## Checkpoint

At this point you should understand:

- [ ] Where to change the portal name (`NEXT_PUBLIC_LAB_NAME` in docker-compose.yml)
- [ ] Where to replace the logo and favicon (`apps/stage/public/images/`)
- [ ] Where theme colors and fonts are defined (`apps/stage/components/theme/`)
- [ ] That adding a new data table requires a component, a page route, environment variables, and an Arranger service

> **Next:** Learn about deploying your portal on a network with nginx.

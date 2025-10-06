# Dictionary Viewer Component

## Overview

The Dictionary Viewer displays data dictionaries using the [Lectern UI](https://github.com/overture-stack/lectern) library. It follows the same architectural pattern as the Arranger data explorer for consistency and maintainability.

## Architecture

```
Page (pages/dictionary/index.tsx)
    ↓
DictionaryViewer Component (components/pages/dictionary/DictionaryViewer.tsx)
    ↓
Lectern UI Library
    ├── LecternDataProvider (data fetching)
    ├── DictionaryTableStateProvider (state management)
    ├── ThemeProvider (theming)
    └── DictionaryTable (UI component)
```

## Pattern Comparison

### Arranger Pattern (Data Explorer)
```typescript
// Page
<PageLayout>
  <ArrangerDataProvider config={...}>
    <PageContent />
  </ArrangerDataProvider>
</PageLayout>

// Uses: @overture-stack/arranger-components
```

### Lectern Pattern (Dictionary) ✅
```typescript
// Page
<PageLayout>
  <DictionaryViewer hostedUrl="..." />
</PageLayout>

// Uses: @overture-stack/lectern-ui
```

**Both follow the same pattern**: Page → Provider Component → Content

## Component Structure

### DictionaryViewer.tsx

**Responsibilities:**
- Theme integration (Stage → Lectern adapter)
- Provider setup (data + state + theme)
- Component rendering (DictionaryTable)

**Key Features:**
- ✅ Uses public exports only (no internal paths)
- ✅ No @ts-ignore hacks
- ✅ Integrates with Stage global theme
- ✅ Reusable and testable

### pages/dictionary/index.tsx

**Responsibilities:**
- Page layout
- Route configuration
- Pass data URL to viewer

**Key Features:**
- ✅ Clean and minimal (~60 lines)
- ✅ Separation of concerns
- ✅ Easy to understand

## Before vs. After

### Before (❌ Issues)

```typescript
// pages/dictionary/index.tsx
// ❌ @ts-ignore hacks
// @ts-ignore
import { DictionaryTableViewer } from '@overture-stack/lectern-ui/dist/viewer-table/DictionaryTableViewer';
// @ts-ignore
import { HostedDictionaryDataProvider } from '@overture-stack/lectern-ui/dist/dictionary-controller/DictionaryDataContext';

// ❌ All logic in page component
// ❌ Using internal/private paths
// ❌ Theme logic mixed with page logic
```

**Problems:**
- Internal imports could break on Lectern updates
- @ts-ignore suppresses type safety
- All logic in page (hard to test/reuse)
- Inconsistent with Arranger pattern

### After (✅ Clean)

```typescript
// components/pages/dictionary/DictionaryViewer.tsx
import {
  DictionaryTable,
  DictionaryTableStateProvider,
  LecternDataProvider,
  ThemeProvider,
} from '@overture-stack/lectern-ui'; // ✅ Public exports only

export const DictionaryViewer = ({ hostedUrl }) => {
  const lecternTheme = createLecternTheme(useTheme());

  return (
    <ThemeProvider theme={lecternTheme}>
      <LecternDataProvider hostedUrl={hostedUrl}>
        <DictionaryTableStateProvider>
          <DictionaryTable />
        </DictionaryTableStateProvider>
      </LecternDataProvider>
    </ThemeProvider>
  );
};

// pages/dictionary/index.tsx
<DictionaryViewer hostedUrl="/dictionary/dictionary.json" />
```

**Benefits:**
- Public API only (safe from breaking changes)
- Full type safety (no @ts-ignore)
- Separated concerns (testable, reusable)
- Consistent with Arranger pattern

## Usage

### Basic Usage
```typescript
import { DictionaryViewer } from '@/components/pages/dictionary';

<DictionaryViewer hostedUrl="/path/to/dictionary.json" />
```

### With Custom Styling
```typescript
<div css={containerStyles}>
  <DictionaryViewer hostedUrl="/dictionary/dictionary.json" />
</div>
```

### Multiple Dictionaries (Future)
```typescript
<Tabs>
  <TabPanel>
    <DictionaryViewer hostedUrl="/dict1.json" />
  </TabPanel>
  <TabPanel>
    <DictionaryViewer hostedUrl="/dict2.json" />
  </TabPanel>
</Tabs>
```

## Theme Integration

The viewer automatically integrates with Stage global theme via the [Lectern adapter](../../theme/adapters/lectern.ts):

```typescript
Stage Global Theme → Lectern Adapter → DictionaryViewer
```

All colors derive from [colors.ts](../../theme/colors.ts), ensuring visual consistency across the application.

## Testing

The separated structure makes testing straightforward:

```typescript
// Test the viewer independently
<ThemeProvider theme={testTheme}>
  <DictionaryViewer hostedUrl="/test-dict.json" />
</ThemeProvider>

// Test the page
<DictionaryPage />
```

## Related Files

- **Viewer**: [DictionaryViewer.tsx](./DictionaryViewer.tsx)
- **Page**: [pages/dictionary/index.tsx](../../../pages/dictionary/index.tsx)
- **Theme Adapter**: [theme/adapters/lectern.ts](../../theme/adapters/lectern.ts)
- **Arranger Pattern**: [components/pages/dataExplorer/](../dataExplorer/)

---

**Status**: ✅ Refactored | **Pattern**: Matches Arranger | **Type Safety**: Full

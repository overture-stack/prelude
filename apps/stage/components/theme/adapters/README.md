# Theme Adapters

## Purpose

Transform the Stage global theme into context-specific theme structures for different parts of the application, maintaining **a single source of truth** for colors in [colors.ts](../colors.ts).

## Architecture

```
Stage Global Theme (colors.ts)
    ↓
Theme Adapters (this directory)
    ├── documentation.ts → Documentation pages
    └── lectern.ts      → Dictionary viewer
```

## Available Adapters

### Documentation Adapter
**File**: [documentation.ts](./documentation.ts)

Transforms Stage theme into Docusaurus-inspired documentation theme.

```typescript
import { useTheme } from '@emotion/react';
import { createDocumentationTheme } from '@/components/theme/adapters/documentation';

const theme = createDocumentationTheme(useTheme());
// Provides: colors, fonts, fontSize, spacing, breakpoints, shadows, etc.
```

### Lectern Adapter
**File**: [lectern.ts](./lectern.ts)

Transforms Stage theme colors for Data Dictionary viewer (Lectern UI library).

```typescript
import { createLecternTheme } from '@/components/theme/adapters/lectern';

const lecternTheme = createLecternTheme(useTheme());
// Provides: colors only (uses Lectern defaults for typography/icons/etc)
```

## Key Color Mappings

| Purpose | Stage Source |
|---------|--------------|
| Primary (blue) | `colors.secondary` |
| Success (teal) | `colors.success` |
| Error | `colors.accent2_dark` |
| Warning | `colors.accent3_dark` |
| Text | `colors.black` |
| Borders | `colors.grayscale_lighter` |

## Creating New Adapters

1. **Create adapter file**: `components/theme/adapters/myAdapter.ts`

```typescript
import { StageThemeInterface } from '../index';

export const createMyTheme = (stageTheme: StageThemeInterface) => {
  const { colors } = stageTheme;
  return {
    // Map Stage colors to target structure
    primaryColor: colors.secondary,
    backgroundColor: colors.white,
  };
};
```

2. **Export from index**: Add to `adapters/index.ts`
```typescript
export { createMyTheme } from './myAdapter';
```

3. **Use in component**:
```typescript
import { createMyTheme } from '@/components/theme/adapters';
const myTheme = createMyTheme(useTheme());
```

## Status

| Component | Adapter | Status |
|-----------|---------|--------|
| Documentation Pages | `documentation` | ✅ |
| Dictionary Viewer | `lectern` | ✅ |
| Data Explorer | Native Stage Theme | - |

---

**See also**: [Documentation Theme Guide](../../pages/documentation/THEMING.md)

# UI Style Guide

This document outlines the styling conventions used throughout the application to maintain visual consistency.

## Form and Modal Field Labels

All form field labels should use the `formLabelStyles` from `client/src/components/ui/form-styles.ts`:

```tsx
import { formLabelStyles } from '@/components/ui/form-styles';

// Example usage
<Label htmlFor="fieldName" className={formLabelStyles}>Field Name</Label>
```

This ensures that form labels match the table header styles for consistency across the application.

## Table Headers

Table headers use the `text-muted-foreground` class via the `TableHead` component in `client/src/components/ui/table.tsx`.

## Color Palette

Colors should be referenced using CSS variables defined in the theme:

- Primary text: `text-foreground`
- Secondary text: `text-muted-foreground`
- Primary background: `bg-background`
- Card background: `bg-card`
- Border color: `border-border`

## Typography

- Headings: Use the appropriate heading level (`h1`, `h2`, etc.) with appropriate classes for size and weight.
- Body text: Use `text-sm` or `text-base` for most content.
- Labels: Use `text-sm font-medium text-muted-foreground` (via `formLabelStyles`).

## Components

Use the pre-defined UI components from the `client/src/components/ui/` directory whenever possible, rather than creating custom implementations.

## Form Fields

All form fields should use:
- A `Label` component with `formLabelStyles`
- Appropriate input components (`Input`, `Textarea`, `Select`, etc.)
- Error messages using `text-xs text-red-500`

## Modals

Modals should use:
- `Dialog` and related components from `@/components/ui/dialog`
- Consistent padding and spacing
- Form labels with `formLabelStyles`
- Consistent button placement in the footer 
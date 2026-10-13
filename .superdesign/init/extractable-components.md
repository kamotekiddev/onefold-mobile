# Extractable components

The auth route has no shared logo, header, footer, navbar, or app-shell component that needs extraction. Its root and auth layouts are navigator/provider wrappers rather than reusable visual canvas components.

## Screen
- Source: `src/components/ui/index.tsx`
- Category: basic
- Description: Safe-area-aware, keyboard-aware responsive screen container.
- Extractable props: scroll, title, subtitle
- Hardcoded: 20px padding, 16px gap, 760px max width.

## Button
- Source: `src/components/ui/index.tsx`
- Category: basic
- Description: Full-width native button with primary, secondary, and danger variants.
- Extractable props: label, variant, disabled, loading
- Hardcoded: 48px minimum touch height, 12px control radius.

## Field
- Source: `src/components/ui/index.tsx`
- Category: basic
- Description: Labeled native text input with optional suffix and inline validation error.
- Extractable props: label, placeholder, keyboardType, secureTextEntry, suffix, error
- Hardcoded: input padding, border behavior, typography.

## Card
- Source: `src/components/ui/index.tsx`
- Category: basic
- Description: Bordered surface container.
- Extractable props: none
- Hardcoded: 18px padding, 12px gap, 18px radius.

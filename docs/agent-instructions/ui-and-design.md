# UI And Design

Use these rules for screens, components, and interaction design.

## Mobile First

- Design for small screens first, then expand to tablet and web.
- Use safe area-aware layouts for full-screen views, headers, tabs, and bottom actions.
- Avoid fixed dimensions that break on small devices. Use responsive constraints, flex layout, and measured content.
- Keep important actions reachable with one hand when practical.
- Use large enough spacing and touch targets for mobile input.

## Cross Platform

- Keep iOS, Android, and web compatibility in mind for every component.
- Use platform-specific files only when behavior or styling genuinely differs, for example `.ios.tsx`, `.android.tsx`, or `.web.tsx`.
- Prefer Expo and React Native APIs that work across supported platforms.
- Verify web-only CSS imports have type declarations when TypeScript needs them.

## Accessibility

- Add accessible labels for icon-only controls.
- Use semantic roles where React Native supports them.
- Preserve readable contrast in light and dark modes.
- Do not rely on color alone to communicate state.
- Keep text scalable and avoid clipping when users increase font size.

## Visual Consistency

- Reuse shared components and theme tokens before creating new visual patterns.
- Keep page-level layouts calm and scannable.
- Avoid deeply nested cards or decorative containers that reduce usable space on mobile.
- Use icons from the project's existing icon approach. Do not introduce a new icon package without checking dependency rules.

## Lists And Dense UI

- Use `FlatList` or `SectionList` for long or dynamic lists.
- Provide stable keys.
- Keep list item renderers lean.
- Memoize expensive list item work.
- Handle loading, empty, error, and refresh states when data is remote.


# Coding Standards

Use these rules for TypeScript, React, and shared application code.

## TypeScript

- Keep feature boundaries explicit. Export intended public APIs from each feature's `index.ts`.
- Prefer named exports for components, hooks, utilities, and types.
- Avoid `any`. Use `unknown` at external boundaries, then narrow or validate before use.
- Define reusable domain types close to their owner. Promote only app-wide types to `src/types`.
- Prefer discriminated unions for state with meaningful variants, such as loading, success, empty, and error.
- Keep component props small and intentional. Extract a named `Props` type when props are reused or non-trivial.

## React And Components

- Prefer function components.
- Keep components focused on one responsibility. Split large components when state, rendering, or effects become hard to scan.
- Keep side effects in hooks or feature services when they are not directly about rendering.
- Avoid putting derived state in `useState`; derive it during render or memoize it when expensive.
- Use `useMemo` and `useCallback` for expensive computations, long-list renderers, stable handlers passed deep, or dependency-sensitive effects.
- Prefer composition over large boolean prop APIs.

## Imports

- Use project aliases when already configured by the repo.
- Import across features only through the target feature's `index.ts`.
- Do not import from another feature's `components`, `hooks`, `services`, or `utils` internals directly.
- Keep imports ordered by external packages, app aliases, then relative imports.

## Shared Code

- Keep code feature-local until at least two features need it.
- Use `src/components` for reusable UI and `src/components/ui` for low-level primitives.
- Use `src/hooks` only for hooks that are truly app-wide.
- Use `src/lib` for clients, adapters, config, and framework setup.
- Use `src/utils` for pure app-wide helpers.
- Avoid premature abstraction. Extract when it reduces meaningful duplication or clarifies ownership.

## Styling

- Prefer React Native style objects and existing local styling patterns.
- Keep styles close to the component unless the repo has a shared token or theme module for that concern.
- Use theme constants from `src/constants` instead of hardcoded colors when a token exists.
- Respect dark mode and platform differences.
- Keep touch targets large enough for mobile use.


# Testing

Use these rules when adding or changing tests.

## Placement

- Co-locate tests with the code they cover unless the repo establishes a central test folder.
- Use filenames like `component.test.tsx`, `hook.test.ts`, or `utils.test.ts`.
- Keep feature tests inside the owning feature folder.

## What To Test

- Test feature logic, data transformations, route behavior, and user-visible states.
- Add regression tests for bug fixes when the behavior is easy to isolate.
- Cover loading, empty, success, and error states for remote data.
- Test platform-specific behavior when a component has platform branches.

## React Native And Expo

- Mock native modules only at the boundary.
- Prefer testing user-visible behavior over implementation details.
- Keep mocks small and local unless multiple tests share the same integration.
- Do not rely on local iOS or Android native projects for ordinary test coverage in a Continuous Native Generation setup.

## Verification

- Run `npx expo lint` before declaring implementation work complete.
- Run `npx tsc --noEmit` before declaring implementation work complete.
- If dependency or native configuration changes are involved, run `npx expo-doctor` when possible.
- Report any verification command that cannot run, including the reason and any existing failures.


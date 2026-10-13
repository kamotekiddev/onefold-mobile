# Page dependency trees

## `/sign-in`

Entry: `src/app/(auth)/sign-in.tsx`

- `src/app/(auth)/sign-in.tsx`
  - `src/features/auth/index.ts`
    - `src/features/auth/screens/auth-screen.tsx`
      - `src/components/ui/index.tsx`
        - `src/constants/theme.ts`
      - `src/constants/theme.ts`
      - `src/lib/app-provider.tsx`
        - `src/lib/services.ts`
        - `src/types/domain.ts`
      - `src/features/auth/utils/validation.ts`
- `src/app/(auth)/_layout.tsx`
- `src/app/_layout.tsx`
  - `src/components/ui/index.tsx`
  - `src/constants/theme.ts`
  - `src/lib/app-provider.tsx`
  - `src/lib/services.ts`

## `/register`

Same dependency tree as `/sign-in`, with entry `src/app/(auth)/register.tsx` and `mode="register"`.

## `/forgot-password`

Same dependency tree as `/sign-in`, with entry `src/app/(auth)/forgot-password.tsx` and `mode="forgot-password"`.

## `/`

Entry: `src/app/(app)/(tabs)/index.tsx` → `src/features/routines/index.ts` and its route-level screen dependencies; layouts: `src/app/(app)/(tabs)/_layout.tsx`, `src/app/(app)/_layout.tsx`, `src/app/_layout.tsx`.

## `/history`

Entry: `src/app/(app)/(tabs)/history.tsx` → `src/features/history/index.ts`; uses the same app/tab/root layouts.

## `/settings`

Entry: `src/app/(app)/(tabs)/settings.tsx` → `src/features/settings/index.ts`; uses the same app/tab/root layouts.

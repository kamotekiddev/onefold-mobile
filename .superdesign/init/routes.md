# Expo Router route map

- `/sign-in` — `src/app/(auth)/sign-in.tsx` → `AuthScreen mode="sign-in"`; layouts: auth stack, root protected stack.
- `/register` — `src/app/(auth)/register.tsx` → `AuthScreen mode="register"`; layouts: auth stack, root protected stack.
- `/forgot-password` — `src/app/(auth)/forgot-password.tsx` → `AuthScreen mode="forgot-password"`; layouts: auth stack, root protected stack.
- `/` — `src/app/(app)/(tabs)/index.tsx` → routines list.
- `/history` — `src/app/(app)/(tabs)/history.tsx` → workout history.
- `/settings` — `src/app/(app)/(tabs)/settings.tsx` → settings.
- `/routines/details`, `/routines/edit`, `/routines/picker`, `/routines/configure` — routine workflow stack.
- `/workout/start`, `/workout/active`, `/workout/[id]` — workout flow.

Auth routing config:

```tsx
// src/app/(auth)/_layout.tsx
import { Stack } from "expo-router/stack"
export default function AuthLayout() { return <Stack screenOptions={{ headerShown: false }} /> }
```

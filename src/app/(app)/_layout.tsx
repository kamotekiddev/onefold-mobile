import { Stack } from "expo-router/stack"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { usePalette } from "@/constants/theme"
import { useAuth } from "@/features/auth"
import { AppText, Button } from "@/components/ui"

export default function AppLayout() {
  const p = usePalette()
  const auth = useAuth()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <Stack
        screenOptions={{
          headerTintColor: p.text,
          headerStyle: { backgroundColor: p.surface },
          contentStyle: { backgroundColor: p.background },
          headerBackTitle: "Back",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="routines" options={{ headerShown: false }} />
        <Stack.Screen name="workout/start" options={{ headerShown: false }} />
        <Stack.Screen name="workout/active" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
      </Stack>
      {auth.state.status === "offline-local" ? (
        <View
          style={{
            padding: 12,
            paddingBottom: 12 + insets.bottom,
            gap: 6,
            backgroundColor: p.surface,
            borderTopWidth: 1,
            borderColor: p.border,
          }}
        >
          <AppText variant="caption">
            Working offline with this account’s local training data.
          </AppText>
          {auth.state.error ? (
            <AppText variant="caption">{auth.state.error}</AppText>
          ) : null}
          <Button
            label="Retry connection"
            variant="secondary"
            onPress={() => void auth.retry().catch(() => undefined)}
          />
        </View>
      ) : null}
    </View>
  )
}

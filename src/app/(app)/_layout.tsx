import { Stack } from "expo-router/stack"
import { View } from "react-native"

import { usePalette } from "@/constants/theme"

export default function AppLayout() {
  const p = usePalette()
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
    </View>
  )
}

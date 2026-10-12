import { router, usePathname } from "expo-router"
import { Stack } from "expo-router/stack"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui"
import { usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"

export default function AppLayout() {
  const { state } = useApp()
  const pathname = usePathname()
  const p = usePalette()
  const active = state.data?.workouts.find(
    (workout) => workout.status === "inProgress"
  )
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
        <Stack.Screen
          name="workout/start"
          options={{ title: "Ready to train" }}
        />
        <Stack.Screen name="workout/active" options={{ title: "Workout" }} />
        <Stack.Screen
          name="workout/[id]"
          options={{ title: "Workout review" }}
        />
      </Stack>
      {active && pathname !== "/workout/active" ? (
        <SafeAreaView
          edges={["bottom"]}
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            borderTopWidth: 1,
            borderColor: p.border,
            backgroundColor: p.surface,
          }}
        >
          <Button
            label={`Resume workout · ${active.routineName}`}
            onPress={() => router.push("/workout/active")}
          />
        </SafeAreaView>
      ) : null}
    </View>
  )
}

import { Stack } from "expo-router"
import { RoutineDraftProvider } from "@/features/routines"

export default function RoutinesLayout() {
  return (
    <RoutineDraftProvider>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="details" options={{ headerShown: false }} />
        <Stack.Screen name="edit" options={{ headerShown: false }} />
        <Stack.Screen name="picker" options={{ headerShown: false }} />
        <Stack.Screen
          name="configure"
          options={{ title: "Exercise settings" }}
        />
      </Stack>
    </RoutineDraftProvider>
  )
}

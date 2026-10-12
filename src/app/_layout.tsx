import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router"
import { Stack } from "expo-router/stack"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { Button, ErrorMessage, LoadingState, Screen } from "@/components/ui"
import { usePalette } from "@/constants/theme"
import { AppProvider, useApp } from "@/lib/app-provider"
import { appStore } from "@/lib/services"

void SplashScreen.preventAutoHideAsync().catch(() => undefined)
function Navigation() {
  const { state } = useApp()
  const p = usePalette()
  const scheme = useColorScheme()
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined)
  }, [])
  if (state.status !== "ready")
    return (
      <Screen title="Onefold">
        {state.status === "error" ? (
          <>
            <ErrorMessage
              message={state.error ?? "Unable to load saved data."}
            />
            <Button
              label="Retry loading"
              onPress={() => void appStore.hydrate()}
            />
          </>
        ) : (
          <LoadingState label="Loading your training space…" />
        )}
      </Screen>
    )
  return (
    <ThemeProvider
      value={{
        ...(scheme === "dark" ? DarkTheme : DefaultTheme),
        colors: {
          ...(scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
          primary: p.accent,
          background: p.background,
          card: p.surface,
          text: p.text,
          border: p.border,
        },
      }}
    >
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!state.data?.session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!state.data?.session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  )
}
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Navigation />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

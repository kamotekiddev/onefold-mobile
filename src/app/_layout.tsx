import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router"
import { Stack } from "expo-router/stack"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import { useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppRecoveryScreen } from "@/components/app-recovery-screen"
import { LoadingState, Screen } from "@/components/ui"
import { usePalette } from "@/constants/theme"
import { AuthProvider, useAuth } from "@/features/auth"
import { AppProvider, useMaybeApp } from "@/lib/app-provider"

void SplashScreen.preventAutoHideAsync().catch(() => undefined)
function Navigation() {
  const auth = useAuth()
  const app = useMaybeApp()
  const p = usePalette()
  const scheme = useColorScheme()
  const [recoveryError, setRecoveryError] = useState("")
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined)
  }, [])
  const hasSession = !!auth.state.session
  if (
    auth.state.status === "loading" ||
    (hasSession && app?.state.status !== "ready")
  ) {
    if (app?.state.status === "error")
      return (
        <AppRecoveryScreen
          title="Unable to load your training"
          description="There was a problem opening your saved data. Try loading it again to continue."
          message={app.state.error ?? "Unable to load saved data."}
          onRetry={() => void app.store.hydrate()}
        />
      )
    return (
      <Screen
        title="Onefold"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <LoadingState label="Loading your training space…" />
      </Screen>
    )
  }
  if (
    auth.state.status === "storage-error" ||
    auth.state.status === "unsupported"
  )
    return (
      <AppRecoveryScreen
        title="Unable to open Onefold"
        description="We couldn’t open your session. Review the details below to continue."
        message={auth.state.error ?? "Authentication is unavailable."}
        recoveryError={recoveryError}
        onRetry={
          auth.state.status === "storage-error"
            ? () => void auth.restore()
            : undefined
        }
        secondaryAction={
          auth.state.status === "storage-error"
            ? {
                label: "Clear saved session",
                onPress: () => {
                  setRecoveryError("")
                  void auth
                    .signOut()
                    .catch((error: unknown) =>
                      setRecoveryError(
                        error instanceof Error
                          ? error.message
                          : "Could not clear the saved session."
                      )
                    )
                },
              }
            : undefined
        }
      />
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
        <Stack.Protected guard={!hasSession}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={hasSession}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  )
}
function AccountBoundary() {
  const { accountKey, request } = useAuth()
  if (!accountKey) return <Navigation />
  return (
    <AppProvider key={accountKey} accountKey={accountKey} request={request}>
      <Navigation />
    </AppProvider>
  )
}
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AccountBoundary />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

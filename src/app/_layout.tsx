import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router"
import { Stack } from "expo-router/stack"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import { useColorScheme } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { Button, ErrorMessage, LoadingState, Screen } from "@/components/ui"
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
  )
    return (
      <Screen title="Onefold">
        {app?.state.status === "error" ? (
          <>
            <ErrorMessage
              message={app.state.error ?? "Unable to load saved data."}
            />
            <Button
              label="Retry loading"
              onPress={() => void app.store.hydrate().catch(() => undefined)}
            />
          </>
        ) : (
          <LoadingState label="Loading your training space…" />
        )}
      </Screen>
    )
  if (
    auth.state.status === "storage-error" ||
    auth.state.status === "unsupported"
  )
    return (
      <Screen title="Onefold">
        <ErrorMessage
          message={auth.state.error ?? "Authentication is unavailable."}
        />
        {recoveryError ? <ErrorMessage message={recoveryError} /> : null}
        {auth.state.status === "storage-error" ? (
          <>
            <Button label="Retry loading" onPress={() => void auth.restore()} />
            <Button
              label="Clear saved session"
              variant="secondary"
              onPress={() => {
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
              }}
            />
          </>
        ) : null}
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

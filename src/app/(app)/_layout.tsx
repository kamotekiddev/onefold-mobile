import { Stack } from "expo-router/stack"
import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppText, Button } from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useAuth } from "@/features/auth"

export default function AppLayout() {
  const p = usePalette()
  const auth = useAuth()
  const insets = useSafeAreaInsets()
  const [dismissedOfflineStatus, setDismissedOfflineStatus] = useState<
    string | null
  >(null)

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
      {auth.state.status === "offline-local" &&
      dismissedOfflineStatus !== auth.state.status ? (
        <View
          accessibilityViewIsModal={false}
          style={[
            styles.offlineNotice,
            {
              bottom: insets.bottom + 76,
              backgroundColor: p.surface,
              borderColor: p.border,
            },
          ]}
        >
          <View style={styles.offlineNoticeHeader}>
            <AppText variant="caption" style={styles.offlineNoticeCopy}>
              Working offline with this account’s local training data.
            </AppText>
            <Pressable
              accessibilityLabel="Dismiss offline notice"
              accessibilityRole="button"
              onPress={() => setDismissedOfflineStatus(auth.state.status)}
              style={({ pressed }) => [
                styles.closeAction,
                {
                  backgroundColor: pressed
                    ? p.backgroundSelected
                    : p.backgroundElement,
                },
              ]}
            >
              <AppText color={p.accent} style={styles.closeActionLabel}>
                ×
              </AppText>
            </Pressable>
          </View>
          {auth.state.error ? (
            <AppText variant="caption" color={p.textSecondary}>
              {auth.state.error}
            </AppText>
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

const styles = StyleSheet.create({
  offlineNotice: {
    alignSelf: "center",
    borderRadius: Radii.card,
    borderWidth: 1,
    elevation: 4,
    gap: 8,
    left: 12,
    maxWidth: MaxContentWidth,
    padding: 14,
    position: "absolute",
    right: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    zIndex: 10,
  },
  offlineNoticeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  offlineNoticeCopy: { flex: 1 },
  closeAction: {
    alignItems: "center",
    borderRadius: Radii.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  closeActionLabel: { fontSize: 24, lineHeight: 28 },
})

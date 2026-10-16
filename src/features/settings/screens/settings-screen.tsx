import { Host, Picker } from "@expo/ui"
import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState } from "react"

import {
  AppText,
  Button,
  Card,
  ErrorMessage,
  usePalette,
} from "@/components/ui"
import { MaxContentWidth, Radii } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import { useAuth } from "@/features/auth"

export function SettingsScreen() {
  const { state, services } = useApp()
  const auth = useAuth()
  const p = usePalette()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState("")
  const run = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await action()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your change. Please retry."
      )
    } finally {
      setBusy(false)
    }
  }
  const data = state.data
  if (!data) return null

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.root, { backgroundColor: p.background }]}
    >
      <View
        style={[
          styles.appHeader,
          { backgroundColor: p.surface, borderBottomColor: p.border },
        ]}
      >
        <View style={styles.headerContent}>
          <View accessibilityLabel="Onefold" style={styles.wordmark}>
            <AppText
              variant="caption"
              color={p.accent}
              style={styles.wordmarkText}
            >
              ONEFOLD
            </AppText>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.wordmarkDot, { backgroundColor: p.accent }]}
            />
          </View>
          <AppText variant="caption" color={p.textSecondary}>
            Your preferences
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <AppText variant="title">Settings</AppText>
          <AppText color={p.textSecondary}>
            Keep it simple. Make it yours.
          </AppText>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionCopy}>
            <AppText variant="heading">Weight units</AppText>
            <AppText color={p.textSecondary}>
              Choose how your training loads are displayed. Your saved weights
              stay the same.
            </AppText>
          </View>
          <View
            style={[
              styles.pickerSurface,
              { backgroundColor: p.background, borderColor: p.border },
            ]}
          >
            <Host
              matchContents={{ vertical: true }}
              seedColor={p.accent}
              style={styles.pickerHost}
            >
              <Picker
                selectedValue={data.preferences.weightUnit}
                enabled={!busy}
                onValueChange={(unit) =>
                  void run(() => services.preferences.setWeightUnit(unit))
                }
              >
                <Picker.Item label="Kilograms (kg)" value="kg" />
                <Picker.Item label="Pounds (lb)" value="lb" />
              </Picker>
            </Host>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionCopy}>
            <AppText variant="heading">Account</AppText>
            <AppText>{auth.state.session?.identity.email}</AppText>
            <AppText variant="caption" color={p.textSecondary}>
              Training data stays on this device and belongs to this account.
            </AppText>
          </View>
          <Button
            label="Sign out"
            variant="secondary"
            disabled={busy}
            onPress={() => void run(() => auth.signOut())}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionCopy}>
            <AppText variant="heading">Start fresh</AppText>
            <AppText color={p.textSecondary}>
              Restore example routines and remove workouts, active sessions, and
              progression.
            </AppText>
          </View>
          {confirmReset ? (
            <View
              style={[
                styles.confirmation,
                { backgroundColor: p.dangerSoft, borderColor: p.border },
              ]}
            >
              <AppText>
                Reset this account’s local training data? Units return to kg.
                You’ll stay signed in. This can’t be undone.
              </AppText>
              <Button
                label="Reset local training data"
                variant="danger"
                loading={busy}
                onPress={() =>
                  void run(async () => {
                    await services.demo.reset()
                    setConfirmReset(false)
                    setMessage("Local training data reset for this account.")
                  })
                }
              />
              <Button
                label="Keep my data"
                variant="secondary"
                disabled={busy}
                onPress={() => setConfirmReset(false)}
              />
            </View>
          ) : (
            <Button
              label="Reset local training data"
              variant="danger"
              disabled={busy}
              onPress={() => setConfirmReset(true)}
            />
          )}
        </Card>

        {error ? <ErrorMessage message={error} /> : null}
        {message ? (
          <View
            style={[styles.notice, { backgroundColor: p.accentSoft }]}
            accessibilityLiveRegion="polite"
          >
            <AppText color={p.accent}>{message}</AppText>
          </View>
        ) : null}

        {__DEV__ ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionCopy}>
              <AppText variant="heading">Development tools</AppText>
              <AppText variant="caption" color={p.textSecondary}>
                Trigger one predictable service failure to check retry states.
                Restart clears pending simulated failures.
              </AppText>
            </View>
            <Button
              label="Fail next service operation"
              variant="secondary"
              onPress={() => {
                services.demo.failNext()
                setMessage("The next mock service operation will fail once.")
              }}
            />
          </Card>
        ) : null}

        <AppText
          variant="caption"
          color={p.textSecondary}
          style={styles.footnote}
        >
          Onefold · Training data is stored on this device
        </AppText>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appHeader: { borderBottomWidth: 1 },
  headerContent: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    height: 48,
    justifyContent: "space-between",
    maxWidth: MaxContentWidth,
    paddingHorizontal: 16,
    width: "100%",
  },
  wordmark: { alignItems: "center", flexDirection: "row", gap: 8 },
  wordmarkText: { fontWeight: "800", letterSpacing: 2 },
  wordmarkDot: { borderRadius: 2, height: 4, width: 4 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    gap: 16,
    maxWidth: MaxContentWidth,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: "100%",
  },
  heading: { gap: 4 },
  sectionCard: { gap: 16, padding: 16 },
  sectionCopy: { gap: 4 },
  pickerSurface: {
    borderRadius: Radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 8,
  },
  pickerHost: { minHeight: 48 },
  confirmation: {
    borderRadius: Radii.control,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  notice: { borderRadius: Radii.control, padding: 12 },
  footnote: { paddingTop: 4 },
})

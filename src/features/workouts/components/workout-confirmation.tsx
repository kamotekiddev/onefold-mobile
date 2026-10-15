import { Modal, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AppText, ErrorMessage } from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"

import { WorkoutAction } from "./workout-action"

export function WorkoutConfirmation({
  kind,
  remaining,
  busy,
  disabled,
  error,
  onConfirm,
  onCancel,
}: {
  kind: "finish" | "abandon" | null
  remaining: number
  busy: boolean
  disabled: boolean
  error: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const p = usePalette()
  return (
    <Modal
      transparent
      visible={kind !== null}
      onRequestClose={() => {
        if (!busy) onCancel()
      }}
    >
      <View style={styles.root}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: p.text, opacity: 0.35 },
          ]}
        />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View
              accessibilityViewIsModal
              style={[
                styles.panel,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <AppText variant="heading">
                {kind === "abandon"
                  ? "Abandon this workout?"
                  : "Finish with uncompleted sets?"}
              </AppText>
              <AppText color={p.textSecondary}>
                {kind === "abandon"
                  ? "This session will not appear in history or change your next targets."
                  : `${remaining} prescribed ${remaining === 1 ? "set is" : "sets are"} skipped or unfinished. They will remain uncompleted and prevent progression for those exercises.`}
              </AppText>
              {!!error && <ErrorMessage message={error} />}
              <WorkoutAction
                label={kind === "abandon" ? "Abandon workout" : "Finish anyway"}
                variant={kind === "abandon" ? "danger" : "primary"}
                loading={busy}
                disabled={disabled}
                onPress={onConfirm}
              />
              <WorkoutAction
                label="Keep training"
                variant="secondary"
                disabled={busy}
                onPress={onCancel}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  panel: {
    alignSelf: "center",
    width: "100%",
    maxWidth: MaxContentWidth,
    padding: 20,
    gap: 16,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
})

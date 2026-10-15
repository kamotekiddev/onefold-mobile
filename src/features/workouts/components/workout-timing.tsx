import { useEffect, useRef } from "react"
import { Modal, StyleSheet, View } from "react-native"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"

import { AppText } from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import type { RestTimer } from "@/types/domain"

import { useNow } from "../hooks/use-now"
import { elapsed } from "../utils/display"
import { WorkoutAction } from "./workout-action"

export function WorkoutElapsed({ startedAt }: { startedAt: number }) {
  const now = useNow()
  const p = usePalette()
  return (
    <AppText variant="caption" color={p.textSecondary} style={styles.clock}>
      {elapsed((now - startedAt) / 1000)} elapsed
    </AppText>
  )
}

export function WorkoutRestTimer({
  timer,
  workoutId,
  busy,
  perform,
  onExpireError,
}: {
  timer: RestTimer
  workoutId: string
  busy: boolean
  perform: (action: () => Promise<unknown>) => Promise<void>
  onExpireError: (failure: unknown) => void
}) {
  const now = useNow()
  const p = usePalette()
  const { services } = useApp()
  const remaining = Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
  const expiring = useRef(false)

  useEffect(() => {
    if (remaining > 0 || expiring.current) return
    expiring.current = true
    void services.workouts
      .updateTimer(workoutId, { type: "expire" })
      .catch(onExpireError)
      .finally(() => {
        expiring.current = false
      })
  }, [onExpireError, remaining, services, workoutId])

  const skipRest = () =>
    void perform(() =>
      services.workouts.updateTimer(workoutId, { type: "clear" })
    )

  return (
    <Modal
      visible={remaining > 0}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      backdropColor={p.background}
      onRequestClose={skipRest}
    >
      <SafeAreaProvider>
        <SafeAreaView
          edges={["top", "right", "bottom", "left"]}
          style={[styles.timer, { backgroundColor: p.background }]}
        >
          <View style={styles.content}>
            <View style={styles.topLine}>
              <View
                style={[styles.statusPill, { backgroundColor: p.accentSoft }]}
              >
                <AppText
                  variant="caption"
                  color={p.accent}
                  style={styles.label}
                >
                  REST TIME
                </AppText>
              </View>
            </View>
            <View style={styles.center}>
              <AppText variant="heading" style={styles.heading}>
                Take a breather
              </AppText>
              <AppText color={p.accent} style={styles.countdown}>
                {elapsed(remaining)}
              </AppText>
              <AppText color={p.textSecondary} style={styles.helper}>
                Your next set will appear when the timer ends.
              </AppText>
            </View>
            <View style={styles.actions}>
              <View style={styles.adjustments}>
                {([-15, 15] as const).map((seconds) => (
                  <View key={seconds} style={styles.adjustment}>
                    <WorkoutAction
                      label={seconds < 0 ? "−15 sec" : "+15 sec"}
                      accessibilityLabel={
                        seconds < 0
                          ? "Reduce rest by 15 seconds"
                          : "Extend rest by 15 seconds"
                      }
                      variant="secondary"
                      disabled={busy}
                      onPress={() =>
                        void perform(() =>
                          services.workouts.updateTimer(workoutId, {
                            type: "adjust",
                            seconds,
                          })
                        )
                      }
                    />
                  </View>
                ))}
              </View>
              <WorkoutAction
                label="Skip rest"
                variant="secondary"
                disabled={busy}
                onPress={skipRest}
              />
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  )
}

const styles = StyleSheet.create({
  timer: { flex: 1 },
  content: {
    alignSelf: "center",
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: "100%",
  },
  topLine: { alignItems: "flex-start" },
  statusPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: { fontWeight: "700", letterSpacing: 1 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", gap: 16 },
  heading: { textAlign: "center" },
  countdown: {
    fontSize: 80,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    lineHeight: 96,
    textAlign: "center",
  },
  helper: { maxWidth: 280, textAlign: "center" },
  actions: { gap: 12 },
  adjustments: { flexDirection: "row", gap: 12 },
  adjustment: { flex: 1 },
  clock: { fontVariant: ["tabular-nums"] },
})

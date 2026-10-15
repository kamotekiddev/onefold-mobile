import { StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui"
import { Radii, usePalette } from "@/constants/theme"
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
}: {
  timer: RestTimer
  workoutId: string
  busy: boolean
  perform: (action: () => Promise<unknown>) => Promise<void>
}) {
  const now = useNow()
  const p = usePalette()
  const { services } = useApp()
  const remaining = Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
  return (
    <View style={[styles.timer, { backgroundColor: p.accentSoft }]}>
      <View style={styles.heading}>
        <AppText variant="caption" color={p.accent} style={styles.label}>
          {remaining > 0 ? "Rest between sets" : "Ready for your next set"}
        </AppText>
        <AppText variant="heading" color={p.accent} style={styles.clock}>
          {elapsed(remaining)}
        </AppText>
      </View>
      <View style={styles.actions}>
        {([-15, 15] as const).map((seconds) => (
          <View key={seconds} style={styles.action}>
            <WorkoutAction
              label={seconds < 0 ? "−15 sec" : "+15 sec"}
              accessibilityLabel={
                seconds < 0
                  ? "Reduce rest by 15 seconds"
                  : "Extend rest by 15 seconds"
              }
              variant="secondary"
              disabled={busy || (seconds < 0 && remaining === 0)}
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
        <View style={styles.action}>
          <WorkoutAction
            label={remaining > 0 ? "Skip rest" : "Dismiss"}
            variant="secondary"
            disabled={busy}
            onPress={() =>
              void perform(() =>
                services.workouts.updateTimer(workoutId, { type: "clear" })
              )
            }
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  timer: { borderRadius: Radii.card, padding: 12, gap: 8 },
  heading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: { fontWeight: "600" },
  clock: { fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: { flex: 1, minWidth: 80 },
})

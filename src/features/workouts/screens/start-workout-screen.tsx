import { router } from "expo-router"
import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  AppText,
  Button,
  EmptyState,
  ErrorMessage,
  Field,
  Screen,
} from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import { displayWeight, errorText, inputWeight } from "../utils/display"

export function StartWorkoutScreen({ routineId }: { routineId: string }) {
  const { state, services } = useApp()
  const p = usePalette()
  const [overrides, setOverrides] = useState<
    Record<string, { reps?: string; weight?: string }>
  >({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [abandonConfirm, setAbandonConfirm] = useState(false)
  const [requestId] = useState(
    () => `start-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  const data = state.data
  const routine = data?.routines.find((item) => item.id === routineId)
  const active = data?.workouts.find((item) => item.status === "inProgress")
  if (!data || !routine)
    return (
      <Screen
        title="Start workout"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <EmptyState
          title="Routine unavailable"
          message="Return to routines and choose an existing routine."
          action={
            <Button label="View routines" onPress={() => router.replace("/")} />
          }
        />
      </Screen>
    )
  const unit = data.preferences.weightUnit
  const begin = async () => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const targets = routine.entries.map((entry) => {
        const draft = overrides[entry.id]
        if (
          draft?.reps !== undefined &&
          (!draft.reps.trim() ||
            !Number.isInteger(Number(draft.reps)) ||
            Number(draft.reps) < entry.repMin ||
            Number(draft.reps) > entry.repMax)
        )
          throw new Error(
            `Reps must be a whole number between ${entry.repMin} and ${entry.repMax}.`
          )
        if (
          draft?.weight !== undefined &&
          (!draft.weight.trim() ||
            !Number.isFinite(Number(draft.weight)) ||
            Number(draft.weight) < 0)
        )
          throw new Error("Weight must be zero or more.")
        return {
          entryId: entry.id,
          ...(draft?.reps !== undefined ? { reps: Number(draft.reps) } : {}),
          ...(draft?.weight !== undefined
            ? { weight: inputWeight(draft.weight, unit) }
            : {}),
        }
      })
      await services.workouts.start(routine.id, {
        requestId,
        overrides: targets,
      })
      router.replace("/workout/active")
    } catch (failure) {
      setError(errorText(failure))
    } finally {
      setBusy(false)
    }
  }
  return (
    <View style={[styles.root, { backgroundColor: p.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <SafeAreaView
          edges={
            active
              ? ["top", "left", "right", "bottom"]
              : ["top", "left", "right"]
          }
          style={styles.root}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              accessibilityLabel={`Back to ${routine.name}`}
              accessibilityRole="button"
              onPress={() =>
                router.replace({
                  pathname: "/routines/details",
                  params: { id: routine.id },
                })
              }
              style={styles.backAction}
            >
              <AppText
                variant="caption"
                color={p.accent}
                style={styles.backLabel}
              >
                ‹ {routine.name}
              </AppText>
            </Pressable>

            <View style={styles.header}>
              <AppText variant="title">Ready to train</AppText>
              <AppText color={p.textSecondary}>{routine.name}</AppText>
            </View>

            {!!error && <ErrorMessage message={error} />}
            {active ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: p.surface, borderColor: p.border },
                ]}
              >
                <AppText variant="heading">
                  You already have a workout in progress
                </AppText>
                <AppText color={p.textSecondary}>{active.routineName}</AppText>
                <Button
                  label="Resume workout"
                  onPress={() => router.replace("/workout/active")}
                />
                {abandonConfirm ? (
                  <>
                    <AppText color={p.textSecondary}>
                      Abandoning discards this session from history. Your
                      routine stays saved.
                    </AppText>
                    <Button
                      label="Confirm abandon"
                      variant="danger"
                      loading={busy}
                      onPress={async () => {
                        setBusy(true)
                        try {
                          await services.workouts.abandon(active.id)
                          setAbandonConfirm(false)
                        } catch (failure) {
                          setError(errorText(failure))
                        } finally {
                          setBusy(false)
                        }
                      }}
                    />
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={() => setAbandonConfirm(false)}
                    />
                  </>
                ) : (
                  <Button
                    label="Abandon existing workout"
                    variant="danger"
                    onPress={() => setAbandonConfirm(true)}
                  />
                )}
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.guidance,
                    { backgroundColor: p.backgroundElement },
                  ]}
                >
                  <AppText variant="caption" color={p.textSecondary}>
                    Review your targets. Changes apply only to this session;
                    suggestions are provisional.
                  </AppText>
                </View>
                <View style={styles.exerciseList}>
                  {routine.entries
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((entry, index) => {
                      const exercise = data.exercises.find(
                        (item) => item.id === entry.exerciseId
                      )
                      const target = data.futureTargets.find(
                        (item) =>
                          item.routineId === routine.id &&
                          item.entryId === entry.id &&
                          item.prescriptionRevision ===
                            entry.prescriptionRevision
                      )
                      const draft = overrides[entry.id]
                      const setDraft = (patch: {
                        reps?: string
                        weight?: string
                      }) =>
                        setOverrides((current) => ({
                          ...current,
                          [entry.id]: {
                            ...current[entry.id],
                            ...patch,
                          },
                        }))
                      return (
                        <View
                          key={entry.id}
                          style={[
                            styles.card,
                            {
                              backgroundColor: p.surface,
                              borderColor: p.border,
                            },
                          ]}
                        >
                          <View style={styles.exerciseHeader}>
                            <View
                              style={[
                                styles.exerciseNumber,
                                { backgroundColor: p.backgroundElement },
                              ]}
                            >
                              <AppText
                                variant="caption"
                                color={p.accent}
                                style={styles.exerciseNumberLabel}
                              >
                                {index + 1}
                              </AppText>
                            </View>
                            <View style={styles.exerciseCopy}>
                              <AppText variant="heading">
                                {exercise?.name ?? "Exercise"}
                              </AppText>
                              <AppText
                                variant="caption"
                                color={p.textSecondary}
                              >
                                {entry.setCount} sets · {entry.repMin}–
                                {entry.repMax} reps · {entry.restSeconds}s rest
                              </AppText>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.suggestion,
                              { backgroundColor: p.backgroundElement },
                            ]}
                          >
                            <AppText variant="caption" color={p.textSecondary}>
                              {target?.reason ??
                                "Starting with your routine targets."}
                            </AppText>
                          </View>
                          <View style={styles.targetFields}>
                            <View style={styles.targetField}>
                              <Field
                                label="Target reps"
                                keyboardType="number-pad"
                                value={
                                  draft?.reps ??
                                  String(target?.reps ?? entry.repMin)
                                }
                                onChangeText={(reps) => setDraft({ reps })}
                              />
                            </View>
                            {exercise?.trackingType !== "bodyweight" && (
                              <View style={styles.targetField}>
                                <Field
                                  label={
                                    exercise?.trackingType ===
                                    "bodyweightAddedWeight"
                                      ? "Added weight"
                                      : "Target weight"
                                  }
                                  keyboardType="decimal-pad"
                                  suffix={unit}
                                  value={
                                    draft?.weight ??
                                    displayWeight(
                                      target?.weight ??
                                        entry.startingWeight ??
                                        0,
                                      unit
                                    )
                                  }
                                  onChangeText={(weight) =>
                                    setDraft({ weight })
                                  }
                                />
                              </View>
                            )}
                          </View>
                        </View>
                      )
                    })}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>

        {!active && (
          <SafeAreaView
            edges={["bottom"]}
            style={[
              styles.startBar,
              { backgroundColor: p.surface, borderTopColor: p.border },
            ]}
          >
            <View style={styles.startBarContent}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: busy }}
                disabled={busy}
                onPress={() => void begin()}
                style={({ pressed }) => [
                  styles.startAction,
                  {
                    backgroundColor: p.accent,
                    opacity: pressed || busy ? 0.72 : 1,
                  },
                ]}
              >
                <AppText color={p.accentText} style={styles.startActionLabel}>
                  {busy ? "Start workout…" : "Start workout"}
                </AppText>
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    alignSelf: "center",
    gap: 20,
    maxWidth: MaxContentWidth,
    padding: 20,
    paddingBottom: 32,
    width: "100%",
  },
  backAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 48,
  },
  backLabel: { fontWeight: "600" },
  header: { gap: 4 },
  guidance: { borderRadius: Radii.control, padding: 12 },
  exerciseList: { gap: 16 },
  card: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  exerciseHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  exerciseNumber: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  exerciseNumberLabel: { fontWeight: "700" },
  exerciseCopy: { flex: 1, gap: 4, minWidth: 0 },
  suggestion: { borderRadius: Radii.control, padding: 12 },
  targetFields: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  targetField: { flex: 1, minWidth: 140 },
  startBar: { borderTopWidth: 1 },
  startBarContent: {
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "100%",
  },
  startAction: {
    alignItems: "center",
    borderRadius: Radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  startActionLabel: { fontWeight: "600" },
})

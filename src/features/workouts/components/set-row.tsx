import { memo, useState } from "react"
import { StyleSheet, View } from "react-native"

import { AppText, ErrorMessage } from "@/components/ui"
import { Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import type {
  SetUpdate,
  WeightUnit,
  Workout,
  WorkoutEntry,
  WorkoutSet,
} from "@/types/domain"
import {
  draftKey,
  readDraft,
  useWorkoutDrafts,
  writeDraft,
} from "../hooks/use-drafts"
import { displayWeight, errorText, inputWeight } from "../utils/display"

import { WorkoutAction } from "./workout-action"
import { WorkoutNumberField } from "./workout-number-field"

interface Props {
  workoutId: string
  entry: WorkoutEntry
  set: WorkoutSet
  unit: WeightUnit
  onSetFinished: (updated: Workout, entryId: string, setId: string) => void
}
export const SetRow = memo(function SetRow({
  workoutId,
  entry,
  set,
  unit,
  onSetFinished,
}: Props) {
  const { services } = useApp()
  const p = usePalette()
  const drafts = useWorkoutDrafts()
  const key = draftKey(workoutId, set.id)
  const draft = drafts[key]
  const reps = draft?.reps ?? set.repsInput
  const rawWeight = draft?.weight ?? set.weightInput
  const weight =
    draft &&
    draft.unit !== unit &&
    rawWeight.trim() &&
    Number.isFinite(Number(rawWeight))
      ? displayWeight(inputWeight(rawWeight, draft.unit), unit)
      : rawWeight
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const weighted = entry.exercise.trackingType !== "bodyweight"
  const previous = entry.previous[set.index]
  const actualReps =
    reps.trim() !== "" && Number.isInteger(Number(reps)) && Number(reps) > 0
      ? Number(reps)
      : null
  const actualWeight =
    weight.trim() !== "" &&
    Number.isFinite(Number(weight)) &&
    Number(weight) >= 0
      ? inputWeight(weight, unit)
      : null
  const update = async (patch: SetUpdate) => {
    const version = (readDraft(key)?.version ?? 0) + 1
    const next = {
      reps: patch.repsInput ?? reps,
      weight: patch.weightInput ?? weight,
      unit,
      pending: true,
      error: "",
      version,
    }
    writeDraft(key, next)
    try {
      const updated = await services.workouts.updateSet(
        workoutId,
        entry.id,
        set.id,
        patch
      )
      if (readDraft(key)?.version === version) {
        writeDraft(key, { ...next, pending: false })
        setError("")
        return updated
      }
    } catch (failure) {
      if (readDraft(key)?.version === version)
        writeDraft(key, {
          ...next,
          pending: false,
          error: `Not saved: ${errorText(failure)}`,
        })
    }
    return null
  }
  const changeStatus = async (status: "pending" | "completed") => {
    if (busy) return
    if (
      status === "completed" &&
      (actualReps === null || (weighted && actualWeight === null))
    ) {
      setError(
        weighted
          ? "Enter positive whole-number reps and a weight of zero or more."
          : "Enter a positive whole number of reps."
      )
      return
    }
    setBusy(true)
    const updated = await update({
      status,
      repsInput: reps,
      weightInput: weight,
      actualReps,
      actualWeight: weighted ? actualWeight : null,
    })
    setBusy(false)
    if (updated && status === "completed")
      onSetFinished(updated, entry.id, set.id)
  }
  const setLabel =
    set.kind === "extra" ? `Extra set ${set.index + 1}` : `Set ${set.index + 1}`
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: p.surface,
          borderColor: set.status === "completed" ? p.accent : p.border,
        },
      ]}
    >
      <View style={styles.heading}>
        <AppText variant="caption" style={styles.setLabel}>
          {setLabel}
        </AppText>
        <View
          style={[
            styles.status,
            {
              backgroundColor:
                set.status === "completed" ? p.accentSoft : p.backgroundElement,
            },
          ]}
        >
          <AppText
            variant="caption"
            color={set.status === "completed" ? p.accent : p.textSecondary}
            style={styles.statusLabel}
          >
            {set.status === "completed" ? "✓ Complete" : "To do"}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color={p.textSecondary}>
        Target {set.plannedReps} reps
        {weighted ? ` × ${displayWeight(set.plannedWeight, unit)} ${unit}` : ""}
      </AppText>
      {previous && (
        <AppText variant="caption" color={p.textSecondary}>
          Previous: {previous.reps ?? "—"} reps
          {weighted ? ` × ${displayWeight(previous.weight, unit)} ${unit}` : ""}
        </AppText>
      )}
      <View style={styles.inputs}>
        <View style={styles.input}>
          <WorkoutNumberField
            label="Actual reps"
            accessibilityLabel={`${entry.exercise.name}, ${setLabel}, actual reps`}
            value={reps}
            keyboardType="number-pad"
            onChangeText={(value) => {
              const n = Number(value)
              void update({
                repsInput: value,
                actualReps:
                  value.trim() && Number.isInteger(n) && n > 0 ? n : null,
                ...(set.status === "completed"
                  ? { status: "pending" as const }
                  : {}),
              })
            }}
          />
        </View>
        {weighted && (
          <View style={styles.input}>
            <WorkoutNumberField
              label={
                entry.exercise.trackingType === "bodyweightAddedWeight"
                  ? "Added weight"
                  : "Actual weight"
              }
              accessibilityLabel={`${entry.exercise.name}, ${setLabel}, ${entry.exercise.trackingType === "bodyweightAddedWeight" ? "added" : "actual"} weight in ${unit}`}
              suffix={unit}
              value={weight}
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                const n = Number(value)
                void update({
                  weightInput: value,
                  actualWeight:
                    value.trim() && Number.isFinite(n) && n >= 0
                      ? inputWeight(value, unit)
                      : null,
                  ...(set.status === "completed"
                    ? { status: "pending" as const }
                    : {}),
                })
              }}
            />
          </View>
        )}
      </View>
      {!!(error || draft?.error) && (
        <>
          <ErrorMessage message={error || draft?.error || ""} />
          <WorkoutAction
            label="Retry saving inputs"
            variant="secondary"
            onPress={() =>
              void update({
                repsInput: reps,
                weightInput: weight,
                actualReps,
                actualWeight: weighted ? actualWeight : null,
                status: "pending",
              })
            }
          />
        </>
      )}
      <View style={styles.actions}>
        <View style={styles.input}>
          <WorkoutAction
            label={
              set.status === "completed" ? "Undo completion" : "Complete set"
            }
            accessibilityLabel={`${set.status === "completed" ? "Undo completion" : "Complete"}, ${entry.exercise.name}, ${setLabel}`}
            loading={busy}
            onPress={() =>
              void changeStatus(
                set.status === "completed" ? "pending" : "completed"
              )
            }
            variant={set.status === "completed" ? "secondary" : "primary"}
          />
        </View>
      </View>
    </View>
  )
})
const styles = StyleSheet.create({
  card: { borderRadius: Radii.card, borderWidth: 1, padding: 16, gap: 10 },
  heading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  setLabel: { fontSize: 14, fontWeight: "700" },
  status: {
    borderRadius: Radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusLabel: { fontWeight: "600" },
  inputs: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  input: { flex: 1, minWidth: 110 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
})

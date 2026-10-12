import { router } from "expo-router"
import { useState } from "react"

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Field,
  Screen,
} from "@/components/ui"
import { useApp } from "@/lib/app-provider"
import { displayWeight, errorText, inputWeight } from "../utils/display"

export function StartWorkoutScreen({ routineId }: { routineId: string }) {
  const { state, services } = useApp()
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
      <Screen title="Start workout">
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
    <Screen title="Ready to train" subtitle={routine.name}>
      {!!error && <ErrorMessage message={error} />}
      {active ? (
        <Card>
          <AppText variant="heading">
            You already have a workout in progress
          </AppText>
          <AppText>{active.routineName}</AppText>
          <Button
            label="Resume workout"
            onPress={() => router.replace("/workout/active")}
          />
          {abandonConfirm ? (
            <>
              <AppText>
                Abandoning discards this session from history. Your routine
                stays saved.
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
        </Card>
      ) : (
        <>
          <AppText>
            Review your targets. Changes here apply only to this session.
            Suggestions are provisional demo calculations.
          </AppText>
          {routine.entries
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((entry) => {
              const exercise = data.exercises.find(
                (item) => item.id === entry.exerciseId
              )
              const target = data.futureTargets.find(
                (item) =>
                  item.routineId === routine.id &&
                  item.entryId === entry.id &&
                  item.prescriptionRevision === entry.prescriptionRevision
              )
              const draft = overrides[entry.id]
              const setDraft = (patch: { reps?: string; weight?: string }) =>
                setOverrides((current) => ({
                  ...current,
                  [entry.id]: {
                    ...current[entry.id],
                    ...patch,
                  },
                }))
              return (
                <Card key={entry.id}>
                  <AppText variant="heading">
                    {exercise?.name ?? "Exercise"}
                  </AppText>
                  <AppText variant="caption">
                    {entry.setCount} sets · range {entry.repMin}–{entry.repMax}{" "}
                    reps · {entry.restSeconds}s rest
                  </AppText>
                  <AppText variant="caption">
                    {target?.reason ?? "Starting with your routine targets."}
                  </AppText>
                  <Field
                    label="Target reps"
                    keyboardType="number-pad"
                    value={draft?.reps ?? String(target?.reps ?? entry.repMin)}
                    onChangeText={(reps) => setDraft({ reps })}
                  />
                  {exercise?.trackingType !== "bodyweight" && (
                    <Field
                      label={
                        exercise?.trackingType === "bodyweightAddedWeight"
                          ? "Added weight"
                          : "Target weight"
                      }
                      keyboardType="decimal-pad"
                      suffix={unit}
                      value={
                        draft?.weight ??
                        displayWeight(
                          target?.weight ?? entry.startingWeight ?? 0,
                          unit
                        )
                      }
                      onChangeText={(weight) => setDraft({ weight })}
                    />
                  )}
                </Card>
              )
            })}
          <Button
            label="Start workout"
            loading={busy}
            onPress={() => void begin()}
          />
        </>
      )}
    </Screen>
  )
}

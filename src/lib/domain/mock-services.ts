import type { AuthenticatedRequest, DataStore, Services } from "../services"
import { createTemplateCreator } from "./create-template"
import { createExerciseCreator } from "./create-exercise"
import type {
  AppData,
  Routine,
  RoutineEntry,
  Workout,
  WorkoutEntry,
  WorkoutSet,
} from "../../types/domain"
import { makeSeed } from "./seed"
import { createRemoteRoutineLoader } from "./routine-templates"
import { suggestProgression } from "./progression"
import {
  isNonnegative,
  isBackendId,
  isPositiveInteger,
  ServiceError,
  validateRoutine,
} from "./validation"

let sequence = 0
export const newId = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 9)}`
const required = <T>(value: T | undefined, label: string): T => {
  if (!value) throw new ServiceError("NOT_FOUND", `${label} was not found.`)
  return value
}
const prescriptionKey = (entry: RoutineEntry) =>
  JSON.stringify([
    entry.exerciseId,
    entry.setCount,
    entry.repMin,
    entry.repMax,
    entry.startingWeight,
    entry.restSeconds,
    entry.progressionMode,
    entry.weightIncrement,
    entry.repIncrement,
  ])
const active = (data: AppData, id: string) => {
  const workout = required(
    data.workouts.find((item) => item.id === id),
    "Workout"
  )
  if (workout.status !== "inProgress")
    throw new ServiceError("WORKOUT_CLOSED", "This workout has already ended.")
  return workout
}
const plannedSet = (
  reps: number,
  weight: number | undefined,
  index: number,
  kind: WorkoutSet["kind"] = "prescribed"
): WorkoutSet => ({
  id: newId("set"),
  kind,
  index,
  plannedReps: reps,
  plannedWeight: weight,
  actualReps: null,
  actualWeight: null,
  repsInput: "",
  weightInput: "",
  status: "pending",
})

export function createServices(
  store: DataStore,
  options: {
    delayMs?: number
    now?: () => number
    request?: AuthenticatedRequest
  } = {}
): Services {
  const now = options.now ?? Date.now
  let failOperation: string | null = null
  let routineRevision = 0
  const remoteRoutines = options.request
    ? createRemoteRoutineLoader(
        store,
        options.request,
        now,
        () => routineRevision
      )
    : null
  const createRemoteExercise = options.request
    ? createExerciseCreator(store, options.request)
    : null
  const createRemoteTemplate = options.request
    ? createTemplateCreator(store, options.request, now)
    : null
  async function before(operation: string) {
    if ((options.delayMs ?? (options.request ? 0 : 180)) > 0)
      await new Promise((resolve) =>
        setTimeout(resolve, options.delayMs ?? (options.request ? 0 : 180))
      )
    if (failOperation === "*" || failOperation === operation) {
      failOperation = null
      throw new ServiceError(
        "SIMULATED",
        `Demo ${operation} failed. Please try again.`
      )
    }
  }
  const services: Services = {
    exercises: {
      async create(input) {
        if (createRemoteExercise) return createRemoteExercise(input)
        return store.mutate((data) => {
          const exercise = {
            ...input,
            id: newId("exercise"),
            primaryMuscleGroup: "General",
            equipment: "Unknown",
          }
          data.exercises.push(exercise)
          return exercise
        })
      },
      async search(query = {}) {
        await before("exercises.search")
        return (await store.read()).exercises.filter(
          (exercise) =>
            (!options.request || isBackendId(exercise.id)) &&
            (!query.search ||
              exercise.name
                .toLowerCase()
                .includes(query.search.trim().toLowerCase())) &&
            (!query.muscleGroup ||
              exercise.primaryMuscleGroup === query.muscleGroup) &&
            (!query.equipment || exercise.equipment === query.equipment)
        )
      },
      async getById(id) {
        await before("exercises.getById")
        return required(
          (await store.read()).exercises.find((exercise) => exercise.id === id),
          "Exercise"
        )
      },
    },
    routines: {
      readOnly: !!options.request,
      async list(readOptions) {
        if (remoteRoutines) return remoteRoutines.list(readOptions)
        await before("routines.list")
        return (await store.read()).routines
      },
      async getById(id, readOptions) {
        if (remoteRoutines) return remoteRoutines.getById(id, readOptions)
        await before("routines.getById")
        return required(
          (await store.read()).routines.find((routine) => routine.id === id),
          "Routine"
        )
      },
      async create(input) {
        if (createRemoteTemplate) {
          routineRevision++
          try {
            return await createRemoteTemplate(input)
          } finally {
            routineRevision++
          }
        }
        await before("routines.create")
        return store.mutate((data) => {
          validateRoutine(input, data.exercises)
          const routine: Routine = {
            id: newId("routine"),
            name: input.name.trim(),
            entries: input.entries.map((entry, order) => ({
              ...entry,
              order,
              prescriptionRevision: 1,
            })),
            scheduledDays: input.scheduledDays ?? [],
            createdAt: now(),
            updatedAt: now(),
          }
          data.routines.push(routine)
          return routine
        })
      },
      async update(id, input, updateOptions) {
        if (remoteRoutines)
          throw new ServiceError(
            "UNSUPPORTED",
            "Editing routines is not available yet."
          )
        await before("routines.update")
        return store.mutate((data) => {
          validateRoutine(input, data.exercises)
          const routine = required(
            data.routines.find((item) => item.id === id),
            "Routine"
          )
          const changed = input.entries.filter((entry) => {
            const old = routine.entries.find((item) => item.id === entry.id)
            return old && prescriptionKey(old) !== prescriptionKey(entry)
          })
          if (changed.length && !updateOptions?.confirmTargetReset)
            throw new ServiceError(
              "TARGET_RESET_REQUIRED",
              "Changing exercise prescriptions resets their next-workout targets. Continue?"
            )
          routine.entries = input.entries.map((entry, order) => {
            const old = routine.entries.find((item) => item.id === entry.id)
            return {
              ...entry,
              order,
              prescriptionRevision: old
                ? old.prescriptionRevision +
                  (changed.some((item) => item.id === entry.id) ? 1 : 0)
                : 1,
            }
          })
          data.futureTargets = data.futureTargets.filter(
            (target) =>
              target.routineId !== id ||
              routine.entries.some(
                (entry) =>
                  entry.id === target.entryId &&
                  entry.prescriptionRevision === target.prescriptionRevision
              )
          )
          routine.name = input.name.trim()
          routine.scheduledDays = input.scheduledDays ?? []
          routine.updatedAt = now()
          return routine
        })
      },
      async duplicate(id) {
        if (remoteRoutines)
          throw new ServiceError(
            "UNSUPPORTED",
            "Duplicating routines is not available yet."
          )
        await before("routines.duplicate")
        return store.mutate((data) => {
          const original = required(
            data.routines.find((item) => item.id === id),
            "Routine"
          )
          const copy: Routine = {
            ...original,
            id: newId("routine"),
            name: `${original.name} (copy)`,
            scheduledDays: original.scheduledDays ?? [],
            entries: original.entries.map((entry) => ({
              ...entry,
              id: newId("entry"),
              prescriptionRevision: 1,
            })),
            createdAt: now(),
            updatedAt: now(),
          }
          data.routines.push(copy)
          return copy
        })
      },
      async delete(id) {
        if (remoteRoutines)
          throw new ServiceError(
            "UNSUPPORTED",
            "Deleting routines is not available yet."
          )
        await before("routines.delete")
        await store.mutate((data) => {
          required(
            data.routines.find((item) => item.id === id),
            "Routine"
          )
          data.routines = data.routines.filter((item) => item.id !== id)
          data.futureTargets = data.futureTargets.filter(
            (item) => item.routineId !== id
          )
        })
      },
    },
    workouts: {
      async start(routineId, startOptions = {}) {
        await before("workouts.start")
        return store.mutate((data) => {
          if (startOptions.requestId) {
            const previous = data.workouts.find(
              (workout) => workout.startRequestId === startOptions.requestId
            )
            if (previous) return previous
          }
          const existing = data.workouts.find(
            (workout) => workout.status === "inProgress"
          )
          if (existing)
            throw new ServiceError(
              "ACTIVE_WORKOUT_EXISTS",
              "A workout is already active. Finish it before starting another."
            )
          const routine = required(
            data.routines.find((item) => item.id === routineId),
            "Routine"
          )
          const entries: WorkoutEntry[] = [...routine.entries]
            .sort((a, b) => a.order - b.order)
            .map((prescription) => {
              const exercise = required(
                data.exercises.find(
                  (item) => item.id === prescription.exerciseId
                ),
                "Exercise"
              )
              const target = data.futureTargets.find(
                (item) =>
                  item.routineId === routineId &&
                  item.entryId === prescription.id &&
                  item.prescriptionRevision ===
                    prescription.prescriptionRevision
              )
              const override = startOptions.overrides?.find(
                (item) => item.entryId === prescription.id
              )
              const reps = override?.reps ?? target?.reps ?? prescription.repMin
              const weight =
                exercise.trackingType === "bodyweight"
                  ? undefined
                  : (override?.weight ??
                    target?.weight ??
                    prescription.startingWeight ??
                    0)
              if (
                !isPositiveInteger(reps) ||
                reps < prescription.repMin ||
                reps > prescription.repMax ||
                (weight !== undefined && !isNonnegative(weight))
              )
                throw new ServiceError(
                  "VALIDATION",
                  "Targets need reps within the prescribed range and a nonnegative weight."
                )
              const prior = data.workouts
                .filter(
                  (item) =>
                    item.routineId === routineId &&
                    item.status === "completed" &&
                    item.entries.some((entry) => entry.id === prescription.id)
                )
                .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0]
                ?.entries.find((entry) => entry.id === prescription.id)
              return {
                id: prescription.id,
                exercise: { ...exercise },
                prescription: { ...prescription },
                previous:
                  prior?.sets
                    .filter((set) => set.kind === "prescribed")
                    .map((set) => ({
                      reps: set.status === "completed" ? set.actualReps : null,
                      weight:
                        set.status === "completed" ? set.actualWeight : null,
                    })) ?? [],
                sets: Array.from(
                  { length: prescription.setCount },
                  (_, index) => plannedSet(reps, weight, index)
                ),
              }
            })
          const workout: Workout = {
            id: newId("workout"),
            startRequestId: startOptions.requestId ?? newId("start"),
            routineId,
            routineName: routine.name,
            status: "inProgress",
            startedAt: now(),
            entries,
            restTimer: null,
            suggestions: [],
          }
          data.workouts.push(workout)
          return workout
        })
      },
      async getActive() {
        await before("workouts.getActive")
        return (
          (await store.read()).workouts.find(
            (workout) => workout.status === "inProgress"
          ) ?? null
        )
      },
      async updateSet(workoutId, entryId, setId, update) {
        // Input writes enter the queue immediately, so finish cannot overtake an input save.
        if (failOperation === "*" || failOperation === "workouts.updateSet") {
          failOperation = null
          throw new ServiceError(
            "SIMULATED",
            "Demo save failed. Please try again."
          )
        }
        return store.mutate((data) => {
          const workout = active(data, workoutId)
          const entry = required(
            workout.entries.find((item) => item.id === entryId),
            "Exercise"
          )
          const set = required(
            entry.sets.find((item) => item.id === setId),
            "Set"
          )
          const wasCompleted = set.status === "completed"
          if (update.status === "skipped")
            throw new ServiceError(
              "VALIDATION",
              "Sets cannot be skipped. Complete the set to continue."
            )
          const next = { ...set, ...update }
          if (next.status === "completed") {
            if (next.actualReps === null || !isPositiveInteger(next.actualReps))
              throw new ServiceError(
                "VALIDATION",
                "Enter valid actual reps before completing this set."
              )
            if (
              entry.exercise.trackingType !== "bodyweight" &&
              (next.actualWeight === null || !isNonnegative(next.actualWeight))
            )
              throw new ServiceError(
                "VALIDATION",
                "Enter a valid actual weight before completing this set."
              )
          }
          if (entry.exercise.trackingType === "bodyweight") {
            next.actualWeight = null
            next.weightInput = ""
          }
          Object.assign(set, next)
          if (update.status === "completed" && !wasCompleted) {
            const hasRemainingSets = workout.entries.some((item) =>
              item.sets.some((itemSet) => itemSet.status !== "completed")
            )
            workout.restTimer =
              entry.prescription.restSeconds > 0 && hasRemainingSets
                ? {
                    endsAt: now() + entry.prescription.restSeconds * 1000,
                    setId,
                  }
                : null
          }
          if (update.status === "pending" && workout.restTimer?.setId === setId)
            workout.restTimer = null
          return workout
        })
      },
      async addSet(workoutId, entryId) {
        await before("workouts.addSet")
        return store.mutate((data) => {
          const workout = active(data, workoutId)
          const entry = required(
            workout.entries.find((item) => item.id === entryId),
            "Exercise"
          )
          const first = entry.sets[0]
          entry.sets.push(
            plannedSet(
              first?.plannedReps ?? entry.prescription.repMin,
              first?.plannedWeight,
              entry.sets.length,
              "extra"
            )
          )
          return workout
        })
      },
      async complete(id) {
        await before("workouts.complete")
        return store.mutate((data) => {
          const workout = required(
            data.workouts.find((item) => item.id === id),
            "Workout"
          )
          if (workout.status === "completed") return workout
          if (workout.status === "abandoned")
            throw new ServiceError(
              "WORKOUT_CLOSED",
              "An abandoned workout cannot be completed."
            )
          if (
            workout.entries.some((entry) =>
              entry.sets.some((set) => set.status !== "completed")
            )
          )
            throw new ServiceError(
              "VALIDATION",
              "Complete every set before finishing this workout."
            )
          workout.status = "completed"
          workout.finishedAt = now()
          workout.restTimer = null
          workout.suggestions = workout.entries.map(suggestProgression)
          for (const suggestion of workout.suggestions) {
            const entry = data.routines
              .find((item) => item.id === workout.routineId)
              ?.entries.find((item) => item.id === suggestion.entryId)
            if (entry?.prescriptionRevision !== suggestion.prescriptionRevision)
              continue
            data.futureTargets = data.futureTargets.filter(
              (target) =>
                target.routineId !== workout.routineId ||
                target.entryId !== suggestion.entryId
            )
            data.futureTargets.push({
              ...suggestion,
              routineId: workout.routineId,
              sourceWorkoutId: workout.id,
            })
          }
          return workout
        })
      },
      async abandon(id) {
        await before("workouts.abandon")
        await store.mutate((data) => {
          const workout = active(data, id)
          workout.status = "abandoned"
          workout.finishedAt = now()
          workout.restTimer = null
        })
      },
      async listHistory() {
        await before("workouts.listHistory")
        return (await store.read()).workouts
          .filter((workout) => workout.status === "completed")
          .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
      },
      async getById(id) {
        await before("workouts.getById")
        return required(
          (await store.read()).workouts.find((workout) => workout.id === id),
          "Workout"
        )
      },
      async updateTimer(id, action) {
        await before("workouts.updateTimer")
        return store.mutate((data) => {
          const workout = active(data, id)
          if (
            action.type === "clear" ||
            (action.type === "expire" &&
              workout.restTimer &&
              workout.restTimer.endsAt <= now())
          )
            workout.restTimer = null
          else if (action.type === "adjust" && workout.restTimer)
            workout.restTimer.endsAt = Math.max(
              now(),
              workout.restTimer.endsAt + action.seconds * 1000
            )
          return workout
        })
      },
    },
    preferences: {
      async setWeightUnit(unit) {
        await before("preferences.setWeightUnit")
        await store.mutate((data) => {
          if (unit !== "kg" && unit !== "lb")
            throw new ServiceError("VALIDATION", "Choose kg or lb.")
          if (unit === data.preferences.weightUnit) return
          for (const workout of data.workouts.filter(
            (item) => item.status === "inProgress"
          ))
            for (const entry of workout.entries)
              for (const set of entry.sets) {
                if (set.actualWeight !== null)
                  set.weightInput = String(
                    Math.round(
                      set.actualWeight *
                        (unit === "lb" ? 2.2046226218 : 1) *
                        100
                    ) / 100
                  )
                else set.weightInput = ""
              }
          data.preferences.weightUnit = unit
        })
      },
    },
    demo: {
      async reset() {
        routineRevision++
        await before("demo.reset")
        await store.mutate((data) => {
          Object.assign(
            data,
            makeSeed(now(), { includeDefaultRoutine: !options.request })
          )
        })
      },
      failNext(operation = "*") {
        failOperation = operation
      },
    },
  }
  return services
}

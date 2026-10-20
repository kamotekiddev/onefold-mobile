import type { AuthenticatedRequest, DataStore } from "../services"
import type {
  Exercise,
  Routine,
  RoutineEntry,
  Weekday,
} from "../../types/domain"
import { ServiceError } from "./validation"

import { ApiError, throwIfCancelled } from "../api-client"

type JsonObject = Record<string, unknown>

const object = (value: unknown, label: string): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ServiceError("INVALID_RESPONSE", `Invalid ${label} response.`)
  return value as JsonObject
}

const value = (source: JsonObject, ...keys: string[]) =>
  keys.map((key) => source[key]).find((item) => item !== undefined)

const stringValue = (source: JsonObject, label: string, ...keys: string[]) => {
  const item = value(source, ...keys)
  if (typeof item !== "string" || !item.trim())
    throw new ServiceError("INVALID_RESPONSE", `Invalid ${label}.`)
  return item
}

const numberValue = (
  source: JsonObject,
  label: string,
  fallback: number,
  ...keys: string[]
) => {
  const item = value(source, ...keys)
  return typeof item === "number" && Number.isFinite(item) ? item : fallback
}

const arrayValue = (source: JsonObject, ...keys: string[]) => {
  const item = value(source, ...keys)
  return Array.isArray(item) ? item : []
}

function weekday(value: unknown): Weekday | null {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  )
    return value as Weekday
  if (typeof value === "string") {
    const days: Record<string, Weekday> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    }
    return days[value.toLowerCase()] ?? null
  }
  return null
}

function scheduledDays(source: JsonObject): Weekday[] {
  return [
    ...new Set(
      arrayValue(source, "scheduledDays", "ScheduledDays")
        .map(weekday)
        .filter((day): day is Weekday => day !== null)
    ),
  ]
}

function pounds(value: unknown) {
  return (
    (typeof value === "string" && value.toLowerCase().includes("pound")) ||
    value === 1
  )
}

export function mapTemplate(
  summary: JsonObject,
  detail: JsonObject,
  now: number,
  knownExercises: Exercise[] = []
): { routine: Routine; exercises: Exercise[] } {
  const templateId = stringValue(summary, "template id", "id", "Id")
  const name = stringValue(detail, "template name", "name", "Name")
  const restInMinutes = numberValue(
    detail,
    "template rest",
    2,
    "restInMinutes",
    "RestInMinutes"
  )
  const entries: RoutineEntry[] = []
  const exercises: Exercise[] = []

  for (const raw of arrayValue(
    detail,
    "workoutExercises",
    "WorkoutExercises"
  )) {
    const item = object(raw, "template exercise")
    const exerciseId = stringValue(
      item,
      "exercise id",
      "exerciseId",
      "ExerciseId"
    )
    const entryId = stringValue(item, "template exercise id", "id", "Id")
    const sets = Math.max(
      1,
      Math.round(numberValue(item, "set count", 1, "sets", "Sets"))
    )
    const reps = Math.max(
      1,
      Math.round(numberValue(item, "target reps", 1, "reps", "Reps"))
    )
    const restSeconds = Math.max(
      0,
      numberValue(
        item,
        "rest seconds",
        Math.max(0, restInMinutes * 60),
        "restInSeconds",
        "RestInSeconds"
      )
    )
    const increment = value(item, "weightIncrement", "WeightIncrement")
    const incrementNumber =
      typeof increment === "number" && Number.isFinite(increment)
        ? increment
        : undefined
    const weightIncrement = incrementNumber
      ? pounds(value(item, "weightUnit", "WeightUnit"))
        ? incrementNumber * 0.45359237
        : incrementNumber
      : undefined
    const exerciseName = stringValue(
      item,
      "exercise name",
      "exerciseName",
      "ExerciseName"
    )

    exercises.push({
      id: exerciseId,
      name: exerciseName,
      primaryMuscleGroup: "General",
      equipment: "Unknown",
      trackingType:
        knownExercises.find((exercise) => exercise.id === exerciseId)
          ?.trackingType ?? "weighted",
    })
    entries.push({
      id: entryId,
      exerciseId,
      order: Math.max(
        0,
        Math.round(
          numberValue(
            item,
            "sort index",
            entries.length,
            "sortIndex",
            "SortIndex"
          )
        )
      ),
      setCount: sets,
      repMin: reps,
      repMax: reps,
      restSeconds,
      progressionMode: weightIncrement ? "weight" : "manual",
      weightIncrement,
      prescriptionRevision: 1,
    })
  }

  return {
    routine: {
      id: templateId,
      name,
      entries: entries.sort((a, b) => a.order - b.order),
      scheduledDays: scheduledDays(detail).length
        ? scheduledDays(detail)
        : scheduledDays(summary),
      createdAt: now,
      updatedAt: now,
    },
    exercises,
  }
}

// Summaries lack prescriptions, so the collection still needs details. Limit fanout
// on mobile connections; Query owns sharing and freshness above this adapter.
export function createRemoteRoutineLoader(
  store: DataStore,
  request: AuthenticatedRequest,
  now: () => number = Date.now,
  readRevision: () => number = () => 0
) {
  const load = async (
    options: { signal?: AbortSignal } = {}
  ): Promise<Routine[]> => {
    const revision = readRevision()
    const check = () => {
      throwIfCancelled(options.signal)
      if (revision !== readRevision())
        throw new ApiError("cancelled", "Routine data changed during refresh.")
    }
    check()
    const current = await store.read()
    const rawSummaries = await request("/api/workout/Template", options)
    check()
    if (!Array.isArray(rawSummaries))
      throw new ServiceError("INVALID_RESPONSE", "Invalid templates response.")
    const summaries = rawSummaries.map((item) => object(item, "template"))
    const mapped: ReturnType<typeof mapTemplate>[] = []
    let index = 0
    await Promise.all(
      Array.from({ length: Math.min(4, summaries.length) }, async () => {
        while (index < summaries.length) {
          check()
          const position = index++
          const summary = summaries[position]
          const id = stringValue(summary, "template id", "id", "Id")
          const rawDetail = await request(
            `/api/workout/Template/${encodeURIComponent(id)}`,
            options
          )
          check()
          mapped[position] = mapTemplate(
            summary,
            object(rawDetail, "template detail"),
            now(),
            current.exercises
          )
        }
      })
    )
    check()
    const routines = mapped.map((item) => item.routine)
    await store.mutate((data) => {
      check()
      data.routines = routines
      // Prefer the latest local tracking type if an exercise was created during this read.
      const exercises = mapped
        .flatMap((item) => item.exercises)
        .map((exercise) => ({
          ...exercise,
          trackingType:
            data.exercises.find((item) => item.id === exercise.id)
              ?.trackingType ?? exercise.trackingType,
        }))
      data.exercises = [
        ...new Map(
          [...data.exercises, ...exercises].map((exercise) => [
            exercise.id,
            exercise,
          ])
        ).values(),
      ]
      data.routineCache = { source: "backend", fetchedAt: now() }
    })
    check()
    return routines
  }
  return {
    list: load,
    async getById(id: string, options?: { signal?: AbortSignal }) {
      const routines = await load(options)
      const routine = routines.find((item) => item.id === id)
      if (!routine)
        throw new ServiceError("NOT_FOUND", "Routine was not found.")
      return routine
    },
  }
}

import type { AuthenticatedRequest, DataStore } from "../services"
import { mapTemplate } from "./routine-templates"
import { ServiceError, isBackendId, validateRoutine } from "./validation"
import type { RoutineInput } from "../../types/domain"

export function createTemplateCreator(
  store: DataStore,
  request: AuthenticatedRequest,
  now: () => number = Date.now
) {
  const pendingIds = new Map<string, string>()
  const tasks = new Map<
    string,
    Promise<ReturnType<typeof mapTemplate>["routine"]>
  >()
  const create = async (input: RoutineInput) => {
    const data = await store.read()
    validateRoutine(input, data.exercises)
    if (input.entries.some((entry) => !isBackendId(entry.exerciseId)))
      throw new ServiceError(
        "VALIDATION",
        "Choose a saved exercise or add a new exercise first."
      )
    if (
      new Set(input.entries.map((entry) => entry.exerciseId)).size !==
      input.entries.length
    )
      throw new ServiceError(
        "VALIDATION",
        "Each exercise can only appear once in a routine."
      )
    if (
      input.name.trim().length > 100 ||
      input.entries.some(
        (entry) =>
          entry.setCount > 20 ||
          entry.repMin > 100 ||
          entry.restSeconds < 1 ||
          entry.restSeconds > 3600
      )
    )
      throw new ServiceError(
        "VALIDATION",
        "Use a name of up to 100 characters, 1–20 sets, 1–100 reps, and 1–3600 seconds of rest."
      )
    if (input.entries.some((entry) => entry.repMin !== entry.repMax))
      throw new ServiceError(
        "VALIDATION",
        "Use the same minimum and maximum reps. Routines currently support one target rep count."
      )
    if (
      input.entries.some(
        (entry) =>
          entry.progressionMode === "reps" || (entry.startingWeight ?? 0) > 0
      )
    )
      throw new ServiceError(
        "VALIDATION",
        "Starting loads and rep progression are not supported yet. Choose manual or weight progression and enter your load when starting the workout."
      )
    const key = JSON.stringify(input)
    let templateId = pendingIds.get(key)
    if (!templateId) {
      const result = await request("/api/workout/Template", {
        method: "POST",
        expectedStatus: 200,
        body: {
          name: input.name.trim(),
          description: null,
          restInMinutes: 2,
          scheduledDays: input.scheduledDays ?? [],
          exercises: input.entries.map((entry, sortIndex) => ({
            exerciseId: entry.exerciseId,
            targetSet: entry.setCount,
            targetReps: entry.repMin,
            restInSeconds: entry.restSeconds,
            sortIndex,
            weightUnit: entry.progressionMode === "weight" ? "Kilograms" : null,
            weightIncrement:
              entry.progressionMode === "weight" ? entry.weightIncrement : null,
          })),
        },
      })
      if (
        !result ||
        typeof result !== "object" ||
        !("templateId" in result) ||
        typeof result.templateId !== "string" ||
        !isBackendId(result.templateId)
      )
        throw new ServiceError(
          "INVALID_RESPONSE",
          "The server returned an invalid routine ID."
        )
      templateId = result.templateId
      pendingIds.set(key, templateId)
    }

    // Mark the snapshot stale without making its original fetch time look newer.
    await store.mutate((draft) => {
      draft.routineCache = {
        source: "backend",
        fetchedAt: draft.routineCache?.fetchedAt ?? 0,
        invalidated: true,
      }
    })
    const detail = await request(
      `/api/workout/Template/${encodeURIComponent(templateId)}`
    ).catch(() => {
      throw new ServiceError(
        "SAVED_NOT_LOADED",
        "The routine was saved. Retry to load it, or return to routines."
      )
    })
    if (!detail || typeof detail !== "object" || Array.isArray(detail))
      throw new ServiceError(
        "INVALID_RESPONSE",
        "The routine was saved, but could not be loaded. Return to routines and retry loading."
      )
    const mapped = mapTemplate(
      { id: templateId },
      detail as Record<string, unknown>,
      now(),
      data.exercises
    )
    await store.mutate((draft) => {
      draft.routines = [
        ...draft.routines.filter((routine) => routine.id !== mapped.routine.id),
        mapped.routine,
      ]
      draft.exercises = [
        ...new Map(
          [...draft.exercises, ...mapped.exercises].map((exercise) => [
            exercise.id,
            exercise,
          ])
        ).values(),
      ]
    })
    pendingIds.delete(key)
    return mapped.routine
  }
  return (input: RoutineInput) => {
    const key = JSON.stringify(input)
    const prior = tasks.get(key)
    if (prior) return prior
    const task = create(input).finally(() => tasks.delete(key))
    tasks.set(key, task)
    return task
  }
}

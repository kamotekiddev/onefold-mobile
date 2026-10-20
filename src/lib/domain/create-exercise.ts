import type { AuthenticatedRequest, DataStore } from "../services"
import { ServiceError, isBackendId } from "./validation"
import type { Exercise } from "../../types/domain"

export function createExerciseCreator(
  store: DataStore,
  request: AuthenticatedRequest
) {
  const pending = new Map<string, Exercise>()
  const tasks = new Map<string, Promise<Exercise>>()
  const create = async (
    input: Pick<Exercise, "name" | "trackingType">
  ): Promise<Exercise> => {
    const name = input.name.trim()
    if (!name || name.length > 100)
      throw new ServiceError(
        "VALIDATION",
        "Enter an exercise name of up to 100 characters."
      )
    const key = JSON.stringify([name, input.trackingType])
    let exercise = pending.get(key)
    if (!exercise) {
      const result = await request("/api/workout/Exercise", {
        method: "POST",
        expectedStatus: 200,
        body: {
          name,
          type: input.trackingType === "bodyweight" ? "Bodyweight" : "Weighted",
          description: null,
        },
      })
      if (
        !result ||
        typeof result !== "object" ||
        !("exerciseId" in result) ||
        typeof result.exerciseId !== "string" ||
        !isBackendId(result.exerciseId)
      )
        throw new ServiceError(
          "INVALID_RESPONSE",
          "The server returned an invalid exercise ID."
        )
      exercise = {
        id: result.exerciseId,
        name,
        trackingType: input.trackingType,
        primaryMuscleGroup: "General",
        equipment: "Unknown",
      }
      pending.set(key, exercise)
    }
    const saved = exercise
    try {
      await store.mutate((data) => {
        data.exercises = [
          ...data.exercises.filter((item) => item.id !== saved.id),
          saved,
        ]
      })
    } catch {
      throw new ServiceError(
        "SAVED_NOT_STORED",
        "The exercise was saved online but could not be saved on this device. Retry to save it locally."
      )
    }
    pending.delete(key)
    return saved
  }
  return (input: Pick<Exercise, "name" | "trackingType">) => {
    const key = JSON.stringify([input.name.trim(), input.trackingType])
    const prior = tasks.get(key)
    if (prior) return prior
    const task = create(input).finally(() => tasks.delete(key))
    tasks.set(key, task)
    return task
  }
}

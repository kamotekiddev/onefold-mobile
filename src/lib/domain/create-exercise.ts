import type { AuthenticatedRequest, DataStore } from "../services"
import { ServiceError, isBackendId } from "./validation"
import type { Exercise } from "../../types/domain"

export async function createExercise(
  store: DataStore,
  request: AuthenticatedRequest,
  input: Pick<Exercise, "name" | "trackingType">
): Promise<Exercise> {
  const name = input.name.trim()
  if (!name || name.length > 100)
    throw new ServiceError(
      "VALIDATION",
      "Enter an exercise name of up to 100 characters."
    )
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
  const exercise: Exercise = {
    id: result.exerciseId,
    name,
    trackingType: input.trackingType,
    primaryMuscleGroup: "General",
    equipment: "Unknown",
  }
  await store.mutate((data) => {
    data.exercises.push(exercise)
  })
  return exercise
}

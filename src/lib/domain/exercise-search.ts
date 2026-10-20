import { ApiError, throwIfCancelled } from "../api-client"
import type { AuthenticatedRequest, DataStore } from "../services"
import type {
  Exercise,
  ExerciseSearchInput,
  ExerciseSearchPage,
} from "../../types/domain"
import { isBackendId, ServiceError } from "./validation"

export function normalizeExerciseSearch(input: ExerciseSearchInput) {
  const name = input.name.trim()
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 20
  if (!name || name.length > 255)
    throw new ServiceError(
      "VALIDATION",
      "Enter an exercise name of up to 255 characters."
    )
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 2147483647 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    (page - 1) * pageSize > 2147483647
  )
    throw new ServiceError("VALIDATION", "Invalid exercise search page.")
  return { name, page, pageSize }
}

function invalid(): never {
  throw new ServiceError(
    "INVALID_RESPONSE",
    "The server returned invalid exercise search results."
  )
}

function integer(value: unknown, minimum: number) {
  const parsed =
    typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : value
  if (
    typeof parsed !== "number" ||
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > 2147483647
  )
    return invalid()
  return parsed
}

export function parseExerciseSearchPage(
  raw: unknown,
  input: ExerciseSearchInput
): ExerciseSearchPage {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return invalid()
  const result = raw as Record<string, unknown>
  const page = integer(result.page, 1)
  const pageSize = integer(result.pageSize, 1)
  const totalCount = integer(result.totalCount, 0)
  const expected = normalizeExerciseSearch(input)
  if (
    page !== expected.page ||
    pageSize !== expected.pageSize ||
    !Array.isArray(result.items) ||
    result.items.length > pageSize ||
    result.items.length > totalCount
  )
    return invalid()
  const items = result.items.map((raw): Exercise => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return invalid()
    const item = raw as Record<string, unknown>
    if (
      typeof item.id !== "string" ||
      !isBackendId(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim()
    )
      return invalid()
    return {
      id: item.id,
      name: item.name.trim(),
      trackingType: "weighted",
      primaryMuscleGroup: "General",
      equipment: "Unknown",
    }
  })
  return { items, page, pageSize, totalCount }
}

export function createExerciseSearcher(
  store: DataStore,
  request: AuthenticatedRequest,
  readRevision: () => number
) {
  return async (
    input: ExerciseSearchInput,
    options: { signal?: AbortSignal } = {}
  ): Promise<ExerciseSearchPage> => {
    const query = normalizeExerciseSearch(input)
    const revision = readRevision()
    const check = () => {
      throwIfCancelled(options.signal)
      if (revision !== readRevision())
        throw new ApiError("cancelled", "Exercise data changed during search.")
    }
    check()
    const raw = await request(
      `/api/workout/Exercise/search?Name=${encodeURIComponent(query.name)}&Page=${query.page}&PageSize=${query.pageSize}`,
      { ...options, expectedStatus: 200 }
    )
    check()
    const result = parseExerciseSearchPage(raw, query)
    await store.mutate((data) => {
      check()
      const catalog = new Map(
        data.exercises.map((exercise) => [exercise.id, exercise])
      )
      result.items = result.items.map((exercise) => ({
        ...exercise,
        ...catalog.get(exercise.id),
        name: exercise.name,
      }))
      result.items.forEach((exercise) => catalog.set(exercise.id, exercise))
      data.exercises = [...catalog.values()]
    })
    check()
    return result
  }
}

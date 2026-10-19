import type {
  AppData,
  Exercise,
  ExerciseQuery,
  Routine,
  RoutineInput,
  SetUpdate,
  StartOptions,
  WeightUnit,
  Workout,
} from "@/types/domain"
import type { ApiRequest } from "./api-client"
import { createServices } from "./domain/mock-services"
export type AuthenticatedRequest = (
  path: string,
  options?: ApiRequest
) => Promise<unknown>
export interface ExerciseService {
  search(query?: ExerciseQuery): Promise<Exercise[]>
  getById(id: string): Promise<Exercise>
}
export interface RoutineService {
  readonly readOnly: boolean
  list(): Promise<Routine[]>
  getById(id: string): Promise<Routine>
  create(input: RoutineInput): Promise<Routine>
  update(
    id: string,
    input: RoutineInput,
    options?: { confirmTargetReset?: boolean }
  ): Promise<Routine>
  duplicate(id: string): Promise<Routine>
  delete(id: string): Promise<void>
}
export interface WorkoutService {
  start(routineId: string, options?: StartOptions): Promise<Workout>
  getActive(): Promise<Workout | null>
  updateSet(
    workoutId: string,
    entryId: string,
    setId: string,
    update: SetUpdate
  ): Promise<Workout>
  addSet(workoutId: string, entryId: string): Promise<Workout>
  complete(id: string): Promise<Workout>
  abandon(id: string): Promise<void>
  listHistory(): Promise<Workout[]>
  getById(id: string): Promise<Workout>
  updateTimer(
    id: string,
    action:
      | { type: "clear" }
      | { type: "expire" }
      | { type: "adjust"; seconds: number }
  ): Promise<Workout>
}
export interface Services {
  exercises: ExerciseService
  routines: RoutineService
  workouts: WorkoutService
  preferences: { setWeightUnit(unit: WeightUnit): Promise<void> }
  demo: { reset(): Promise<void>; failNext(operation?: string): void }
}
export interface DataStore {
  read(): Promise<AppData>
  mutate<T>(fn: (data: AppData) => T): Promise<T>
}
export interface ServiceOptions {
  request?: AuthenticatedRequest
  now?: () => number
}
export { createServices }

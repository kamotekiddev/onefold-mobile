export type WeightUnit = "kg" | "lb"
export type TrackingType = "weighted" | "bodyweight" | "bodyweightAddedWeight"
export type ProgressionMode = "manual" | "weight" | "reps"
export interface Exercise {
  id: string
  name: string
  primaryMuscleGroup: string
  equipment: string
  trackingType: TrackingType
}
export interface RoutineEntry {
  id: string
  exerciseId: string
  order: number
  setCount: number
  repMin: number
  repMax: number
  startingWeight?: number
  restSeconds: number
  progressionMode: ProgressionMode
  weightIncrement?: number
  repIncrement?: number
  prescriptionRevision: number
}
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export interface Routine {
  id: string
  name: string
  entries: RoutineEntry[]
  scheduledDays: Weekday[]
  createdAt: number
  updatedAt: number
}
export type RoutineInput = Pick<Routine, "name" | "entries"> & {
  scheduledDays?: Weekday[]
}
export interface SessionIdentity {
  id: string
  email: string
}
export interface WorkoutSet {
  id: string
  kind: "prescribed" | "extra"
  index: number
  plannedReps: number
  plannedWeight?: number
  actualReps: number | null
  actualWeight: number | null
  repsInput: string
  weightInput: string
  status: "pending" | "completed" | "skipped"
}
export interface PreviousSet {
  reps: number | null
  weight: number | null
}
export interface WorkoutEntry {
  id: string
  exercise: Exercise
  prescription: RoutineEntry
  sets: WorkoutSet[]
  previous: PreviousSet[]
}
export interface ProgressionSuggestion {
  entryId: string
  prescriptionRevision: number
  reps: number
  weight?: number
  reason: string
  advanced: boolean
}
export interface RestTimer {
  endsAt: number
  setId: string
}
export interface Workout {
  id: string
  startRequestId: string
  routineId: string
  routineName: string
  status: "inProgress" | "completed" | "abandoned"
  startedAt: number
  finishedAt?: number
  entries: WorkoutEntry[]
  restTimer: RestTimer | null
  suggestions: ProgressionSuggestion[]
}
export interface FutureTarget extends ProgressionSuggestion {
  routineId: string
  sourceWorkoutId: string
}
export interface AppData {
  schemaVersion: 1
  session: SessionIdentity | null
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  futureTargets: FutureTarget[]
  preferences: { weightUnit: WeightUnit }
}
export interface StoreSnapshot {
  status: "loading" | "ready" | "error"
  data: AppData | null
  error: string | null
}
export interface ExerciseQuery {
  search?: string
  muscleGroup?: string
  equipment?: string
}
export interface SetUpdate {
  actualReps?: number | null
  actualWeight?: number | null
  repsInput?: string
  weightInput?: string
  status?: WorkoutSet["status"]
}
export interface StartOptions {
  requestId?: string
  overrides?: { entryId: string; reps?: number; weight?: number }[]
}

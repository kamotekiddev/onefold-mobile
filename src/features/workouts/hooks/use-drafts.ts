import { useSyncExternalStore } from "react"
import type { WeightUnit } from "@/types/domain"

export interface SetDraft {
  reps: string
  weight: string
  unit: WeightUnit
  pending: boolean
  error: string
  version: number
}
let drafts: Record<string, SetDraft> = {}
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const getSnapshot = () => drafts
export const draftKey = (workoutId: string, setId: string) =>
  `${workoutId}/${setId}`
export function writeDraft(key: string, draft: SetDraft) {
  drafts = { ...drafts, [key]: draft }
  listeners.forEach((listener) => listener())
}
export function readDraft(key: string) {
  return drafts[key]
}
export function clearWorkoutDrafts() {
  drafts = {}
  listeners.forEach((listener) => listener())
}
export function useWorkoutDrafts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

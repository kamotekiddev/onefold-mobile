import * as SQLite from "expo-sqlite"
import type { AppData, StoreSnapshot } from "../../types/domain"
import { makeSeed } from "../domain/seed"

let snapshot: StoreSnapshot = { status: "loading", data: null, error: null }
const listeners = new Set<() => void>()
let database: SQLite.SQLiteDatabase | null = null
let hydration: Promise<void> | null = null
let queue: Promise<unknown> = Promise.resolve()
const publish = (next: StoreSnapshot) => {
  snapshot = next
  listeners.forEach((listener) => listener())
}
const clone = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
async function hydrate() {
  if (snapshot.status === "ready") return
  if (hydration) return hydration
  publish({ status: "loading", data: null, error: null })
  hydration = (async () => {
    try {
      database ??= await SQLite.openDatabaseAsync("onefold-demo.db")
      await database.execAsync(
        "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS application_state (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL);"
      )
      const row = await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM application_state WHERE id = 1"
      )
      const data: AppData = row ? parseStored(row.value) : makeSeed()
      if (!row)
        await database.runAsync(
          "INSERT INTO application_state (id, value) VALUES (1, ?)",
          JSON.stringify(data)
        )
      publish({ status: "ready", data, error: null })
    } catch (error) {
      publish({
        status: "error",
        data: null,
        error:
          error instanceof Error ? error.message : "Unable to load saved data.",
      })
      throw error
    } finally {
      hydration = null
    }
  })()
  return hydration
}
function parseStored(raw: string): AppData {
  const value: unknown = JSON.parse(raw)
  if (
    !value ||
    typeof value !== "object" ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("routines" in value) ||
    !Array.isArray(value.routines) ||
    !("workouts" in value) ||
    !Array.isArray(value.workouts) ||
    !("exercises" in value) ||
    !Array.isArray(value.exercises) ||
    !("futureTargets" in value) ||
    !Array.isArray(value.futureTargets) ||
    !("preferences" in value) ||
    !value.preferences ||
    typeof value.preferences !== "object" ||
    !("weightUnit" in value.preferences) ||
    !["kg", "lb"].includes(String(value.preferences.weightUnit))
  )
    throw new Error(
      "Saved data has an unsupported format. Your data has not been overwritten."
    )
  return value as AppData
}
export const appStore = {
  hydrate,
  getSnapshot: () => snapshot,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  async read(): Promise<AppData> {
    await hydrate()
    await queue
    if (!snapshot.data) throw new Error("Saved data is unavailable.")
    return clone(snapshot.data)
  },
  mutate<T>(fn: (data: AppData) => T): Promise<T> {
    const task = queue.then(async () => {
      await hydrate()
      if (!snapshot.data || !database)
        throw new Error("Saved data is unavailable.")
      const next = clone(snapshot.data)
      const result = fn(next)
      try {
        await database.runAsync(
          "UPDATE application_state SET value = ? WHERE id = 1",
          JSON.stringify(next)
        )
      } catch {
        throw new Error("Could not save your changes. Please try again.")
      }
      publish({ status: "ready", data: next, error: null })
      return clone(result)
    })
    queue = task.catch(() => undefined)
    return task
  },
}

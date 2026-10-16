import * as SQLite from "expo-sqlite"

import type { AppData, StoreSnapshot, Weekday } from "@/types/domain"
import { makeSeed } from "../domain/seed"

const clone = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)

function parseStored(raw: string): AppData {
  const value: unknown = JSON.parse(raw)
  if (
    !value ||
    typeof value !== "object" ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 2 ||
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
      "Saved data has an unsupported format. It was not overwritten."
    )
  const data = value as AppData
  data.routines = data.routines.map((routine) => ({
    ...routine,
    scheduledDays: Array.isArray(routine.scheduledDays)
      ? routine.scheduledDays.filter(
          (day): day is Weekday =>
            typeof day === "number" &&
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6
        )
      : [],
  }))
  return data
}

export function createAccountStore(accountKey: string) {
  let snapshot: StoreSnapshot = { status: "loading", data: null, error: null }
  const listeners = new Set<() => void>()
  let database: SQLite.SQLiteDatabase | null = null
  let hydration: Promise<void> | null = null
  let queue: Promise<unknown> = Promise.resolve()
  let active = true
  const publish = (next: StoreSnapshot) => {
    if (!active) return
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  const ensureActive = () => {
    if (!active) throw new Error("The active account changed.")
  }
  async function hydrate() {
    ensureActive()
    if (snapshot.status === "ready") return
    if (hydration) return hydration
    publish({ status: "loading", data: null, error: null })
    hydration = (async () => {
      try {
        database ??= await SQLite.openDatabaseAsync("onefold-accounts.db")
        ensureActive()
        await database.execAsync(
          "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS account_state (account_key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);"
        )
        const row = await database.getFirstAsync<{ value: string }>(
          "SELECT value FROM account_state WHERE account_key = ?",
          accountKey
        )
        ensureActive()
        const data = row ? parseStored(row.value) : makeSeed()
        if (!row)
          await database.runAsync(
            "INSERT OR IGNORE INTO account_state (account_key, value) VALUES (?, ?)",
            accountKey,
            JSON.stringify(data)
          )
        ensureActive()
        publish({ status: "ready", data, error: null })
      } catch (error) {
        if (active)
          publish({
            status: "error",
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load saved data.",
          })
        throw error
      } finally {
        hydration = null
      }
    })()
    return hydration
  }
  return {
    hydrate,
    activate() {
      active = true
    },
    dispose() {
      active = false
      listeners.clear()
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async read(): Promise<AppData> {
      await hydrate()
      await queue
      ensureActive()
      if (!snapshot.data) throw new Error("Saved data is unavailable.")
      return clone(snapshot.data)
    },
    mutate<T>(fn: (data: AppData) => T): Promise<T> {
      const task = queue.then(async () => {
        await hydrate()
        ensureActive()
        if (!snapshot.data || !database)
          throw new Error("Saved data is unavailable.")
        const next = clone(snapshot.data)
        const result = fn(next)
        ensureActive()
        try {
          await database.runAsync(
            "UPDATE account_state SET value = ? WHERE account_key = ?",
            JSON.stringify(next),
            accountKey
          )
        } catch {
          throw new Error("Could not save your changes. Please try again.")
        }
        ensureActive()
        publish({ status: "ready", data: next, error: null })
        return clone(result)
      })
      queue = task.catch(() => undefined)
      return task
    },
  }
}

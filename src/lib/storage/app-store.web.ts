import type { AppData, StoreSnapshot } from "@/types/domain"

// The web build displays an unsupported-auth screen, so account data is never opened.
// Keep Expo SQLite's native module out of the web bundle.
export function createAccountStore(_accountKey: string) {
  const snapshot: StoreSnapshot = {
    status: "error",
    data: null,
    error: "Native account storage is unavailable on web.",
  }
  const unavailable = async (): Promise<never> => {
    throw new Error("Native account storage is unavailable on web.")
  }
  return {
    hydrate: unavailable,
    activate() {},
    dispose() {},
    getSnapshot: () => snapshot,
    subscribe: (_listener: () => void) => () => undefined,
    read: unavailable as () => Promise<AppData>,
    mutate: <T>(_fn: (data: AppData) => T): Promise<T> => unavailable(),
  }
}

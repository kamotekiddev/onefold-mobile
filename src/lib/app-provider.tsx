import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { createServices } from "@/lib/services"
import { createAccountStore } from "@/lib/storage/app-store"
import { clearWorkoutDrafts } from "@/features/workouts/hooks/use-drafts"
import type { StoreSnapshot } from "@/types/domain"

type Store = ReturnType<typeof createAccountStore>
type ServiceSet = ReturnType<typeof createServices>
const AppContext = createContext<{
  state: StoreSnapshot
  services: ServiceSet
  store: Store
} | null>(null)

export function AppProvider({
  children,
  accountKey,
}: {
  children: ReactNode
  accountKey: string
}) {
  const [store] = useState(() => createAccountStore(accountKey))
  const [services] = useState(() => createServices(store))
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )
  useEffect(() => {
    store.activate()
    void store.hydrate().catch(() => undefined)
    return () => {
      store.dispose()
      clearWorkoutDrafts()
    }
  }, [store])
  return (
    <AppContext.Provider value={{ state, services, store }}>
      {children}
    </AppContext.Provider>
  )
}
export function useMaybeApp() {
  return useContext(AppContext)
}
export function useApp() {
  const app = useMaybeApp()
  if (!app) throw new Error("AppProvider is required.")
  return app
}

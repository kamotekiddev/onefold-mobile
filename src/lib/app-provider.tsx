import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { appStore, services } from "@/lib/services"
import type { StoreSnapshot } from "@/types/domain"

const AppContext = createContext<{
  state: StoreSnapshot
  services: typeof services
} | null>(null)
export function AppProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    appStore.subscribe,
    appStore.getSnapshot,
    appStore.getSnapshot
  )
  useEffect(() => {
    void appStore.hydrate()
  }, [])
  return (
    <AppContext.Provider value={{ state, services }}>
      {children}
    </AppContext.Provider>
  )
}
export function useApp() {
  const app = useContext(AppContext)
  if (!app) throw new Error("AppProvider is required.")
  return app
}

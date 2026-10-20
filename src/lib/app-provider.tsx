import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { createServices, type AuthenticatedRequest } from "@/lib/services"
import { createAccountStore } from "@/lib/storage/app-store"
import { clearWorkoutDrafts } from "@/features/workouts/hooks/use-drafts"
import type { StoreSnapshot } from "@/types/domain"
import { clearAccountQueries, createQueryClient } from "./query-client"

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
  request,
}: {
  children: ReactNode
  accountKey: string
  request: AuthenticatedRequest
}) {
  const [store] = useState(() => createAccountStore(accountKey))
  const [queryClient] = useState(createQueryClient)
  const [services] = useState(() => createServices(store, { request }))
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )
  useEffect(() => {
    store.activate()
    // Temporarily expose load failures to the development error overlay.
    void store.hydrate()
    return () => {
      store.dispose()
      clearAccountQueries(queryClient)
      clearWorkoutDrafts()
    }
  }, [store, queryClient])
  return (
    <AppContext.Provider value={{ state, services, store }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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

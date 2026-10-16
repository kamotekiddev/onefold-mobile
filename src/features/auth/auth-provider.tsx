import * as Network from "expo-network"
import * as SecureStore from "expo-secure-store"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { AppState, Platform } from "react-native"

import { getApiBaseUrl } from "@/lib/api-client"
import { createSessionManager, type AuthSnapshot } from "./services/session"

const KEY = "onefold.auth.session.v1"
const secureStorage = {
  read: () => SecureStore.getItemAsync(KEY),
  write: (value: string) => SecureStore.setItemAsync(KEY, value),
  remove: () => SecureStore.deleteItemAsync(KEY),
}

function createRuntime() {
  if (Platform.OS === "web")
    return {
      manager: null,
      error: "Authentication is available on iOS and Android.",
    }
  try {
    return {
      manager: createSessionManager(getApiBaseUrl(), secureStorage),
      error: null,
    }
  } catch (error) {
    return {
      manager: null,
      error:
        error instanceof Error
          ? error.message
          : "API configuration is missing.",
    }
  }
}

type Manager = ReturnType<typeof createSessionManager>
interface AuthContextValue {
  state: AuthSnapshot
  signIn(email: string, password: string): Promise<void>
  register(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  retry(automatic?: boolean): Promise<void>
  restore(): Promise<void>
  request: Manager["request"]
  accountKey: string | null
}
const AuthContext = createContext<AuthContextValue | null>(null)
const noOp = () => () => undefined

export function AuthProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState(createRuntime)
  const { manager } = runtime
  const fallback: AuthSnapshot = {
    status: "unsupported",
    session: null,
    error: runtime.error,
  }
  const state = useSyncExternalStore(
    manager?.subscribe ?? noOp,
    manager?.getSnapshot ?? (() => fallback),
    manager?.getSnapshot ?? (() => fallback)
  )
  useEffect(() => {
    if (!manager) return
    void manager.restore()
    const foreground = AppState.addEventListener("change", (next) => {
      if (next === "active") void manager.retry(true).catch(() => undefined)
    })
    const network = Network.addNetworkStateListener((next) => {
      if (next.isInternetReachable === true)
        void manager.retry(true).catch(() => undefined)
    })
    return () => {
      foreground.remove()
      network.remove()
    }
  }, [manager])
  const unavailable = async (): Promise<never> => {
    throw new Error(runtime.error ?? "Authentication is unavailable.")
  }
  return (
    <AuthContext.Provider
      value={{
        state,
        signIn: manager
          ? (email, password) => manager.signIn(email, password)
          : unavailable,
        register: manager
          ? (email, password) => manager.signIn(email, password, true)
          : unavailable,
        signOut: manager?.signOut ?? unavailable,
        retry: manager?.retry ?? unavailable,
        restore: manager?.restore ?? unavailable,
        request: manager?.request ?? unavailable,
        accountKey: state.session
          ? `${getApiBaseUrl()}|${state.session.identity.id}`
          : null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("AuthProvider is required.")
  return value
}

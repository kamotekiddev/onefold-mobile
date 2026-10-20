import { onlineManager } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"

const subscribe = (listener: () => void) => onlineManager.subscribe(listener)
const getSnapshot = () => onlineManager.isOnline()

export function useOnline() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

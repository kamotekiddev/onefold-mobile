import { onlineManager, QueryClient } from "@tanstack/react-query"

import { ApiError } from "./api-client"

export const ROUTINE_STALE_TIME = 5 * 60 * 1000

export function retryRead(failureCount: number, error: unknown) {
  if (failureCount >= 2 || !(error instanceof ApiError)) return false
  return (
    error.kind === "network" ||
    error.kind === "timeout" ||
    (error.kind === "http" &&
      (error.status === 408 ||
        error.status === 429 ||
        (error.status ?? 0) >= 500))
  )
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ROUTINE_STALE_TIME,
        retry: retryRead,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      // Execute once and reject offline submissions; never pause/replay a POST.
      mutations: { retry: false, networkMode: "always" },
    },
  })
}

export function requireOnline() {
  if (!onlineManager.isOnline())
    throw new ApiError(
      "network",
      "Connect to the internet, then try saving again."
    )
}

export function clearAccountQueries(client: QueryClient) {
  void client.cancelQueries()
  client.clear()
}

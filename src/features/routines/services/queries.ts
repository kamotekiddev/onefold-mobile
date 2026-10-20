import { queryOptions, type QueryClient } from "@tanstack/react-query"

import { ROUTINE_STALE_TIME, requireOnline } from "@/lib/query-client"
import type { DataStore, Services } from "@/lib/services"
import type { AppData, RoutineInput } from "@/types/domain"

// Each account/environment has its own client. Keys never contain credentials.
export const routineKeys = { all: ["routines"] as const }

export function routinesQueryOptions(
  services: Services,
  snapshot: AppData | null
) {
  return queryOptions({
    queryKey: routineKeys.all,
    queryFn: ({ signal }) => services.routines.list({ signal }),
    initialData:
      snapshot?.routineCache || snapshot?.routines.length
        ? snapshot.routines
        : undefined,
    initialDataUpdatedAt: snapshot?.routineCache?.fetchedAt ?? 0,
    staleTime: snapshot?.routineCache?.invalidated ? 0 : ROUTINE_STALE_TIME,
  })
}

export function createRoutineMutationOptions(
  client: QueryClient,
  services: Services,
  store: DataStore
) {
  return {
    mutationFn: async (input: RoutineInput) => {
      requireOnline()
      return services.routines.create(input)
    },
    retry: false as const,
    networkMode: "always" as const,
    onMutate: () => client.cancelQueries({ queryKey: routineKeys.all }),
    // Even saved-but-not-loaded failures can have changed the server collection.
    onSettled: async () => {
      await client.cancelQueries({ queryKey: routineKeys.all })
      const snapshot = await store.read()
      if (snapshot.routineCache || snapshot.routines.length)
        client.setQueryData(routineKeys.all, snapshot.routines, {
          updatedAt: snapshot.routineCache?.fetchedAt ?? 0,
        })
      void client.invalidateQueries({ queryKey: routineKeys.all })
    },
  }
}

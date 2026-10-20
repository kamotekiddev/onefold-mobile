import { infiniteQueryOptions, type QueryClient } from "@tanstack/react-query"

import { requireOnline } from "@/lib/query-client"
import type { Services } from "@/lib/services"
import type { Exercise } from "@/types/domain"

export const exerciseKeys = {
  all: ["exercise-search"] as const,
  search: (name: string) => ["exercise-search", name.trim(), 20] as const,
}

export function exerciseSearchQueryOptions(services: Services, name: string) {
  const trimmed = name.trim()
  return infiniteQueryOptions({
    queryKey: exerciseKeys.search(trimmed),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      services.exercises.searchPage(
        { name: trimmed, page: pageParam, pageSize: 20 },
        { signal }
      ),
    getNextPageParam: (lastPage) =>
      lastPage.items.length &&
      lastPage.page * lastPage.pageSize < lastPage.totalCount
        ? lastPage.page + 1
        : undefined,
  })
}

export function createExerciseMutationOptions(
  services: Services,
  client?: QueryClient
) {
  return {
    mutationFn: async (input: Pick<Exercise, "name" | "trackingType">) => {
      requireOnline()
      return services.exercises.create(input)
    },
    retry: false as const,
    networkMode: "always" as const,
    onMutate: () => client?.cancelQueries({ queryKey: exerciseKeys.all }),
    onSettled: () => {
      void client?.invalidateQueries({ queryKey: exerciseKeys.all })
    },
  }
}

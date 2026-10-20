import {
  onlineManager,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"

import { useApp } from "@/lib/app-provider"
import type { ExerciseQuery } from "@/types/domain"
import {
  createExerciseMutationOptions,
  exerciseSearchQueryOptions,
  exerciseKeys,
} from "../services/queries"
import { filterExercises } from "../services/catalog"
import { exerciseSearchState } from "../services/search-state"

const subscribeOnline = (callback: () => void) =>
  onlineManager.subscribe(callback)
const getOnline = () => onlineManager.isOnline()

export function useExerciseSearch(search: string, enabled: boolean) {
  const { services } = useApp()
  const remote = services.routines.readOnly
  const client = useQueryClient()
  const name = search.trim()
  const [debouncedName, setDebouncedName] = useState("")
  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnline)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(name), 300)
    return () => clearTimeout(timer)
  }, [name])
  useEffect(() => {
    if (name !== debouncedName)
      void client.cancelQueries({
        queryKey: exerciseKeys.search(debouncedName),
      })
  }, [client, name, debouncedName])
  const local = useExercises({ search: name })
  const query = useInfiniteQuery({
    ...exerciseSearchQueryOptions(services, debouncedName),
    enabled:
      enabled &&
      remote &&
      online &&
      !!name &&
      name.length <= 255 &&
      name === debouncedName,
  })
  const viewState = useMemo(
    () =>
      exerciseSearchState({
        remote,
        name,
        debouncedName,
        online,
        fetching: query.isFetching || query.isPending,
        error: query.error,
        pages: query.data?.pages,
        local,
      }),
    [
      remote,
      name,
      debouncedName,
      online,
      query.isFetching,
      query.isPending,
      query.error,
      query.data?.pages,
      local,
    ]
  )
  return {
    ...viewState,
    remote,
    refreshing: query.isFetching && !query.isFetchingNextPage,
    fetchingNextPage: query.isFetchingNextPage,
    nextPageError: query.isFetchNextPageError,
    hasNextPage:
      query.hasNextPage &&
      !!name &&
      name.length <= 255 &&
      name === debouncedName &&
      online,
    loadMore: () => {
      if (!query.isFetching) void query.fetchNextPage()
    },
    retry: () => {
      void query.refetch()
    },
  }
}

export function useExercises(query: ExerciseQuery = {}) {
  const { state, services } = useApp()
  const { search, muscleGroup, equipment } = query
  return useMemo(
    () =>
      filterExercises(
        state.data?.exercises ?? [],
        {
          search,
          muscleGroup,
          equipment,
        },
        services.routines.readOnly
      ),
    [
      state.data?.exercises,
      services.routines.readOnly,
      search,
      muscleGroup,
      equipment,
    ]
  )
}

export function useCreateExercise() {
  const { services } = useApp()
  const client = useQueryClient()
  return useMutation(createExerciseMutationOptions(services, client))
}

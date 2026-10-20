import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApp } from "@/lib/app-provider"
import {
  createRoutineMutationOptions,
  routinesQueryOptions,
} from "../services/queries"

export function useRoutines() {
  const { services, state } = useApp()
  return useQuery(routinesQueryOptions(services, state.data))
}

export function useRoutine(id?: string, enabled = true) {
  const { services, state } = useApp()
  return useQuery({
    ...routinesQueryOptions(services, state.data),
    enabled: enabled && !!id,
    select: (routines) => routines.find((routine) => routine.id === id),
  })
}

export function useCreateRoutine() {
  const { services, store } = useApp()
  const client = useQueryClient()
  return useMutation(createRoutineMutationOptions(client, services, store))
}

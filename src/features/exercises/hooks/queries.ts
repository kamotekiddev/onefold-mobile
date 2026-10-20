import { useMutation } from "@tanstack/react-query"
import { useMemo } from "react"

import { useApp } from "@/lib/app-provider"
import type { ExerciseQuery } from "@/types/domain"
import { createExerciseMutationOptions } from "../services/queries"
import { filterExercises } from "../services/catalog"

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
  return useMutation(createExerciseMutationOptions(services))
}

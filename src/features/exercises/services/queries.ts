import { requireOnline } from "@/lib/query-client"
import type { Services } from "@/lib/services"
import type { Exercise } from "@/types/domain"

export function createExerciseMutationOptions(services: Services) {
  return {
    mutationFn: async (input: Pick<Exercise, "name" | "trackingType">) => {
      requireOnline()
      return services.exercises.create(input)
    },
    retry: false as const,
    networkMode: "always" as const,
  }
}

import { useLocalSearchParams } from "expo-router"
import { StartWorkoutScreen } from "@/features/workouts"
export default function StartRoute() {
  const { routineId } = useLocalSearchParams<{
    routineId?: string | string[]
  }>()
  return (
    <StartWorkoutScreen
      routineId={typeof routineId === "string" ? routineId : ""}
    />
  )
}

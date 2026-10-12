import { router } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator } from "react-native"

import {
    AppText,
    Button,
    Card,
    EmptyState,
    ErrorMessage,
    Screen,
} from "@/components/ui"
import { useApp } from "@/lib/app-provider"
import type { Workout } from "@/types/domain"
import { useNow } from "../hooks/use-now"
import {
    displayWeight,
    elapsed,
    errorText,
    workoutCounts,
} from "../utils/display"

export function WorkoutDetailScreen({ id }: { id: string }) {
    const { state, services } = useApp()
    const [workout, setWorkout] = useState<Workout | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [retry, setRetry] = useState(0)
    const [loadedId, setLoadedId] = useState("")
    const now = useNow()
    useEffect(() => {
        let current = true
        services.workouts
            .getById(id)
            .then((result) => {
                if (current) setWorkout(result)
            })
            .catch((failure) => {
                if (current) setError(errorText(failure))
            })
            .finally(() => {
                if (current) {
                    setLoading(false)
                    setLoadedId(id)
                }
            })
        return () => {
            current = false
        }
    }, [id, services, retry])
    const unit = state.data?.preferences.weightUnit ?? "kg"
    if (loading || loadedId !== id)
        return (
            <Screen title="Workout">
                <ActivityIndicator accessibilityLabel="Loading workout" />
            </Screen>
        )
    if (error)
        return (
            <Screen title="Workout">
                <ErrorMessage message={error} />
                <Button
                    label="Try again"
                    onPress={() => {
                        setLoading(true)
                        setError("")
                        setRetry((value) => value + 1)
                    }}
                />
            </Screen>
        )
    if (!workout)
        return (
            <Screen title="Workout">
                <EmptyState
                    title="Workout unavailable"
                    message="This workout could not be found."
                />
            </Screen>
        )
    const counts = workoutCounts(workout)
    return (
        <Screen
            title={
                workout.status === "completed"
                    ? "Workout complete"
                    : "Workout details"
            }
            subtitle={workout.routineName}
        >
            <Card>
                <AppText>
                    {new Date(workout.startedAt).toLocaleString()}
                </AppText>
                <AppText variant="heading">
                    {elapsed(
                        ((workout.finishedAt ?? now) - workout.startedAt) / 1000
                    )}{" "}
                    duration
                </AppText>
                <AppText>
                    {counts.completed} of {counts.planned} planned sets
                    completed
                    {counts.extra ? ` · ${counts.extra} extra sets` : ""}
                </AppText>
            </Card>
            {workout.entries.map((entry) => (
                <Card key={entry.id}>
                    <AppText variant="heading">{entry.exercise.name}</AppText>
                    {entry.sets.map((set) => (
                        <AppText key={set.id}>
                            {set.kind === "extra"
                                ? "Extra"
                                : `Set ${set.index + 1}`}{" "}
                            ·{" "}
                            {set.status === "completed"
                                ? `${set.actualReps} reps${entry.exercise.trackingType === "bodyweight" ? "" : ` × ${displayWeight(set.actualWeight, unit)} ${unit}${entry.exercise.trackingType === "bodyweightAddedWeight" ? " added" : ""}`}`
                                : set.status === "skipped"
                                  ? "Skipped"
                                  : "Uncompleted"}
                        </AppText>
                    ))}
                    {workout.suggestions
                        .filter((suggestion) => suggestion.entryId === entry.id)
                        .map((suggestion) => (
                            <Card key={suggestion.entryId}>
                                <AppText variant="heading">
                                    Next session suggestion
                                </AppText>
                                <AppText>
                                    {suggestion.reps} reps
                                    {entry.exercise.trackingType ===
                                    "bodyweight"
                                        ? ""
                                        : ` × ${displayWeight(suggestion.weight, unit)} ${unit}`}
                                </AppText>
                                <AppText variant="caption">
                                    {suggestion.reason}
                                </AppText>
                            </Card>
                        ))}
                </Card>
            ))}
            <AppText variant="caption">
                Targets are mock suggestions, tracked separately for each
                routine entry. You can override them before your next session.
            </AppText>
            <Button
                label="Back to history"
                onPress={() => router.replace("/history")}
            />
        </Screen>
    )
}

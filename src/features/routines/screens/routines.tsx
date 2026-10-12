import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useState } from "react"
import { ActivityIndicator, FlatList, View } from "react-native"

import {
    AppText,
    Button,
    Card,
    EmptyState,
    ErrorMessage,
    Screen,
} from "@/components/ui"
import { useApp } from "@/lib/app-provider"
import type { Routine } from "@/types/domain"

import {
    confirmAction,
    errorText,
    prescriptionText,
    progressionText,
} from "../utils"

export function RoutineListScreen() {
    const { state, services } = useApp()
    const [routines, setRoutines] = useState<Routine[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const load = useCallback(() => {
        let alive = true
        setLoading(true)
        setError("")
        services.routines
            .list()
            .then((value) => {
                if (alive) setRoutines(value)
            })
            .catch((e) => {
                if (alive) setError(errorText(e))
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [services])
    useFocusEffect(load)
    return (
        <Screen
            title="Your routines"
            subtitle="A little structure. A stronger you."
            scroll={false}
        >
            <Button
                label="Create routine"
                onPress={() => router.push("/routines/edit")}
            />
            {loading ? (
                <ActivityIndicator accessibilityLabel="Loading routines" />
            ) : error ? (
                <View>
                    <ErrorMessage message={error} />
                    <Button label="Try again" onPress={load} />
                </View>
            ) : (
                <FlatList
                    data={routines}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
                    ListEmptyComponent={
                        <EmptyState
                            title="Make room for your first workout"
                            message="Create a routine, choose your exercises, and set your starting targets."
                        />
                    }
                    renderItem={({ item }) => (
                        <Card>
                            <AppText variant="heading">{item.name}</AppText>
                            <AppText variant="caption">
                                {item.entries.length} exercises
                            </AppText>
                            <AppText>
                                {item.entries
                                    .map(
                                        (entry) =>
                                            state.data?.exercises.find(
                                                (exercise) =>
                                                    exercise.id ===
                                                    entry.exerciseId
                                            )?.name ?? "Exercise"
                                    )
                                    .slice(0, 3)
                                    .join(" · ")}
                            </AppText>
                            <Button
                                label="View routine"
                                variant="secondary"
                                onPress={() =>
                                    router.push({
                                        pathname: "/routines/details",
                                        params: { id: item.id },
                                    })
                                }
                            />
                        </Card>
                    )}
                />
            )}
        </Screen>
    )
}

export function RoutineDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const { state, services } = useApp()
    const [routine, setRoutine] = useState<Routine | null>(null)
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)
    const [loading, setLoading] = useState(true)
    const unit = state.data?.preferences.weightUnit ?? "kg"
    const load = useCallback(() => {
        let alive = true
        setRoutine(null)
        setLoading(true)
        setError("")
        services.routines
            .getById(typeof id === "string" ? id : "")
            .then((value) => {
                if (alive) setRoutine(value)
            })
            .catch((e) => {
                if (alive) setError(errorText(e))
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [id, services])
    useFocusEffect(load)
    const run = async (action: () => Promise<void>) => {
        if (busy) return
        setBusy(true)
        setError("")
        try {
            await action()
        } catch (e) {
            setError(errorText(e))
        } finally {
            setBusy(false)
        }
    }
    if (loading)
        return (
            <Screen title="Routine">
                <ActivityIndicator />
            </Screen>
        )
    if (!routine)
        return (
            <Screen title="Routine">
                <ErrorMessage message={error || "Routine not found."} />
                <Button label="Try again" onPress={load} />
            </Screen>
        )
    return (
        <Screen
            title={routine.name}
            subtitle={`${routine.entries.length} exercises · your plan for today`}
        >
            {error ? <ErrorMessage message={error} /> : null}
            <Button
                label="Start workout"
                disabled={busy}
                onPress={() =>
                    router.push({
                        pathname: "/workout/start",
                        params: { routineId: routine.id },
                    })
                }
            />
            {routine.entries.map((entry, index) => (
                <Card key={entry.id}>
                    <AppText variant="heading">
                        {index + 1}.{" "}
                        {state.data?.exercises.find(
                            (exercise) => exercise.id === entry.exerciseId
                        )?.name ?? "Exercise"}
                    </AppText>
                    <AppText>{prescriptionText(entry, unit)}</AppText>
                    <AppText variant="caption">
                        {progressionText(entry, unit)}
                    </AppText>
                </Card>
            ))}
            <Button
                label="Edit routine"
                variant="secondary"
                disabled={busy}
                onPress={() =>
                    router.push({
                        pathname: "/routines/edit",
                        params: { id: routine.id },
                    })
                }
            />
            <Button
                label="Duplicate routine"
                variant="secondary"
                loading={busy}
                onPress={() =>
                    void run(async () => {
                        const copy = await services.routines.duplicate(
                            routine.id
                        )
                        router.replace({
                            pathname: "/routines/details",
                            params: { id: copy.id },
                        })
                    })
                }
            />
            <Button
                label="Delete routine"
                variant="danger"
                disabled={busy}
                onPress={() =>
                    confirmAction(
                        "Delete routine?",
                        "Previous workouts stay in your history. This routine will be removed.",
                        "Delete",
                        () =>
                            void run(async () => {
                                await services.routines.delete(routine.id)
                                router.replace("/")
                            })
                    )
                }
            />
        </Screen>
    )
}

import { router, useLocalSearchParams, useNavigation } from "expo-router"
import { usePreventRemove } from "expo-router/react-navigation"
import { useState } from "react"
import { View } from "react-native"

import {
    AppText,
    Button,
    Card,
    ErrorMessage,
    Field,
    Screen,
} from "@/components/ui"
import { useApp } from "@/lib/app-provider"
import type { ProgressionMode, RoutineEntry } from "@/types/domain"

import { useRoutineDraft } from "../hooks/draft"
import { confirmAction, progressionText, toKg, weightText } from "../utils"

export function ExerciseConfigurationScreen() {
    const { entryId } = useLocalSearchParams<{ entryId: string }>()
    const { state } = useApp()
    const { draft, setDraft } = useRoutineDraft()
    const entry = draft?.value.entries.find((item) => item.id === entryId)
    const exercise = state.data?.exercises.find(
        (item) => item.id === entry?.exerciseId
    )
    const unit = state.data?.preferences.weightUnit ?? "kg"
    const navigation = useNavigation()
    const [initial] = useState(() => ({
        setCount: String(entry?.setCount ?? 3),
        repMin: String(entry?.repMin ?? 8),
        repMax: String(entry?.repMax ?? 12),
        startingWeight:
            entry?.startingWeight === undefined
                ? ""
                : weightText(entry.startingWeight, unit),
        restSeconds: String(entry?.restSeconds ?? 90),
        weightIncrement: weightText(entry?.weightIncrement ?? 2.5, unit),
        repIncrement: String(entry?.repIncrement ?? 1),
        progressionMode: entry?.progressionMode ?? "manual",
    }))
    const [form, setForm] = useState(initial)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [leave, setLeave] = useState(false)
    usePreventRemove(
        !leave && JSON.stringify(initial) !== JSON.stringify(form),
        ({ data }) =>
            confirmAction(
                "Discard exercise changes?",
                "These settings have not been applied to the routine draft.",
                "Discard",
                () => {
                    setLeave(true)
                    navigation.dispatch(data.action)
                }
            )
    )
    if (!entry || !exercise)
        return (
            <Screen title="Exercise settings">
                <ErrorMessage message="Open an exercise from the routine editor first." />
                <Button label="Back" onPress={() => router.back()} />
            </Screen>
        )
    const weighted = exercise.trackingType !== "bodyweight"
    const update = (key: keyof typeof form) => (value: string) =>
        setForm((current) => ({ ...current, [key]: value }))
    const numeric = (
        key: keyof typeof form,
        label: string,
        suffix?: string
    ) => (
        <Field
            label={label}
            value={form[key]}
            onChangeText={update(key)}
            error={errors[key]}
            keyboardType="decimal-pad"
            suffix={suffix}
        />
    )
    const candidate: RoutineEntry = {
        ...entry,
        setCount: Number(form.setCount),
        repMin: Number(form.repMin),
        repMax: Number(form.repMax),
        restSeconds: Number(form.restSeconds),
        progressionMode: form.progressionMode,
        startingWeight:
            weighted && form.startingWeight.trim()
                ? form.startingWeight === initial.startingWeight &&
                  entry.startingWeight !== undefined
                    ? entry.startingWeight
                    : toKg(Number(form.startingWeight), unit)
                : undefined,
        weightIncrement:
            form.progressionMode === "weight"
                ? form.weightIncrement === initial.weightIncrement &&
                  entry.weightIncrement !== undefined
                    ? entry.weightIncrement
                    : toKg(Number(form.weightIncrement), unit)
                : undefined,
        repIncrement:
            form.progressionMode === "reps"
                ? Number(form.repIncrement)
                : undefined,
    }
    const apply = () => {
        const next: Record<string, string> = {}
        for (const key of ["setCount", "repMin", "repMax"] as const)
            if (
                !form[key].trim() ||
                !Number.isInteger(Number(form[key])) ||
                Number(form[key]) <= 0
            )
                next[key] = "Enter a positive whole number."
        if (candidate.repMin > candidate.repMax)
            next.repMax = "Maximum reps must be at least the minimum."
        if (
            !form.restSeconds.trim() ||
            !Number.isFinite(candidate.restSeconds) ||
            candidate.restSeconds < 0
        )
            next.restSeconds = "Enter zero or a positive number of seconds."
        if (
            weighted &&
            form.startingWeight.trim() &&
            (!Number.isFinite(candidate.startingWeight) ||
                (candidate.startingWeight ?? 0) < 0)
        )
            next.startingWeight = "Weight cannot be negative."
        if (
            form.progressionMode === "weight" &&
            (!form.weightIncrement.trim() ||
                !Number.isFinite(candidate.weightIncrement) ||
                (candidate.weightIncrement ?? 0) <= 0)
        )
            next.weightIncrement = "Enter a positive weight increment."
        if (
            form.progressionMode === "reps" &&
            (!Number.isInteger(candidate.repIncrement) ||
                (candidate.repIncrement ?? 0) <= 0)
        )
            next.repIncrement = "Enter a positive whole-number increment."
        setErrors(next)
        if (Object.keys(next).length) return
        setDraft(
            (current) =>
                current && {
                    ...current,
                    value: {
                        ...current.value,
                        entries: current.value.entries.map((item) =>
                            item.id === entry.id ? candidate : item
                        ),
                    },
                }
        )
        setLeave(true)
        setTimeout(() => router.back(), 0)
    }
    return (
        <Screen
            title={exercise.name}
            subtitle={`${exercise.primaryMuscleGroup} · ${exercise.equipment}`}
        >
            <Card>
                <AppText variant="heading">Prescription</AppText>
                {numeric("setCount", "Number of sets")}
                {numeric("repMin", "Minimum reps")}
                {numeric("repMax", "Maximum reps")}
                {weighted
                    ? numeric(
                          "startingWeight",
                          exercise.trackingType === "bodyweightAddedWeight"
                              ? "Starting added weight (optional)"
                              : "Starting weight (optional)",
                          unit
                      )
                    : null}
                {numeric("restSeconds", "Rest between sets", "seconds")}
                <AppText variant="caption">
                    The same rep range and rest time apply to each prescribed
                    set. Actual workout results are logged separately.
                </AppText>
            </Card>
            <Card>
                <AppText variant="heading">Progression</AppText>
                <View style={{ gap: 8 }}>
                    {(
                        [
                            "manual",
                            ...(weighted ? ["weight"] : []),
                            "reps",
                        ] as ProgressionMode[]
                    ).map((mode) => (
                        <Button
                            key={mode}
                            label={`${form.progressionMode === mode ? "✓ " : ""}${mode === "manual" ? "Manual" : mode === "weight" ? "Increase weight" : "Increase reps"}`}
                            variant={
                                form.progressionMode === mode
                                    ? "primary"
                                    : "secondary"
                            }
                            onPress={() =>
                                setForm((current) => ({
                                    ...current,
                                    progressionMode: mode,
                                }))
                            }
                        />
                    ))}
                </View>
                {form.progressionMode === "weight"
                    ? numeric("weightIncrement", "Weight increment", unit)
                    : null}
                {form.progressionMode === "reps"
                    ? numeric("repIncrement", "Rep increment", "reps")
                    : null}
                <AppText variant="caption">
                    {progressionText(candidate, unit)}
                </AppText>
            </Card>
            <Button label="Apply settings" onPress={apply} />
            <Button
                label="Cancel"
                variant="secondary"
                onPress={() => router.back()}
            />
        </Screen>
    )
}

import { router } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  AppText,
  Button,
  EmptyState,
  ErrorMessage,
  Screen,
} from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import type {
  WeightUnit,
  Workout,
  WorkoutEntry,
  WorkoutSet,
} from "@/types/domain"

import { WorkoutAction } from "../components/workout-action"
import { useNow } from "../hooks/use-now"
import {
  displayWeight,
  elapsed,
  errorText,
  workoutCounts,
} from "../utils/display"

function setResult(set: WorkoutSet, entry: WorkoutEntry, unit: WeightUnit) {
  if (set.status === "skipped") return "Skipped"
  if (set.status !== "completed") return "Uncompleted"
  const reps = `${set.actualReps} reps`
  if (entry.exercise.trackingType === "bodyweight") return reps
  const weight = `${displayWeight(set.actualWeight, unit)} ${unit}`
  return `${reps} × ${weight}${entry.exercise.trackingType === "bodyweightAddedWeight" ? " added" : ""}`
}

export function WorkoutDetailScreen({ id }: { id: string }) {
  const { state, services } = useApp()
  const p = usePalette()
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
      <Screen
        title="Workout"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <ActivityIndicator accessibilityLabel="Loading workout" />
      </Screen>
    )
  if (error)
    return (
      <Screen
        title="Workout"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <ErrorMessage message={error} />
        <Button
          label="Try again"
          onPress={() => {
            setLoading(true)
            setError("")
            setRetry((value) => value + 1)
          }}
        />
        <Button
          label="Back to history"
          variant="secondary"
          onPress={() => router.replace("/history")}
        />
      </Screen>
    )
  if (!workout)
    return (
      <Screen
        title="Workout"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <EmptyState
          title="Workout unavailable"
          message="This workout could not be found."
          action={
            <Button
              label="Back to history"
              onPress={() => router.replace("/history")}
            />
          }
        />
      </Screen>
    )

  const counts = workoutCounts(workout)
  const complete = workout.status === "completed"
  const date = new Date(workout.finishedAt ?? workout.startedAt)
  const dateLabel = date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const timeLabel = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
  const metrics = [
    {
      label: "Duration",
      value: elapsed(((workout.finishedAt ?? now) - workout.startedAt) / 1000),
    },
    { label: "Sets", value: `${counts.completed}/${counts.planned}` },
    { label: "Exercises", value: String(workout.entries.length) },
  ]

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.root, { backgroundColor: p.background }]}
    >
      <FlatList
        data={workout.entries}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.intro}>
            {complete && (
              <View
                accessibilityLabel="Workout complete"
                style={[styles.completeMark, { backgroundColor: p.accentSoft }]}
              >
                <AppText variant="heading" color={p.accent}>
                  ✓
                </AppText>
              </View>
            )}
            <AppText variant="title" style={styles.title}>
              {complete ? "Workout complete" : "Workout details"}
            </AppText>
            <AppText style={styles.routineName}>{workout.routineName}</AppText>
            <AppText variant="caption" color={p.textSecondary}>
              {dateLabel} · {timeLabel}
            </AppText>
            <View
              style={[
                styles.metrics,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              {metrics.map((metric, index) => (
                <View
                  key={metric.label}
                  style={[
                    styles.metric,
                    index > 0 && styles.metricDivider,
                    { borderColor: p.border },
                  ]}
                >
                  <AppText variant="caption" color={p.textSecondary}>
                    {metric.label}
                  </AppText>
                  <AppText style={styles.metricValue}>{metric.value}</AppText>
                </View>
              ))}
            </View>
            {counts.extra > 0 && (
              <AppText variant="caption" color={p.textSecondary}>
                + {counts.extra} extra {counts.extra === 1 ? "set" : "sets"}{" "}
                completed
              </AppText>
            )}
            <AppText variant="heading" style={styles.sectionTitle}>
              Exercise log
            </AppText>
          </View>
        }
        renderItem={({ item: entry, index }) => {
          const suggestions = workout.suggestions.filter(
            (suggestion) => suggestion.entryId === entry.id
          )
          return (
            <View
              style={[
                styles.exerciseCard,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <View style={styles.exerciseBody}>
                <View style={styles.exerciseHeading}>
                  <View
                    style={[
                      styles.exerciseNumber,
                      { backgroundColor: p.backgroundElement },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={p.accent}
                      style={styles.numberText}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </AppText>
                  </View>
                  <AppText variant="heading" style={styles.exerciseName}>
                    {entry.exercise.name}
                  </AppText>
                </View>
                <View style={styles.sets}>
                  {entry.sets.map((set) => (
                    <View key={set.id} style={styles.setRow}>
                      <AppText color={p.textSecondary} style={styles.setName}>
                        {set.kind === "extra"
                          ? "Extra"
                          : `Set ${set.index + 1}`}
                      </AppText>
                      <AppText
                        color={
                          set.status === "skipped"
                            ? p.danger
                            : set.status === "pending"
                              ? p.textSecondary
                              : p.text
                        }
                        style={styles.setValue}
                      >
                        {setResult(set, entry, unit)}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
              {suggestions.map((suggestion) => (
                <View
                  key={`${suggestion.entryId}-${suggestion.reps}-${suggestion.weight ?? "bodyweight"}`}
                  style={[
                    styles.suggestion,
                    { backgroundColor: p.accentSoft, borderTopColor: p.border },
                  ]}
                >
                  <AppText
                    variant="caption"
                    color={p.accent}
                    style={styles.suggestionLabel}
                  >
                    Next session suggestion
                  </AppText>
                  <AppText style={styles.suggestionValue}>
                    {suggestion.reps} reps
                    {entry.exercise.trackingType === "bodyweight"
                      ? ""
                      : ` × ${displayWeight(suggestion.weight, unit)} ${unit}`}
                  </AppText>
                  <AppText variant="caption" color={p.textSecondary}>
                    {suggestion.reason}
                  </AppText>
                </View>
              ))}
            </View>
          )
        }}
        ListFooterComponent={
          <View style={[styles.note, { backgroundColor: p.backgroundElement }]}>
            <AppText variant="caption" color={p.textSecondary}>
              Targets are mock suggestions, tracked separately for each routine
              entry. You can override them before your next session.
            </AppText>
          </View>
        }
      />
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: p.surface, borderTopColor: p.border },
        ]}
      >
        <View style={styles.bottomContent}>
          <WorkoutAction
            label="Back to history"
            onPress={() => router.replace("/history")}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    alignSelf: "center",
    gap: 16,
    maxWidth: MaxContentWidth,
    padding: 20,
    paddingBottom: 28,
    width: "100%",
  },
  intro: { alignItems: "center", gap: 4, paddingTop: 4 },
  completeMark: {
    alignItems: "center",
    borderRadius: Radii.pill,
    height: 48,
    justifyContent: "center",
    marginBottom: 8,
    width: 48,
  },
  title: { textAlign: "center" },
  routineName: { fontWeight: "600", textAlign: "center" },
  metrics: {
    borderRadius: Radii.card,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 20,
    overflow: "hidden",
    width: "100%",
  },
  metric: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  metricDivider: { borderLeftWidth: 1 },
  metricValue: { fontWeight: "700", textAlign: "center" },
  sectionTitle: { alignSelf: "stretch", marginTop: 20 },
  exerciseCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  exerciseBody: { gap: 16, padding: 18 },
  exerciseHeading: { alignItems: "center", flexDirection: "row", gap: 12 },
  exerciseNumber: {
    alignItems: "center",
    borderRadius: Radii.control,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  numberText: { fontWeight: "700" },
  exerciseName: { flex: 1, fontSize: 18, lineHeight: 25 },
  sets: { gap: 10 },
  setRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  setName: { minWidth: 52 },
  setValue: { flex: 1, textAlign: "right" },
  suggestion: { borderTopWidth: 1, gap: 4, padding: 18 },
  suggestionLabel: { fontWeight: "700" },
  suggestionValue: { fontWeight: "700" },
  note: { borderRadius: Radii.control, padding: 16 },
  bottomBar: { borderTopWidth: 1 },
  bottomContent: {
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "100%",
  },
})

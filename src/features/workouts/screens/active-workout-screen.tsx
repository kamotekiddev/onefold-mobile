import { router } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from "react-native"
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
import type { Workout } from "@/types/domain"

import { ExerciseGuide } from "../components/exercise-guide"
import { SetRow } from "../components/set-row"
import { WorkoutAction } from "../components/workout-action"
import { WorkoutConfirmation } from "../components/workout-confirmation"
import { WorkoutElapsed, WorkoutRestTimer } from "../components/workout-timing"
import { useWorkoutDrafts } from "../hooks/use-drafts"
import { errorText, workoutCounts } from "../utils/display"
import {
  nextUnfinishedExerciseIndex,
  nextUnfinishedSetIndex,
} from "../utils/exercise-flow"

export function ActiveWorkoutScreen() {
  const { state, services } = useApp()
  const p = usePalette()
  const drafts = useWorkoutDrafts()
  const workout = state.data?.workouts.find(
    (item) => item.status === "inProgress"
  )
  const [selection, setExerciseSelection] = useState(() => ({
    workoutId: workout?.id ?? "",
    index: nextUnfinishedExerciseIndex(workout?.entries ?? []),
  }))
  const currentIndex =
    selection.workoutId === workout?.id
      ? Math.min(selection.index, workout.entries.length)
      : nextUnfinishedExerciseIndex(workout?.entries ?? [])
  const currentEntry = workout?.entries[currentIndex]
  const [setSelection, setSetSelection] = useState({
    workoutId: "",
    entryId: "",
    setId: "",
  })
  const selectedSetIndex =
    currentEntry?.sets.findIndex((set) => set.id === setSelection.setId) ?? -1
  const pendingSetIndex = nextUnfinishedSetIndex(currentEntry?.sets ?? [])
  const currentSetIndex =
    setSelection.workoutId === workout?.id &&
    setSelection.entryId === currentEntry?.id &&
    selectedSetIndex !== -1
      ? selectedSetIndex
      : pendingSetIndex !== -1
        ? pendingSetIndex
        : Math.max(0, (currentEntry?.sets.length ?? 1) - 1)
  const currentSet = currentEntry?.sets[currentSetIndex]
  const sections = useMemo(
    () =>
      currentEntry && currentSet
        ? [
            {
              entry: currentEntry,
              index: currentIndex,
              data: [currentSet],
            },
          ]
        : [],
    [currentEntry, currentIndex, currentSet]
  )
  const unit = state.data?.preferences.weightUnit ?? "kg"
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<"finish" | "abandon" | null>(null)
  const onSetFinished = useCallback(
    (updated: Workout, entryId: string, setId: string) => {
      const finishedIndex = updated.entries.findIndex(
        (entry) => entry.id === entryId
      )
      if (finishedIndex === -1) return
      const entry = updated.entries[finishedIndex]
      const finishedSetIndex = entry.sets.findIndex((set) => set.id === setId)
      const nextSetIndex = nextUnfinishedSetIndex(entry.sets, finishedSetIndex)
      if (nextSetIndex !== -1) {
        setSetSelection({
          workoutId: updated.id,
          entryId,
          setId: entry.sets[nextSetIndex].id,
        })
        return
      }
      setSetSelection({ workoutId: "", entryId: "", setId: "" })
      setExerciseSelection({
        workoutId: updated.id,
        index: nextUnfinishedExerciseIndex(updated.entries, finishedIndex),
      })
    },
    []
  )
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await action()
    } catch (failure) {
      setError(errorText(failure))
    } finally {
      setBusy(false)
    }
  }
  if (!workout)
    return (
      <Screen
        title="Workout"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <EmptyState
          title="No active workout"
          message="Choose a routine when you’re ready to train."
          action={
            <Button label="View routines" onPress={() => router.replace("/")} />
          }
        />
      </Screen>
    )
  const counts = workoutCounts(workout)
  const nextActiveIndex = nextUnfinishedExerciseIndex(workout.entries)
  const showCurrentAction = currentIndex !== nextActiveIndex
  const selectExercise = (index: number) => {
    Keyboard.dismiss()
    setExerciseSelection({ workoutId: workout.id, index })
  }
  const selectSet = (index: number) => {
    const set = currentEntry?.sets[index]
    if (!currentEntry || !set) return
    Keyboard.dismiss()
    setSetSelection({
      workoutId: workout.id,
      entryId: currentEntry.id,
      setId: set.id,
    })
  }
  const sessionDrafts = Object.entries(drafts)
    .filter(([key]) => key.startsWith(`${workout.id}/`))
    .map(([, draft]) => draft)
  const failedDrafts = sessionDrafts.some((draft) => draft.error)
  const savingDrafts = sessionDrafts.some((draft) => draft.pending)
  const finish = () =>
    void perform(async () => {
      if (failedDrafts || savingDrafts)
        throw new Error(
          "Wait for inputs to save, or retry the failed sets, before finishing."
        )
      const completed = await services.workouts.complete(workout.id)
      router.replace({
        pathname: "/workout/[id]",
        params: { id: completed.id },
      })
    })
  const requestConfirmation = (kind: "finish" | "abandon") => {
    Keyboard.dismiss()
    setError("")
    setConfirm(kind)
  }
  return (
    <View style={[styles.root, { backgroundColor: p.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView edges={["top", "left", "right"]} style={styles.root}>
          <View
            style={[
              styles.appHeader,
              { backgroundColor: p.surface, borderBottomColor: p.border },
            ]}
          >
            <View style={styles.headerContent}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to routines; workout stays in progress"
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                onPress={() => router.replace("/")}
                style={({ pressed }) => [
                  styles.backAction,
                  { opacity: pressed || busy ? 0.6 : 1 },
                ]}
              >
                <AppText
                  variant="caption"
                  color={p.accent}
                  style={styles.semibold}
                >
                  ‹ Routines
                </AppText>
              </Pressable>
              <View
                style={[styles.statusPill, { backgroundColor: p.accentSoft }]}
              >
                <AppText
                  variant="caption"
                  color={p.accent}
                  style={styles.semibold}
                >
                  In progress
                </AppText>
              </View>
            </View>
          </View>
          <SectionList
            key={`${workout.id}-${currentIndex}-${currentSet?.id ?? "overview"}`}
            style={styles.root}
            sections={sections}
            keyExtractor={(set) => set.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
              <View style={styles.summary}>
                <AppText variant="title" style={styles.title}>
                  {workout.routineName}
                </AppText>
                <View style={styles.metrics}>
                  <WorkoutElapsed startedAt={workout.startedAt} />
                  <AppText variant="caption" color={p.textSecondary}>
                    {counts.completed}/{counts.planned} planned sets
                  </AppText>
                </View>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Planned sets completed"
                  accessibilityValue={{
                    min: 0,
                    max: counts.planned,
                    now: counts.completed,
                  }}
                  style={[
                    styles.progressTrack,
                    { backgroundColor: p.backgroundElement },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: p.accent,
                        width: `${counts.planned ? (counts.completed / counts.planned) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                {counts.extra > 0 && (
                  <AppText variant="caption" color={p.accent}>
                    {counts.extra} extra {counts.extra === 1 ? "set" : "sets"}{" "}
                    completed
                  </AppText>
                )}
                {!!error && <ErrorMessage message={error} />}
                {failedDrafts && (
                  <ErrorMessage message="Some inputs could not be saved. Return to the affected set and tap Retry saving inputs before finishing." />
                )}
                {savingDrafts && (
                  <AppText variant="caption" color={p.textSecondary}>
                    Saving inputs…
                  </AppText>
                )}
                <View style={styles.exerciseNavigation}>
                  <AppText
                    variant="caption"
                    color={p.accent}
                    style={styles.semibold}
                  >
                    {currentEntry
                      ? `Exercise ${currentIndex + 1} of ${workout.entries.length}`
                      : "No sets left to log"}
                  </AppText>
                  <View style={styles.navigationActions}>
                    {currentIndex > 0 && (
                      <View style={styles.navigationAction}>
                        <WorkoutAction
                          label="Previous exercise"
                          variant="secondary"
                          onPress={() => selectExercise(currentIndex - 1)}
                        />
                      </View>
                    )}
                    {showCurrentAction && (
                      <View style={styles.navigationAction}>
                        <WorkoutAction
                          label={
                            nextActiveIndex === workout.entries.length
                              ? "Session overview"
                              : "Current exercise"
                          }
                          variant="secondary"
                          onPress={() => selectExercise(nextActiveIndex)}
                        />
                      </View>
                    )}
                  </View>
                </View>
                {!currentEntry && (
                  <View
                    style={[
                      styles.completionCard,
                      { backgroundColor: p.surface, borderColor: p.border },
                    ]}
                  >
                    <AppText variant="heading">Workout sets reviewed</AppText>
                    <AppText color={p.textSecondary}>
                      Every set is complete or skipped. Review a previous
                      exercise or finish this workout.
                    </AppText>
                  </View>
                )}
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.exerciseSection}>
                <View style={styles.exerciseHeading}>
                  <View
                    style={[
                      styles.exerciseNumber,
                      { backgroundColor: p.accentSoft },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={p.accent}
                      style={styles.semibold}
                    >
                      {String(section.index + 1).padStart(2, "0")}
                    </AppText>
                  </View>
                  <View style={styles.exerciseCopy}>
                    <AppText variant="heading" style={styles.exerciseTitle}>
                      {section.entry.exercise.name}
                    </AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      {section.entry.sets.length} sets ·{" "}
                      {section.entry.prescription.repMin}–
                      {section.entry.prescription.repMax} reps ·{" "}
                      {section.entry.prescription.restSeconds}s rest
                    </AppText>
                  </View>
                </View>
                <ExerciseGuide exercise={section.entry.exercise} />
                <View style={styles.setNavigation}>
                  <AppText
                    variant="caption"
                    color={p.accent}
                    style={styles.semibold}
                  >
                    {currentSet?.kind === "extra" ? "Extra set" : "Set"}{" "}
                    {currentSetIndex + 1} of {section.entry.sets.length}
                  </AppText>
                  <View style={styles.navigationActions}>
                    {currentSetIndex > 0 && (
                      <View style={styles.navigationAction}>
                        <WorkoutAction
                          label="Previous set"
                          variant="secondary"
                          onPress={() => selectSet(currentSetIndex - 1)}
                        />
                      </View>
                    )}
                    {currentSetIndex < section.entry.sets.length - 1 && (
                      <View style={styles.navigationAction}>
                        <WorkoutAction
                          label="Next set"
                          variant="secondary"
                          disabled={currentSet?.status === "pending"}
                          onPress={() => selectSet(currentSetIndex + 1)}
                        />
                      </View>
                    )}
                    {pendingSetIndex !== -1 &&
                      currentSetIndex !== pendingSetIndex && (
                        <View style={styles.navigationAction}>
                          <WorkoutAction
                            label="Current set"
                            variant="secondary"
                            onPress={() => selectSet(pendingSetIndex)}
                          />
                        </View>
                      )}
                  </View>
                </View>
              </View>
            )}
            renderItem={({ item, section }) => (
              <SetRow
                key={`${item.id}-${unit}`}
                workoutId={workout.id}
                entry={section.entry}
                set={item}
                unit={unit}
                onSetFinished={onSetFinished}
              />
            )}
            renderSectionFooter={({ section }) => (
              <View style={styles.sectionFooter}>
                <WorkoutAction
                  label="+ Add extra set"
                  accessibilityLabel={`Add extra set · ${section.entry.exercise.name}`}
                  variant="secondary"
                  disabled={
                    busy ||
                    currentSetIndex < section.entry.sets.length - 1 ||
                    currentSet?.status === "pending"
                  }
                  onPress={() =>
                    void perform(async () => {
                      const updated = await services.workouts.addSet(
                        workout.id,
                        section.entry.id
                      )
                      const updatedEntry = updated.entries.find(
                        (entry) => entry.id === section.entry.id
                      )
                      const added = updatedEntry?.sets.at(-1)
                      if (added)
                        setSetSelection({
                          workoutId: updated.id,
                          entryId: section.entry.id,
                          setId: added.id,
                        })
                    })
                  }
                />
              </View>
            )}
            ListFooterComponent={
              <View style={styles.footer}>
                <AppText variant="caption" color={p.textSecondary}>
                  Your sets save as you go. You can leave and resume this
                  workout anytime.
                </AppText>
                <WorkoutAction
                  label="Abandon workout"
                  variant="danger"
                  disabled={busy}
                  onPress={() => requestConfirmation("abandon")}
                />
              </View>
            }
          />
        </SafeAreaView>
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={[
            styles.bottomBar,
            { backgroundColor: p.surface, borderTopColor: p.border },
          ]}
        >
          <View style={styles.bottomContent}>
            {workout.restTimer && (
              <WorkoutRestTimer
                timer={workout.restTimer}
                workoutId={workout.id}
                busy={busy}
                perform={perform}
              />
            )}
            <WorkoutAction
              label="Finish workout"
              loading={busy && confirm !== "abandon"}
              disabled={busy || failedDrafts || savingDrafts}
              onPress={() =>
                counts.completed < counts.planned
                  ? requestConfirmation("finish")
                  : finish()
              }
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <WorkoutConfirmation
        kind={confirm}
        remaining={counts.planned - counts.completed}
        busy={busy}
        disabled={confirm === "finish" && (failedDrafts || savingDrafts)}
        error={error}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === "finish") finish()
          else
            void perform(async () => {
              await services.workouts.abandon(workout.id)
              router.replace("/")
            })
        }}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  appHeader: { borderBottomWidth: 1 },
  headerContent: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    gap: 12,
    width: "100%",
  },
  backAction: { minHeight: 48, justifyContent: "center", paddingRight: 12 },
  semibold: { fontWeight: "600" },
  statusPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: MaxContentWidth,
    padding: 20,
    paddingBottom: 24,
    gap: 8,
  },
  summary: { gap: 8, paddingBottom: 12 },
  exerciseNavigation: { gap: 8, paddingTop: 8 },
  navigationActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  navigationAction: { flexGrow: 1, minWidth: 140 },
  completionCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  title: { fontSize: 24, lineHeight: 32 },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: Radii.pill,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: { height: "100%", borderRadius: Radii.pill },
  exerciseHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  exerciseSection: { gap: 8 },
  setNavigation: { gap: 8, paddingVertical: 4 },
  exerciseNumber: {
    width: 36,
    minHeight: 36,
    borderRadius: Radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseCopy: { flex: 1, gap: 2 },
  exerciseTitle: { fontSize: 16, lineHeight: 23 },
  sectionFooter: { paddingTop: 4, paddingBottom: 16 },
  footer: { gap: 16, paddingTop: 8 },
  bottomBar: { borderTopWidth: 1 },
  bottomContent: {
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
})

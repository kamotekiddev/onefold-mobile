import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AppText, Button, ErrorMessage, Screen } from "@/components/ui"
import { Colors, MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import { useAuth } from "@/features/auth"
import type { Routine, Weekday, Workout } from "@/types/domain"

import {
  confirmAction,
  errorText,
  prescriptionText,
  progressionSummaryText,
} from "../utils"

export function RoutineListScreen() {
  const { state, services } = useApp()
  const auth = useAuth()
  const p = usePalette()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const exerciseNames = useMemo(
    () =>
      new Map(
        (state.data?.exercises ?? []).map((exercise) => [
          exercise.id,
          exercise.name,
        ])
      ),
    [state.data?.exercises]
  )
  const avatarInitial =
    auth.state.session?.identity.email.trim().charAt(0).toUpperCase() || "U"
  const now = new Date()
  const today = now.getDay() as Weekday
  const todayName = now.toLocaleDateString(undefined, { weekday: "long" })
  const todaysRoutines = routines.filter((routine) =>
    (routine.scheduledDays ?? []).includes(today)
  )
  const activeWorkout = state.data?.workouts.find(
    (workout) => workout.status === "inProgress"
  )
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

  const renderRoutine: ListRenderItem<Routine> = useCallback(
    ({ item }) => {
      const exercisePreview = item.entries
        .map((entry) => exerciseNames.get(entry.exerciseId) ?? "Exercise")
        .slice(0, 3)
        .join(" · ")

      return (
        <Pressable
          accessibilityLabel={`View ${item.name}, ${item.entries.length} exercises`}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/routines/details",
              params: { id: item.id },
            })
          }
          style={({ pressed }) => [
            styles.routineRow,
            {
              backgroundColor: pressed ? p.backgroundElement : p.surface,
              borderColor: p.border,
            },
          ]}
        >
          <View style={styles.routineCopy}>
            <View style={styles.routineTitleLine}>
              <Text style={[styles.routineName, { color: p.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.routineCount, { color: p.textSecondary }]}>
                {item.entries.length} exercises
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[styles.routinePreview, { color: p.textSecondary }]}
            >
              {exercisePreview}
            </Text>
          </View>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.disclosure, { color: p.textSecondary }]}
          >
            ›
          </Text>
        </Pressable>
      )
    },
    [exerciseNames, p]
  )

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.root, { backgroundColor: p.background }]}
    >
      <View
        style={[
          styles.appHeader,
          { backgroundColor: p.surface, borderBottomColor: p.border },
        ]}
      >
        <View style={styles.headerContent}>
          <View accessibilityLabel="Onefold" style={styles.wordmark}>
            <AppText
              variant="heading"
              color={p.accent}
              style={styles.wordmarkText}
            >
              ONEFOLD
            </AppText>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.wordmarkDot, { backgroundColor: p.accent }]}
            />
          </View>
          <Pressable
            accessibilityLabel="Open profile settings"
            accessibilityRole="button"
            onPress={() => router.push("/settings")}
            style={styles.avatarHitArea}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: pressed
                      ? p.backgroundSelected
                      : p.backgroundElement,
                  },
                ]}
              >
                <AppText style={styles.avatarText}>{avatarInitial}</AppText>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.toolbar}>
          <AppText
            variant="caption"
            color={p.textSecondary}
            style={styles.tagline}
          >
            A little structure. A stronger you.
          </AppText>
          {!services.routines.readOnly ? (
            <Pressable
              accessibilityLabel="New Routine"
              accessibilityRole="button"
              onPress={() => router.push("/routines/edit")}
              style={styles.newRoutineHitArea}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.newRoutineButton,
                    { backgroundColor: p.accent, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <AppText
                    variant="caption"
                    color={p.accentText}
                    style={styles.newRoutineLabel}
                  >
                    New Routine
                  </AppText>
                </View>
              )}
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator
              accessibilityLabel="Loading routines"
              color={p.accent}
            />
          </View>
        ) : error ? (
          <View
            style={[
              styles.stateCard,
              { backgroundColor: p.surface, borderColor: p.border },
            ]}
          >
            <ErrorMessage message={error} />
            <Button label="Try again" onPress={load} />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={routines}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              routines.length ? (
                <TodayWorkoutWidget
                  activeWorkout={activeWorkout}
                  dayName={todayName}
                  routines={todaysRoutines}
                  setupRoutineId={routines[0].id}
                  readOnly={services.routines.readOnly}
                />
              ) : null
            }
            ListEmptyComponent={
              <View
                style={[
                  styles.stateCard,
                  { backgroundColor: p.surface, borderColor: p.border },
                ]}
              >
                <AppText style={styles.emptyTitle}>
                  Make room for your first workout
                </AppText>
                <AppText
                  variant="caption"
                  color={p.textSecondary}
                  style={styles.emptyMessage}
                >
                  Create a routine, choose your exercises, and set your starting
                  targets.
                </AppText>
              </View>
            }
            renderItem={renderRoutine}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

function TodayWorkoutWidget({
  activeWorkout,
  dayName,
  routines,
  setupRoutineId,
  readOnly,
}: {
  activeWorkout?: Workout
  dayName: string
  routines: Routine[]
  setupRoutineId: string
  readOnly: boolean
}) {
  const p = usePalette()
  return (
    <View
      style={[
        styles.todayCard,
        { backgroundColor: p.surface, borderColor: p.border },
      ]}
    >
      <View style={styles.todayHeading}>
        <View style={styles.todayTitleBlock}>
          <AppText variant="caption" color={p.accent}>
            {dayName}
          </AppText>
          <AppText variant="heading">
            {activeWorkout ? "Workout in progress" : "Today’s workout"}
          </AppText>
        </View>
        <View style={[styles.todayMark, { backgroundColor: p.accentSoft }]}>
          <AppText
            variant="caption"
            color={p.accent}
            style={styles.todayMarkText}
          >
            TODAY
          </AppText>
        </View>
      </View>

      {activeWorkout ? (
        <View style={styles.todayContent}>
          <AppText color={p.textSecondary}>{activeWorkout.routineName}</AppText>
          <Button
            label="Resume workout"
            onPress={() => router.replace("/workout/active")}
          />
        </View>
      ) : routines.length ? (
        <View style={styles.todayList}>
          {routines.map((routine) => (
            <View key={routine.id} style={styles.todayRoutine}>
              <View style={styles.todayRoutineCopy}>
                <AppText variant="body" style={styles.todayRoutineName}>
                  {routine.name}
                </AppText>
                <AppText variant="caption" color={p.textSecondary}>
                  {routine.entries.length} exercises
                </AppText>
              </View>
              <Button
                label={`Start ${routine.name}`}
                onPress={() =>
                  router.push({
                    pathname: "/workout/start",
                    params: { routineId: routine.id },
                  })
                }
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.todayContent}>
          <AppText color={p.textSecondary}>
            No routine is scheduled for today. Add today to a routine’s weekly
            schedule to see it here.
          </AppText>
          {!readOnly ? (
            <Button
              label="Set today’s workout"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/routines/edit",
                  params: { id: setupRoutineId },
                })
              }
            />
          ) : null}
        </View>
      )}
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
    height: 48,
    justifyContent: "space-between",
    maxWidth: MaxContentWidth,
    paddingHorizontal: 16,
    width: "100%",
  },
  wordmark: { alignItems: "center", flexDirection: "row", gap: 8 },
  wordmarkText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    lineHeight: 18,
  },
  wordmarkDot: { borderRadius: 2, height: 4, width: 4 },
  avatarHitArea: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  avatarText: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  content: {
    alignSelf: "center",
    flex: 1,
    gap: 8,
    maxWidth: MaxContentWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    width: "100%",
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
  },
  tagline: { flex: 1, fontSize: 12, lineHeight: 16 },
  newRoutineHitArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 4,
  },
  newRoutineButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  newRoutineLabel: { fontSize: 13, fontWeight: "600", lineHeight: 16 },
  listContent: { gap: 12, paddingBottom: 24 },
  todayCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  todayHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  todayTitleBlock: { flex: 1, gap: 2 },
  todayMark: {
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  todayMarkText: { fontWeight: "700", letterSpacing: 0.4 },
  todayContent: { gap: 10 },
  todayList: { gap: 12 },
  todayRoutine: { gap: 8 },
  todayRoutineCopy: { gap: 2 },
  todayRoutineName: { fontWeight: "600" },
  routineRow: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  routineCopy: { flex: 1, minWidth: 0 },
  routineTitleLine: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 6,
  },
  routineName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  routineCount: { flexShrink: 0, fontSize: 11, lineHeight: 16 },
  routinePreview: { fontSize: 12, lineHeight: 16 },
  disclosure: { fontSize: 22, lineHeight: 24 },
  loadingState: { alignItems: "center", paddingVertical: 24 },
  stateCard: {
    borderRadius: Radii.control,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", lineHeight: 20 },
  emptyMessage: { fontSize: 13, lineHeight: 18 },
  detailsRoot: { flex: 1 },
  detailsContent: {
    alignSelf: "center",
    gap: 24,
    maxWidth: MaxContentWidth,
    padding: 20,
    paddingBottom: 32,
    width: "100%",
  },
  detailsLoadingState: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32,
  },
  detailsHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
  },
  detailsBackAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 48,
  },
  detailsBackLabel: { fontWeight: "600" },
  detailsTitleBlock: { flex: 1, gap: 4, minWidth: 0 },
  moreAction: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  moreActionVisual: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  moreActionLabel: { fontSize: 20, fontWeight: "700", lineHeight: 20 },
  detailsError: {
    borderRadius: Radii.control,
    borderWidth: 1,
    padding: 16,
  },
  planHeading: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  planHeadingCopy: { flex: 1, gap: 2, minWidth: 200 },
  countPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countPillLabel: { fontWeight: "600" },
  exerciseList: { gap: 16 },
  exerciseCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  exerciseHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  exerciseNumber: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  exerciseNumberLabel: { fontWeight: "700" },
  exerciseCopy: { flex: 1, gap: 4, minWidth: 0 },
  exerciseName: { fontSize: 18, lineHeight: 25 },
  progressionSummary: {
    borderRadius: Radii.control,
    padding: 12,
  },
  startBar: { borderTopWidth: 1 },
  startBarContent: {
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "100%",
  },
  startAction: {
    alignItems: "center",
    borderRadius: Radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  startActionLabel: { fontWeight: "600" },
  actionModal: { flex: 1, justifyContent: "flex-end" },
  actionBackdrop: { opacity: 0.42 },
  actionSafeArea: { paddingHorizontal: 12, paddingTop: 12, width: "100%" },
  actionSheet: {
    alignSelf: "center",
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 16,
    maxWidth: MaxContentWidth,
    padding: 20,
    width: "100%",
  },
  actionSheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
  },
  actionSheetTitle: { flex: 1, gap: 2 },
  actionList: { gap: 8 },
  actionRow: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionRowCopy: { flex: 1, gap: 2, minWidth: 0 },
  actionRowLabel: { fontWeight: "600" },
  actionRowDisclosure: { fontSize: 22, lineHeight: 24 },
  destructiveAction: { marginTop: 4 },
  closeAction: {
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    width: 48,
  },
  closeActionVisual: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeActionIcon: { fontSize: 22, fontWeight: "500", lineHeight: 24 },
})

export function RoutineDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, services } = useApp()
  const p = usePalette()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionsOpen, setActionsOpen] = useState(false)
  const unit = state.data?.preferences.weightUnit ?? "kg"
  const exerciseNames = useMemo(
    () =>
      new Map(
        (state.data?.exercises ?? []).map((exercise) => [
          exercise.id,
          exercise.name,
        ])
      ),
    [state.data?.exercises]
  )
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
      <Screen
        title="Routine"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.detailsLoadingState}>
          <ActivityIndicator
            accessibilityLabel="Loading routine"
            color={p.accent}
          />
          <AppText color={p.textSecondary}>Loading your plan…</AppText>
        </View>
      </Screen>
    )
  if (!routine)
    return (
      <Screen
        title="Routine"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <ErrorMessage message={error || "Routine not found."} />
        <Button label="Try again" onPress={load} />
      </Screen>
    )

  const startWorkout = () =>
    router.push({
      pathname: "/workout/start",
      params: { routineId: routine.id },
    })

  const editRoutine = () => {
    setActionsOpen(false)
    router.push({
      pathname: "/routines/edit",
      params: { id: routine.id },
    })
  }

  const duplicateRoutine = () => {
    setActionsOpen(false)
    void run(async () => {
      const copy = await services.routines.duplicate(routine.id)
      router.replace({
        pathname: "/routines/details",
        params: { id: copy.id },
      })
    })
  }

  const deleteRoutine = () => {
    setActionsOpen(false)
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

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.detailsRoot, { backgroundColor: p.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.detailsContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityLabel="Back to routines"
          accessibilityRole="button"
          onPress={() => router.replace("/")}
          style={styles.detailsBackAction}
        >
          <AppText
            variant="caption"
            color={p.accent}
            style={styles.detailsBackLabel}
          >
            ‹ Routines
          </AppText>
        </Pressable>
        <View style={styles.detailsHeader}>
          <View style={styles.detailsTitleBlock}>
            <AppText variant="title">{routine.name}</AppText>
            <AppText color={p.textSecondary}>
              {routine.entries.length} exercises · your plan for today
            </AppText>
          </View>
          {!services.routines.readOnly ? (
            <Pressable
              accessibilityLabel="More routine actions"
              accessibilityRole="button"
              accessibilityState={{ expanded: actionsOpen, disabled: busy }}
              disabled={busy}
              onPress={() => setActionsOpen(true)}
              style={styles.moreAction}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.moreActionVisual,
                    {
                      backgroundColor: pressed
                        ? p.backgroundSelected
                        : p.backgroundElement,
                      borderColor: p.border,
                      opacity: busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={[styles.moreActionLabel, { color: p.textSecondary }]}
                  >
                    ⋯
                  </Text>
                </View>
              )}
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View
            style={[
              styles.detailsError,
              { backgroundColor: p.dangerSoft, borderColor: p.danger },
            ]}
          >
            <ErrorMessage message={error} />
          </View>
        ) : null}

        <View style={styles.planHeading}>
          <View style={styles.planHeadingCopy}>
            <AppText variant="heading">Today&apos;s plan</AppText>
            <AppText variant="caption" color={p.textSecondary}>
              Follow the exercises in order.
            </AppText>
          </View>
          <View style={[styles.countPill, { backgroundColor: p.accentSoft }]}>
            <AppText
              variant="caption"
              color={p.accent}
              style={styles.countPillLabel}
            >
              {routine.entries.length} exercises
            </AppText>
          </View>
        </View>

        <View style={styles.exerciseList}>
          {routine.entries.map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.exerciseCard,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <View style={styles.exerciseHeader}>
                <View
                  style={[
                    styles.exerciseNumber,
                    { backgroundColor: p.backgroundElement },
                  ]}
                >
                  <AppText
                    variant="caption"
                    color={p.accent}
                    style={styles.exerciseNumberLabel}
                  >
                    {index + 1}
                  </AppText>
                </View>
                <View style={styles.exerciseCopy}>
                  <AppText variant="heading" style={styles.exerciseName}>
                    {exerciseNames.get(entry.exerciseId) ?? "Exercise"}
                  </AppText>
                  <AppText variant="caption" color={p.textSecondary}>
                    {prescriptionText(entry, unit)}
                  </AppText>
                </View>
              </View>
              <View
                style={[
                  styles.progressionSummary,
                  { backgroundColor: p.backgroundElement },
                ]}
              >
                <AppText variant="caption" color={p.textSecondary}>
                  {progressionSummaryText(entry, unit)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <SafeAreaView
        edges={["bottom"]}
        style={[
          styles.startBar,
          { backgroundColor: p.surface, borderTopColor: p.border },
        ]}
      >
        <View style={styles.startBarContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={startWorkout}
            style={({ pressed }) => [
              styles.startAction,
              {
                backgroundColor: p.accent,
                opacity: pressed || busy ? 0.72 : 1,
              },
            ]}
          >
            <AppText color={p.accentText} style={styles.startActionLabel}>
              Start workout
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={() => setActionsOpen(false)}
        presentationStyle="overFullScreen"
        transparent
        visible={actionsOpen}
      >
        <View style={styles.actionModal}>
          <Pressable
            accessibilityLabel="Close routine actions"
            accessibilityRole="button"
            onPress={() => setActionsOpen(false)}
            style={[
              StyleSheet.absoluteFill,
              styles.actionBackdrop,
              { backgroundColor: Colors.dark.background },
            ]}
          />
          <SafeAreaView
            edges={["left", "right", "bottom"]}
            style={styles.actionSafeArea}
          >
            <View
              accessibilityViewIsModal
              style={[
                styles.actionSheet,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <View style={styles.actionSheetHeader}>
                <View style={styles.actionSheetTitle}>
                  <AppText variant="heading">Manage routine</AppText>
                  <AppText variant="caption" color={p.textSecondary}>
                    {routine.name}
                  </AppText>
                </View>
                <Pressable
                  accessibilityLabel="Close routine actions"
                  accessibilityRole="button"
                  onPress={() => setActionsOpen(false)}
                  style={styles.closeAction}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.closeActionVisual,
                        {
                          backgroundColor: pressed
                            ? p.backgroundSelected
                            : p.backgroundElement,
                        },
                      ]}
                    >
                      <Text
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        style={[styles.closeActionIcon, { color: p.accent }]}
                      >
                        ×
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
              <View style={styles.actionList}>
                <Pressable
                  accessibilityHint="Opens the routine editor"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={editRoutine}
                  style={({ pressed }) => [
                    styles.actionRow,
                    {
                      backgroundColor: pressed
                        ? p.backgroundSelected
                        : p.backgroundElement,
                      borderColor: p.border,
                      opacity: busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionRowCopy}>
                    <AppText style={styles.actionRowLabel}>
                      Edit routine
                    </AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      Change exercises and targets
                    </AppText>
                  </View>
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={[
                      styles.actionRowDisclosure,
                      { color: p.textSecondary },
                    ]}
                  >
                    ›
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityHint="Creates an editable copy"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={duplicateRoutine}
                  style={({ pressed }) => [
                    styles.actionRow,
                    {
                      backgroundColor: pressed
                        ? p.backgroundSelected
                        : p.backgroundElement,
                      borderColor: p.border,
                      opacity: busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionRowCopy}>
                    <AppText style={styles.actionRowLabel}>
                      Duplicate routine
                    </AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      Create a separate editable copy
                    </AppText>
                  </View>
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={[
                      styles.actionRowDisclosure,
                      { color: p.textSecondary },
                    ]}
                  >
                    ›
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityHint="Permanently removes this routine"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={deleteRoutine}
                  style={({ pressed }) => [
                    styles.actionRow,
                    styles.destructiveAction,
                    {
                      backgroundColor: pressed ? p.dangerSoft : p.surface,
                      borderColor: p.danger,
                      opacity: busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionRowCopy}>
                    <AppText color={p.danger} style={styles.actionRowLabel}>
                      Delete routine
                    </AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      Workout history will be kept
                    </AppText>
                  </View>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

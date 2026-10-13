import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AppText, Button, Card, ErrorMessage, Screen } from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
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
    state.data?.session?.email.trim().charAt(0).toUpperCase() || "U"
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
})

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
          <AppText variant="caption">{progressionText(entry, unit)}</AppText>
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
            const copy = await services.routines.duplicate(routine.id)
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

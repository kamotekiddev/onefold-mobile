import { router } from "expo-router"
import { SymbolView } from "expo-symbols"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { useRoutineDraft } from "@/features/routines"
import { useApp } from "@/lib/app-provider"
import type { Exercise, RoutineEntry } from "@/types/domain"
import { CreateExerciseForm } from "../components/create-exercise-form"

let entryCounter = 0
export function ExercisePickerScreen() {
  const { services, state } = useApp()
  const { draft, setDraft } = useRoutineDraft()
  const p = usePalette()
  const [search, setSearch] = useState("")
  const [muscleGroup, setMuscleGroup] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let alive = true
    const delay = setTimeout(() => {
      setLoading(true)
      setError("")
      services.exercises
        .search({
          search,
          muscleGroup: muscleGroup || undefined,
        })
        .then((items) => {
          if (alive) setExercises(items)
        })
        .catch((e) => {
          if (alive)
            setError(
              e instanceof Error ? e.message : "Unable to load exercises."
            )
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }, 180)
    return () => {
      alive = false
      clearTimeout(delay)
    }
  }, [search, muscleGroup, services, retry])
  if (!draft)
    return (
      <Screen
        title="Choose exercises"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <EmptyState
          title="Open a routine first"
          message="Create or edit a routine to choose exercises."
        />
        <Button label="Back to routines" onPress={() => router.replace("/")} />
      </Screen>
    )
  const catalog = state.data?.exercises ?? []
  const chips = (
    label: string,
    values: string[],
    active: string,
    update: (value: string) => void
  ) => (
    <View style={styles.filterGroup}>
      <AppText
        variant="caption"
        color={p.textSecondary}
        style={styles.filterLabel}
      >
        {label}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {["", ...values].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: value === active }}
            onPress={() => update(value)}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor:
                  active === value
                    ? p.accent
                    : pressed
                      ? p.backgroundSelected
                      : p.surface,
                borderColor: active === value ? p.accent : p.border,
              },
            ]}
          >
            <AppText
              variant="caption"
              color={active === value ? p.accentText : p.text}
              style={styles.filterChipLabel}
            >
              {value || "All"}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
  return (
    <View style={[styles.root, { backgroundColor: p.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <SafeAreaView edges={["top", "left", "right"]} style={styles.root}>
          <FlatList
            data={loading || error ? [] : exercises}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            ListHeaderComponent={
              <View style={styles.headerContent}>
                <Pressable
                  accessibilityLabel="Back to routine builder"
                  accessibilityRole="button"
                  onPress={() => router.back()}
                  style={styles.backAction}
                >
                  <AppText
                    variant="caption"
                    color={p.accent}
                    style={styles.backLabel}
                  >
                    ‹ Routine builder
                  </AppText>
                </Pressable>

                <View style={styles.titleRow}>
                  <View style={styles.titleCopy}>
                    <AppText variant="title">Choose exercises</AppText>
                    <AppText color={p.textSecondary}>
                      Select movements to add to your routine.
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.selectionPill,
                      { backgroundColor: p.accentSoft },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={p.accent}
                      style={styles.selectionPillLabel}
                    >
                      {selected.length} selected
                    </AppText>
                  </View>
                </View>

                <View style={styles.searchGroup}>
                  <AppText
                    variant="caption"
                    color={p.textSecondary}
                    style={styles.searchLabel}
                  >
                    Search exercises
                  </AppText>
                  <View
                    style={[
                      styles.searchField,
                      { backgroundColor: p.surface, borderColor: p.border },
                    ]}
                  >
                    <SymbolView
                      name={{
                        android: "search",
                        ios: "magnifyingglass",
                        web: "search",
                      }}
                      size={18}
                      tintColor={p.textSecondary}
                    />
                    <TextInput
                      accessibilityLabel="Search exercises"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={setSearch}
                      placeholder="Search by name"
                      placeholderTextColor={p.textSecondary}
                      returnKeyType="search"
                      style={[styles.searchInput, { color: p.text }]}
                      value={search}
                    />
                  </View>
                </View>

                {chips(
                  "Muscle group",
                  [
                    ...new Set(catalog.map((item) => item.primaryMuscleGroup)),
                  ].sort(),
                  muscleGroup,
                  setMuscleGroup
                )}
                <View style={styles.resultsHeader}>
                  <AppText variant="heading">Exercises</AppText>
                  {!loading && !error ? (
                    <AppText variant="caption" color={p.textSecondary}>
                      {exercises.length} result
                      {exercises.length === 1 ? "" : "s"}
                    </AppText>
                  ) : null}
                </View>
              </View>
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator
                    accessibilityLabel="Searching exercises"
                    color={p.accent}
                  />
                  <AppText variant="caption" color={p.textSecondary}>
                    Finding exercises…
                  </AppText>
                </View>
              ) : error ? (
                <View
                  style={[
                    styles.stateCard,
                    { backgroundColor: p.surface, borderColor: p.border },
                  ]}
                >
                  <ErrorMessage message={error} />
                  <Button
                    label="Retry search"
                    onPress={() => setRetry((value) => value + 1)}
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.stateCard,
                    { backgroundColor: p.surface, borderColor: p.border },
                  ]}
                >
                  <AppText variant="heading">No matching exercises</AppText>
                  <AppText variant="caption" color={p.textSecondary}>
                    Try a different name or create a new exercise for your
                    routine.
                  </AppText>
                  <CreateExerciseForm
                    onCreated={(exercise) => {
                      setSelected((current) => [...current, exercise.id])
                      setSearch("")
                      setMuscleGroup("")
                      setRetry((value) => value + 1)
                    }}
                  />
                </View>
              )
            }
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id)
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={item.name}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() =>
                    setSelected((current) =>
                      current.includes(item.id)
                        ? current.filter((id) => id !== item.id)
                        : [...current, item.id]
                    )
                  }
                  style={({ pressed }) => [
                    styles.exerciseRow,
                    {
                      backgroundColor: isSelected
                        ? p.accentSoft
                        : pressed
                          ? p.backgroundElement
                          : p.surface,
                      borderColor: isSelected ? p.accent : p.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? p.accent : p.surface,
                        borderColor: isSelected ? p.accent : p.border,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <AppText
                        variant="caption"
                        color={p.accentText}
                        style={styles.checkmark}
                      >
                        ✓
                      </AppText>
                    ) : null}
                  </View>
                  <View style={styles.exerciseCopy}>
                    <AppText style={styles.exerciseName}>{item.name}</AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      {item.primaryMuscleGroup} · {item.equipment}
                    </AppText>
                  </View>
                </Pressable>
              )
            }}
          />
        </SafeAreaView>

        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.actionBar,
            { backgroundColor: p.surface, borderTopColor: p.border },
          ]}
        >
          <View style={styles.actionBarContent}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !selected.length }}
              disabled={!selected.length}
              onPress={() => {
                setDraft((current) => {
                  if (!current) return current
                  const entries = selected.map(
                    (exerciseId, index): RoutineEntry => {
                      const exercise = catalog.find(
                        (item) => item.id === exerciseId
                      )
                      return {
                        id: `entry-${Date.now()}-${++entryCounter}`,
                        exerciseId,
                        order: current.value.entries.length + index,
                        setCount: 3,
                        repMin: 8,
                        repMax: services.routines.readOnly ? 8 : 12,
                        ...(exercise?.trackingType === "bodyweight"
                          ? {}
                          : { startingWeight: 0 }),
                        restSeconds: 90,
                        progressionMode: "manual",
                        prescriptionRevision: 1,
                      }
                    }
                  )
                  return {
                    ...current,
                    value: {
                      ...current.value,
                      entries: [...current.value.entries, ...entries],
                    },
                  }
                })
                router.back()
              }}
              style={({ pressed }) => [
                styles.addAction,
                {
                  backgroundColor: p.accent,
                  opacity: !selected.length ? 0.45 : pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppText color={p.accentText} style={styles.addActionLabel}>
                {selected.length
                  ? `Add ${selected.length} exercise${selected.length === 1 ? "" : "s"}`
                  : "Select exercises to add"}
              </AppText>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    alignSelf: "center",
    gap: 12,
    maxWidth: MaxContentWidth,
    padding: 20,
    paddingBottom: 32,
    width: "100%",
  },
  headerContent: { gap: 20 },
  backAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 48,
  },
  backLabel: { fontWeight: "600" },
  titleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  titleCopy: { flex: 1, gap: 4, minWidth: 220 },
  selectionPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectionPillLabel: { fontWeight: "600" },
  searchGroup: { gap: 8 },
  searchLabel: { fontWeight: "600" },
  searchField: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 16, minHeight: 46, paddingVertical: 0 },
  filterGroup: { gap: 8 },
  filterLabel: { fontWeight: "600" },
  filterChips: { gap: 8 },
  filterChip: {
    borderRadius: Radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  filterChipLabel: { fontWeight: "600" },
  resultsHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  loadingState: { alignItems: "center", gap: 8, paddingVertical: 32 },
  stateCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  exerciseRow: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  checkmark: { fontWeight: "700" },
  exerciseCopy: { flex: 1, gap: 2, minWidth: 0 },
  exerciseName: { fontWeight: "600" },
  actionBar: { borderTopWidth: 1 },
  actionBarContent: {
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "100%",
  },
  addAction: {
    alignItems: "center",
    borderRadius: Radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  addActionLabel: { fontWeight: "600" },
})

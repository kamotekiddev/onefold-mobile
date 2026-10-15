import { router, useLocalSearchParams, useNavigation } from "expo-router"
import { usePreventRemove } from "expo-router/react-navigation"
import { SymbolView } from "expo-symbols"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AppText, Button, ErrorMessage, Field, Screen } from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import type { Weekday } from "@/types/domain"

import { useRoutineDraft } from "../hooks/draft"
import { confirmAction, errorText, prescriptionText } from "../utils"

const weekdays: { day: Weekday; label: string; name: string }[] = [
  { day: 1, label: "Mo", name: "Monday" },
  { day: 2, label: "Tu", name: "Tuesday" },
  { day: 3, label: "We", name: "Wednesday" },
  { day: 4, label: "Th", name: "Thursday" },
  { day: 5, label: "Fr", name: "Friday" },
  { day: 6, label: "Sa", name: "Saturday" },
  { day: 0, label: "Su", name: "Sunday" },
]

export function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { state, services } = useApp()
  const p = usePalette()
  const { draft, setDraft } = useRoutineDraft()
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [allowLeave, setAllowLeave] = useState(false)
  const unit = state.data?.preferences.weightUnit ?? "kg"
  useEffect(() => {
    let alive = true
    const load = async () => {
      const value = await (id
        ? services.routines.getById(id)
        : Promise.resolve({ name: "", entries: [], scheduledDays: [] }))
      if (alive)
        setDraft({
          routineId: id,
          value: {
            name: value.name,
            entries: value.entries,
            scheduledDays: value.scheduledDays ?? [],
          },
          baseline: JSON.stringify({
            name: value.name,
            entries: value.entries,
            scheduledDays: value.scheduledDays ?? [],
          }),
        })
    }
    load()
      .catch((e) => {
        if (alive) setError(errorText(e))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id, services, setDraft])
  const dirty = !!draft && JSON.stringify(draft.value) !== draft.baseline
  usePreventRemove(dirty && !allowLeave, ({ data }) => {
    confirmAction(
      "Discard changes?",
      "Your unsaved routine changes will be lost.",
      "Discard",
      () => {
        setAllowLeave(true)
        navigation.dispatch(data.action)
      }
    )
  })
  const save = async (confirmTargetReset = false) => {
    if (!draft || saving.current) return
    const nextErrors: Record<string, string> = {}
    if (!draft.value.name.trim()) nextErrors.name = "Enter a routine name."
    if (!draft.value.entries.length)
      nextErrors.entries = "Add at least one exercise."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    saving.current = true
    setBusy(true)
    setError("")
    try {
      const value = { ...draft.value, name: draft.value.name.trim() }
      const saved = draft.routineId
        ? await services.routines.update(draft.routineId, value, {
            confirmTargetReset,
          })
        : await services.routines.create(value)
      setAllowLeave(true)
      setDraft(null)
      setTimeout(
        () =>
          router.replace({
            pathname: "/routines/details",
            params: { id: saved.id },
          }),
        0
      )
    } catch (e) {
      if ((e as { code?: string }).code === "TARGET_RESET_REQUIRED") {
        confirmAction(
          "Reset future targets?",
          "Changed prescriptions reset progression for those exercises. Your workout history stays unchanged.",
          "Save and reset",
          () => void save(true)
        )
      } else setError(errorText(e))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  if (loading)
    return (
      <Screen
        title="Routine editor"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <ActivityIndicator color={p.accent} />
      </Screen>
    )
  if (!draft)
    return (
      <Screen
        title="Routine editor"
        safeAreaEdges={["top", "left", "right", "bottom"]}
      >
        <ErrorMessage message={error || "Unable to load routine."} />
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    )
  return (
    <View style={[styles.root, { backgroundColor: p.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <SafeAreaView edges={["top", "left", "right"]} style={styles.root}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            data={draft.value.entries}
            keyExtractor={(item) => item.id}
            scrollEventThrottle={16}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
              <View style={styles.headerContent}>
                <Pressable
                  accessibilityLabel="Back"
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => router.back()}
                  style={styles.backAction}
                >
                  <AppText
                    variant="caption"
                    color={p.accent}
                    style={styles.backLabel}
                  >
                    ‹ Back
                  </AppText>
                </Pressable>

                <View style={styles.titleBlock}>
                  <AppText variant="title">
                    {id ? "Edit routine" : "Create routine"}
                  </AppText>
                  <AppText color={p.textSecondary}>
                    Build a focused plan you can repeat.
                  </AppText>
                </View>

                <View
                  style={[
                    styles.nameCard,
                    { backgroundColor: p.surface, borderColor: p.border },
                  ]}
                >
                  <Field
                    label="Routine name"
                    value={draft.value.name}
                    error={errors.name}
                    placeholder="e.g. Upper body"
                    onChangeText={(name) =>
                      setDraft(
                        (current) =>
                          current && {
                            ...current,
                            value: { ...current.value, name },
                          }
                      )
                    }
                  />
                </View>

                <View
                  style={[
                    styles.scheduleCard,
                    { backgroundColor: p.surface, borderColor: p.border },
                  ]}
                >
                  <View style={styles.scheduleCopy}>
                    <AppText variant="heading">Weekly schedule</AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      Pick the days you plan to do this routine. It will appear
                      on your Routines screen on those days.
                    </AppText>
                  </View>
                  <View style={styles.weekdayList}>
                    {weekdays.map(({ day, label, name }) => {
                      const selected =
                        draft.value.scheduledDays?.includes(day) ?? false
                      return (
                        <Pressable
                          key={day}
                          accessibilityLabel={name}
                          accessibilityRole="checkbox"
                          accessibilityState={{
                            checked: selected,
                            disabled: busy,
                          }}
                          disabled={busy}
                          onPress={() =>
                            setDraft(
                              (current) =>
                                current && {
                                  ...current,
                                  value: {
                                    ...current.value,
                                    scheduledDays: selected
                                      ? (
                                          current.value.scheduledDays ?? []
                                        ).filter(
                                          (scheduledDay) => scheduledDay !== day
                                        )
                                      : [
                                          ...(current.value.scheduledDays ??
                                            []),
                                          day,
                                        ],
                                  },
                                }
                            )
                          }
                          style={({ pressed }) => [
                            styles.weekdayButton,
                            {
                              backgroundColor: selected
                                ? p.accent
                                : pressed
                                  ? p.backgroundElement
                                  : p.background,
                              borderColor: selected ? p.accent : p.border,
                            },
                          ]}
                        >
                          <AppText
                            variant="caption"
                            color={selected ? p.accentText : p.textSecondary}
                            style={styles.weekdayLabel}
                          >
                            {label}
                          </AppText>
                        </Pressable>
                      )
                    })}
                  </View>
                  <AppText variant="caption" color={p.textSecondary}>
                    {draft.value.scheduledDays?.length
                      ? `${draft.value.scheduledDays.length} ${draft.value.scheduledDays.length === 1 ? "day" : "days"} selected`
                      : "Optional · no days scheduled"}
                  </AppText>
                </View>

                {error ? <ErrorMessage message={error} /> : null}
                {errors.entries ? (
                  <ErrorMessage message={errors.entries} />
                ) : null}

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionCopy}>
                    <AppText variant="heading">Exercises</AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      Configure sets, reps, and progression for each exercise.
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.countPill,
                      { backgroundColor: p.accentSoft },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={p.accent}
                      style={styles.countPillLabel}
                    >
                      {draft.value.entries.length}
                    </AppText>
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: p.surface, borderColor: p.border },
                ]}
              >
                <AppText variant="heading">Add your first exercise</AppText>
                <AppText variant="caption" color={p.textSecondary}>
                  Choose movements, then set their reps, load, rest, and
                  progression.
                </AppText>
              </View>
            }
            renderItem={({ item, index }) => {
              const exercise = state.data?.exercises.find(
                (candidate) => candidate.id === item.exerciseId
              )
              return (
                <View>
                  <View
                    style={[
                      styles.exerciseCard,
                      {
                        backgroundColor: p.surface,
                        borderColor: p.border,
                      },
                    ]}
                  >
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseCopy}>
                        <View style={styles.exerciseTitleLine}>
                          <View
                            style={[
                              styles.exerciseNumber,
                              { backgroundColor: p.accentSoft },
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
                          <AppText
                            variant="heading"
                            style={styles.exerciseName}
                          >
                            {exercise?.name ?? "Exercise"}
                          </AppText>
                        </View>
                        <AppText variant="caption" color={p.textSecondary}>
                          {prescriptionText(item, unit)}
                        </AppText>
                      </View>

                      <View style={styles.headerActions}>
                        <Pressable
                          accessibilityLabel={`Configure ${exercise?.name ?? "exercise"}`}
                          accessibilityRole="button"
                          onPress={() =>
                            router.push({
                              pathname: "/routines/configure",
                              params: { entryId: item.id },
                            })
                          }
                          style={styles.iconAction}
                        >
                          {({ pressed }) => (
                            <View
                              style={[
                                styles.iconActionVisual,
                                {
                                  backgroundColor: pressed
                                    ? p.backgroundSelected
                                    : p.backgroundElement,
                                },
                              ]}
                            >
                              <SymbolView
                                name={{
                                  android: "tune",
                                  ios: "slider.horizontal.3",
                                  web: "tune",
                                }}
                                size={18}
                                tintColor={p.accent}
                              />
                            </View>
                          )}
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Remove ${exercise?.name ?? "exercise"}`}
                          accessibilityRole="button"
                          onPress={() =>
                            setDraft(
                              (current) =>
                                current && {
                                  ...current,
                                  value: {
                                    ...current.value,
                                    entries: current.value.entries
                                      .filter((entry) => entry.id !== item.id)
                                      .map((entry, order) => ({
                                        ...entry,
                                        order,
                                      })),
                                  },
                                }
                            )
                          }
                          style={styles.iconAction}
                        >
                          {({ pressed }) => (
                            <View
                              style={[
                                styles.iconActionVisual,
                                {
                                  backgroundColor: pressed
                                    ? p.dangerSoft
                                    : p.backgroundElement,
                                },
                              ]}
                            >
                              <SymbolView
                                name={{
                                  android: "delete",
                                  ios: "trash",
                                  web: "delete",
                                }}
                                size={17}
                                tintColor={p.danger}
                              />
                            </View>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
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
              disabled={busy}
              onPress={() => router.push("/routines/picker")}
              style={({ pressed }) => [
                styles.footerAction,
                {
                  backgroundColor: pressed
                    ? p.backgroundSelected
                    : p.backgroundElement,
                  borderColor: p.border,
                  opacity: busy ? 0.6 : 1,
                },
              ]}
            >
              <AppText style={styles.footerActionLabel}>Add exercises</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.footerAction,
                {
                  backgroundColor: p.accent,
                  borderColor: p.accent,
                  opacity: pressed || busy ? 0.72 : 1,
                },
              ]}
            >
              <AppText color={p.accentText} style={styles.footerActionLabel}>
                {busy ? "Saving…" : "Save routine"}
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
    gap: 16,
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
  titleBlock: { gap: 4 },
  nameCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: 16,
  },
  scheduleCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  scheduleCopy: { gap: 4 },
  weekdayList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  weekdayButton: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  weekdayLabel: { fontWeight: "600" },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionCopy: { flex: 1, gap: 2, minWidth: 0 },
  countPill: {
    alignItems: "center",
    borderRadius: Radii.pill,
    justifyContent: "center",
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countPillLabel: { fontWeight: "700" },
  emptyCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  exerciseCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  exerciseHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  exerciseCopy: { flex: 1, gap: 4, minWidth: 0 },
  exerciseTitleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  exerciseNumber: {
    alignItems: "center",
    borderRadius: Radii.pill,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  exerciseNumberLabel: { fontWeight: "700" },
  exerciseName: { flex: 1, fontSize: 18, lineHeight: 25 },
  headerActions: { flexDirection: "row" },
  iconAction: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  iconActionVisual: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  actionBar: { borderTopWidth: 1 },
  actionBarContent: {
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "100%",
  },
  footerAction: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 132,
    paddingHorizontal: 14,
  },
  footerActionLabel: { fontWeight: "600" },
})

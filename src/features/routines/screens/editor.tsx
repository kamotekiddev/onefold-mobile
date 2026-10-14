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
  useWindowDimensions,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { SafeAreaView } from "react-native-safe-area-context"

import { AppText, Button, ErrorMessage, Field, Screen } from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import type { RoutineEntry } from "@/types/domain"

import { useRoutineDraft } from "../hooks/draft"
import { confirmAction, errorText, prescriptionText } from "../utils"
import { getDropIndex } from "../reorder"

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
  const [drag, setDrag] = useState<{
    id: string
    translation: number
    target: number
  } | null>(null)
  const rowHeights = useRef<Record<string, number>>({})
  const scrollOffset = useRef(0)
  const dragStartOffset = useRef(0)
  const pointer = useRef(0)
  const list = useRef<FlatList<RoutineEntry>>(null)
  const { height } = useWindowDimensions()
  const unit = state.data?.preferences.weightUnit ?? "kg"
  useEffect(() => {
    let alive = true
    const load = async () => {
      const value = await (id
        ? services.routines.getById(id)
        : Promise.resolve({ name: "", entries: [] }))
      if (alive)
        setDraft({
          routineId: id,
          value: { name: value.name, entries: value.entries },
          baseline: JSON.stringify({
            name: value.name,
            entries: value.entries,
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
  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    const interval = setInterval(() => {
      const delta =
        pointer.current < 160 ? -18 : pointer.current > height - 140 ? 18 : 0
      if (delta)
        list.current?.scrollToOffset({
          offset: Math.max(0, scrollOffset.current + delta),
          animated: false,
        })
    }, 70)
    return () => clearInterval(interval)
  }, [dragging, height])
  const move = (entryId: string, target: number) =>
    setDraft((current) => {
      if (!current) return current
      const entries = [...current.value.entries]
      const from = entries.findIndex((entry) => entry.id === entryId)
      if (from < 0 || target < 0 || target >= entries.length) return current
      const [entry] = entries.splice(from, 1)
      entries.splice(target, 0, entry)
      return {
        ...current,
        value: {
          ...current.value,
          entries: entries.map((item, order) => ({ ...item, order })),
        },
      }
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
            ref={list}
            data={draft.value.entries}
            keyExtractor={(item) => item.id}
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrollOffset.current = event.nativeEvent.contentOffset.y
            }}
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

                {error ? <ErrorMessage message={error} /> : null}
                {errors.entries ? (
                  <ErrorMessage message={errors.entries} />
                ) : null}

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionCopy}>
                    <AppText variant="heading">Exercises</AppText>
                    <AppText variant="caption" color={p.textSecondary}>
                      Press and hold an exercise’s grip, then drag to reorder.
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
              const isDragging = drag?.id === item.id
              return (
                <View
                  onLayout={(event) => {
                    rowHeights.current[item.id] =
                      event.nativeEvent.layout.height
                  }}
                  style={{
                    zIndex: isDragging ? 10 : 0,
                    transform: [
                      {
                        translateY: isDragging ? (drag?.translation ?? 0) : 0,
                      },
                      { scale: isDragging ? 1.02 : 1 },
                    ],
                    opacity: drag && !isDragging ? 0.65 : 1,
                  }}
                >
                  <View
                    style={[
                      styles.exerciseCard,
                      {
                        backgroundColor: p.surface,
                        borderColor: isDragging ? p.accent : p.border,
                      },
                      isDragging && styles.draggingCard,
                    ]}
                  >
                    <GestureDetector
                      gesture={Gesture.Pan()
                        .activateAfterLongPress(250)
                        .runOnJS(true)
                        .onStart((event) => {
                          dragStartOffset.current = scrollOffset.current
                          pointer.current = event.absoluteY
                          setDrag({
                            id: item.id,
                            translation: 0,
                            target: index,
                          })
                        })
                        .onUpdate((event) => {
                          pointer.current = event.absoluteY
                          const translation =
                            event.translationY +
                            scrollOffset.current -
                            dragStartOffset.current
                          const target = getDropIndex(
                            draft.value.entries,
                            rowHeights.current,
                            item.id,
                            translation
                          )
                          setDrag({
                            id: item.id,
                            translation,
                            target,
                          })
                        })
                        .onEnd((event) => {
                          const target = getDropIndex(
                            draft.value.entries,
                            rowHeights.current,
                            item.id,
                            event.translationY +
                              scrollOffset.current -
                              dragStartOffset.current
                          )
                          move(item.id, target)
                          setDrag(null)
                        })
                        .onFinalize(() => setDrag(null))}
                    >
                      <View style={styles.exerciseHeader}>
                        <View
                          accessible
                          accessibilityActions={[
                            ...(index > 0
                              ? [{ name: "moveup", label: "Move up" }]
                              : []),
                            ...(index < draft.value.entries.length - 1
                              ? [{ name: "movedown", label: "Move down" }]
                              : []),
                          ]}
                          accessibilityHint="Press and hold, then drag to reorder"
                          accessibilityLabel={`Reorder ${exercise?.name ?? "exercise"}`}
                          accessibilityRole="adjustable"
                          accessibilityValue={{
                            text: `Position ${index + 1} of ${draft.value.entries.length}`,
                          }}
                          onAccessibilityAction={(event) => {
                            if (
                              event.nativeEvent.actionName === "moveup" &&
                              index > 0
                            ) {
                              move(item.id, index - 1)
                            }
                            if (
                              event.nativeEvent.actionName === "movedown" &&
                              index < draft.value.entries.length - 1
                            ) {
                              move(item.id, index + 1)
                            }
                          }}
                          style={styles.dragHandle}
                        >
                          <SymbolView
                            name={{
                              android: "drag_handle",
                              ios: "line.3.horizontal",
                              web: "drag_handle",
                            }}
                            pointerEvents="none"
                            size={13}
                            tintColor={p.textSecondary}
                          />
                        </View>

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
                    </GestureDetector>

                    {isDragging ? (
                      <View
                        style={[
                          styles.dropStatus,
                          { backgroundColor: p.accentSoft },
                        ]}
                      >
                        <AppText variant="caption" color={p.accent}>
                          Move to position {(drag?.target ?? index) + 1}
                        </AppText>
                      </View>
                    ) : null}
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
  draggingCard: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  exerciseHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  dragHandle: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    minHeight: 48,
    width: 48,
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
  dropStatus: { borderRadius: Radii.control, padding: 12 },
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

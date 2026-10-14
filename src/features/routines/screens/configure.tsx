import { router, useLocalSearchParams, useNavigation } from "expo-router"
import { usePreventRemove } from "expo-router/react-navigation"
import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AppText, Button, ErrorMessage, Field, Screen } from "@/components/ui"
import { MaxContentWidth, Radii, usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import type { ProgressionMode, RoutineEntry } from "@/types/domain"

import { useRoutineDraft } from "../hooks/draft"
import { confirmAction, progressionText, toKg, weightText } from "../utils"

export function ExerciseConfigurationScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>()
  const { state } = useApp()
  const p = usePalette()
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
  const progressionOptions: {
    mode: ProgressionMode
    title: string
    description: string
  }[] = [
    {
      mode: "manual",
      title: "Manual",
      description: "Keep the same target until you choose to change it.",
    },
    ...(weighted
      ? [
          {
            mode: "weight" as const,
            title: "Increase weight",
            description: "Add load after every completed workout.",
          },
        ]
      : []),
    {
      mode: "reps",
      title: "Increase reps",
      description: "Build repetitions while keeping the movement familiar.",
    },
  ]
  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }))
  const numeric = (key: keyof typeof form, label: string, suffix?: string) => (
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
      form.progressionMode === "reps" ? Number(form.repIncrement) : undefined,
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
    <View style={[styles.root, { backgroundColor: p.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <SafeAreaView edges={["top", "left", "right"]} style={styles.root}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
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

            <View style={styles.titleBlock}>
              <AppText variant="title">{exercise.name}</AppText>
              <View style={styles.exerciseMeta}>
                {[exercise.primaryMuscleGroup, exercise.equipment].map(
                  (label) => (
                    <View
                      key={label}
                      style={[
                        styles.metaPill,
                        { backgroundColor: p.backgroundElement },
                      ]}
                    >
                      <AppText variant="caption" color={p.textSecondary}>
                        {label}
                      </AppText>
                    </View>
                  )
                )}
              </View>
            </View>

            <View
              style={[
                styles.section,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <AppText variant="heading">Prescription</AppText>
                <AppText variant="caption" color={p.textSecondary}>
                  Set the target for each workout.
                </AppText>
              </View>

              <View style={styles.fieldGrid}>
                <View style={styles.fieldCell}>
                  {numeric("setCount", "Number of sets")}
                </View>
                <View style={styles.fieldCell}>
                  {numeric("restSeconds", "Rest between sets", "seconds")}
                </View>
                <View style={styles.fieldCell}>
                  {numeric("repMin", "Minimum reps")}
                </View>
                <View style={styles.fieldCell}>
                  {numeric("repMax", "Maximum reps")}
                </View>
              </View>

              {weighted ? (
                <View>
                  {numeric(
                    "startingWeight",
                    exercise.trackingType === "bodyweightAddedWeight"
                      ? "Starting added weight (optional)"
                      : "Starting weight (optional)",
                    unit
                  )}
                </View>
              ) : null}

              <View
                style={[styles.note, { backgroundColor: p.backgroundElement }]}
              >
                <AppText variant="caption" color={p.textSecondary}>
                  These targets repeat for every prescribed set. Your actual
                  results are recorded separately during the workout.
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.section,
                { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <AppText variant="heading">Progression</AppText>
                <AppText variant="caption" color={p.textSecondary}>
                  Choose how this exercise should advance.
                </AppText>
              </View>

              <View style={styles.progressionList}>
                {progressionOptions.map((option) => {
                  const selected = form.progressionMode === option.mode
                  return (
                    <Pressable
                      key={option.mode}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          progressionMode: option.mode,
                        }))
                      }
                      style={({ pressed }) => [
                        styles.progressionOption,
                        {
                          backgroundColor: selected
                            ? p.accentSoft
                            : pressed
                              ? p.backgroundSelected
                              : p.background,
                          borderColor: selected ? p.accent : p.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.selectionMark,
                          {
                            backgroundColor: selected
                              ? p.accent
                              : "transparent",
                            borderColor: selected ? p.accent : p.disabled,
                          },
                        ]}
                      >
                        {selected ? (
                          <AppText
                            variant="caption"
                            color={p.accentText}
                            style={styles.checkmark}
                          >
                            ✓
                          </AppText>
                        ) : null}
                      </View>
                      <View style={styles.progressionCopy}>
                        <AppText style={styles.optionTitle}>
                          {option.title}
                        </AppText>
                        <AppText variant="caption" color={p.textSecondary}>
                          {option.description}
                        </AppText>
                      </View>
                    </Pressable>
                  )
                })}
              </View>

              {form.progressionMode === "weight" ? (
                <View>
                  {numeric("weightIncrement", "Weight increment", unit)}
                </View>
              ) : null}
              {form.progressionMode === "reps" ? (
                <View>{numeric("repIncrement", "Rep increment", "reps")}</View>
              ) : null}

              <View style={[styles.preview, { backgroundColor: p.accentSoft }]}>
                <AppText
                  variant="caption"
                  color={p.accent}
                  style={styles.previewLabel}
                >
                  Progression preview
                </AppText>
                <AppText color={p.text}>
                  {progressionText(candidate, unit)}
                </AppText>
              </View>
            </View>
          </ScrollView>
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
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.footerAction,
                {
                  backgroundColor: pressed
                    ? p.backgroundSelected
                    : p.backgroundElement,
                  borderColor: p.border,
                },
              ]}
            >
              <AppText style={styles.footerActionLabel}>Cancel</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={apply}
              style={({ pressed }) => [
                styles.footerAction,
                {
                  backgroundColor: p.accent,
                  borderColor: p.accent,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppText color={p.accentText} style={styles.footerActionLabel}>
                Apply settings
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
    gap: 24,
    maxWidth: MaxContentWidth,
    padding: 20,
    paddingBottom: 32,
    width: "100%",
  },
  backAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 48,
  },
  backLabel: { fontWeight: "600" },
  titleBlock: { gap: 8 },
  exerciseMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  section: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  sectionHeader: { gap: 4 },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  fieldCell: { flexBasis: 132, flexGrow: 1, minWidth: 132 },
  note: { borderRadius: Radii.control, padding: 12 },
  progressionList: { gap: 8 },
  progressionOption: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    padding: 12,
  },
  selectionMark: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkmark: { fontWeight: "700", lineHeight: 18 },
  progressionCopy: { flex: 1, gap: 2, minWidth: 0 },
  optionTitle: { fontWeight: "600" },
  preview: { borderRadius: Radii.control, gap: 4, padding: 16 },
  previewLabel: { fontWeight: "700" },
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

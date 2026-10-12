import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from "react-native"

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Field,
  Screen,
} from "@/components/ui"
import { usePalette } from "@/constants/theme"
import { useRoutineDraft } from "@/features/routines"
import { useApp } from "@/lib/app-provider"
import type { Exercise, RoutineEntry } from "@/types/domain"

let entryCounter = 0
export function ExercisePickerScreen() {
  const { services, state } = useApp()
  const { draft, setDraft } = useRoutineDraft()
  const palette = usePalette()
  const [search, setSearch] = useState("")
  const [muscleGroup, setMuscleGroup] = useState("")
  const [equipment, setEquipment] = useState("")
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
          equipment: equipment || undefined,
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
  }, [search, muscleGroup, equipment, services, retry])
  if (!draft)
    return (
      <Screen title="Choose exercises">
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
    <View style={{ gap: 8 }}>
      <AppText variant="caption">{label}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {["", ...values].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: value === active }}
            onPress={() => update(value)}
            style={{
              minHeight: 48,
              justifyContent: "center",
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor:
                active === value ? palette.accent : palette.surface,
            }}
          >
            <AppText
              color={active === value ? palette.accentText : palette.text}
            >
              {value || "All"}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
  return (
    <Screen
      title="Choose exercises"
      subtitle={`${selected.length} selected`}
      scroll={false}
    >
      <Field
        label="Search exercises"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name"
      />
      {chips(
        "Muscle group",
        [...new Set(catalog.map((item) => item.primaryMuscleGroup))].sort(),
        muscleGroup,
        setMuscleGroup
      )}
      {chips(
        "Equipment",
        [...new Set(catalog.map((item) => item.equipment))].sort(),
        equipment,
        setEquipment
      )}
      {loading ? (
        <ActivityIndicator accessibilityLabel="Searching exercises" />
      ) : error ? (
        <View>
          <ErrorMessage message={error} />
          <Button
            label="Retry search"
            onPress={() => setRetry((value) => value + 1)}
          />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
          ListEmptyComponent={
            <EmptyState
              title="No matching exercises"
              message="Try a different name or clear the filters."
              action={
                <Button
                  label="Clear filters"
                  onPress={() => {
                    setSearch("")
                    setMuscleGroup("")
                    setEquipment("")
                  }}
                />
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={item.name}
              accessibilityState={{
                checked: selected.includes(item.id),
              }}
              onPress={() =>
                setSelected((current) =>
                  current.includes(item.id)
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id]
                )
              }
            >
              <Card>
                <AppText variant="heading">
                  {selected.includes(item.id) ? "✓ " : "+ "}
                  {item.name}
                </AppText>
                <AppText variant="caption">
                  {item.primaryMuscleGroup} · {item.equipment}
                </AppText>
              </Card>
            </Pressable>
          )}
        />
      )}
      <Button
        label={`Add ${selected.length || ""} exercise${selected.length === 1 ? "" : "s"}`}
        disabled={!selected.length}
        onPress={() => {
          setDraft((current) => {
            if (!current) return current
            const entries = selected.map((exerciseId, index): RoutineEntry => {
              const exercise = catalog.find((item) => item.id === exerciseId)
              return {
                id: `entry-${Date.now()}-${++entryCounter}`,
                exerciseId,
                order: current.value.entries.length + index,
                setCount: 3,
                repMin: 8,
                repMax: 12,
                ...(exercise?.trackingType === "bodyweight"
                  ? {}
                  : { startingWeight: 0 }),
                restSeconds: 90,
                progressionMode: "manual",
                prescriptionRevision: 1,
              }
            })
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
      />
    </Screen>
  )
}

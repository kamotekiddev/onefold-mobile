import { router, useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AppText, Button, ErrorMessage, usePalette } from "@/components/ui"
import { MaxContentWidth, Radii } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"
import type { Workout } from "@/types/domain"

export function HistoryScreen() {
  const { services } = useApp()
  const p = usePalette()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadHistory = useCallback(
    (isCurrent: () => boolean) => {
      setLoading(true)
      setError("")
      services.workouts
        .listHistory()
        .then((results) => {
          if (isCurrent()) setWorkouts(results)
        })
        .catch((failure) => {
          if (isCurrent())
            setError(
              failure instanceof Error
                ? failure.message
                : "Unable to load history."
            )
        })
        .finally(() => {
          if (isCurrent()) setLoading(false)
        })
    },
    [services]
  )

  useFocusEffect(
    useCallback(() => {
      let current = true
      loadHistory(() => current)
      return () => {
        current = false
      }
    }, [loadHistory])
  )

  const openWorkout = (id: string) =>
    router.push({ pathname: "/workout/[id]", params: { id } })

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
              variant="caption"
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
          <AppText variant="caption" color={p.textSecondary}>
            Your training log
          </AppText>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.heading}>
          <AppText variant="title">History</AppText>
          <AppText color={p.textSecondary}>
            Every session, a little stronger.
          </AppText>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator
              accessibilityLabel="Loading workout history"
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
            <Button label="Try again" onPress={() => loadHistory(() => true)} />
          </View>
        ) : (
          <FlatList
            data={workouts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              workouts.length > 0 ? (
                <View style={styles.listHeading}>
                  <AppText variant="heading">Your sessions</AppText>
                  <View
                    style={[
                      styles.countPill,
                      { backgroundColor: p.accentSoft },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={p.accent}
                      style={styles.countLabel}
                    >
                      {workouts.length}{" "}
                      {workouts.length === 1 ? "session" : "sessions"}
                    </AppText>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: p.surface, borderColor: p.border },
                ]}
              >
                <View
                  style={[styles.emptyMark, { backgroundColor: p.accentSoft }]}
                >
                  <AppText variant="heading" color={p.accent}>
                    01
                  </AppText>
                </View>
                <AppText variant="heading">
                  Your first session starts here
                </AppText>
                <AppText color={p.textSecondary}>
                  Complete a workout to see your logged sets and progress here.
                </AppText>
                <Button
                  label="Choose a routine"
                  onPress={() => router.replace("/")}
                />
              </View>
            }
            renderItem={({ item }) => {
              const completed = item.entries
                .flatMap((entry) => entry.sets)
                .filter((set) => set.status === "completed").length
              const minutes = Math.max(
                1,
                Math.round(
                  ((item.finishedAt ?? item.startedAt) - item.startedAt) / 60000
                )
              )
              const date = new Date(item.finishedAt ?? item.startedAt)
              const dateLabel = date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Review ${item.routineName}, ${dateLabel}`}
                  accessibilityHint="Opens workout details"
                  onPress={() => openWorkout(item.id)}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    {
                      backgroundColor: pressed
                        ? p.backgroundElement
                        : p.surface,
                      borderColor: p.border,
                    },
                  ]}
                >
                  <View style={styles.sessionTopline}>
                    <AppText
                      variant="caption"
                      color={p.accent}
                      style={styles.dateLabel}
                    >
                      {dateLabel}
                    </AppText>
                    <AppText
                      variant="heading"
                      color={p.textSecondary}
                      style={styles.disclosure}
                    >
                      ›
                    </AppText>
                  </View>
                  <AppText variant="heading">{item.routineName}</AppText>
                  <View style={styles.metrics}>
                    <AppText variant="caption" color={p.textSecondary}>
                      {minutes} min
                    </AppText>
                    <View
                      style={[styles.metricDot, { backgroundColor: p.border }]}
                    />
                    <AppText variant="caption" color={p.textSecondary}>
                      {completed} sets
                    </AppText>
                    <View
                      style={[styles.metricDot, { backgroundColor: p.border }]}
                    />
                    <AppText variant="caption" color={p.textSecondary}>
                      {item.entries.length} exercises
                    </AppText>
                  </View>
                </Pressable>
              )
            }}
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
  wordmarkText: { fontWeight: "800", letterSpacing: 2 },
  wordmarkDot: { borderRadius: 2, height: 4, width: 4 },
  content: {
    alignSelf: "center",
    flex: 1,
    gap: 16,
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: "100%",
  },
  heading: { gap: 4 },
  list: { gap: 12, paddingBottom: 24 },
  listHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  countPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countLabel: { fontWeight: "600" },
  sessionCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  sessionTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 24,
  },
  dateLabel: { fontWeight: "600" },
  disclosure: { fontSize: 24, lineHeight: 26 },
  metrics: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricDot: { borderRadius: 2, height: 3, width: 3 },
  loadingState: { alignItems: "center", paddingVertical: 32 },
  stateCard: { borderRadius: Radii.card, borderWidth: 1, gap: 12, padding: 16 },
  emptyCard: {
    alignItems: "flex-start",
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  emptyMark: {
    alignItems: "center",
    borderRadius: Radii.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
})

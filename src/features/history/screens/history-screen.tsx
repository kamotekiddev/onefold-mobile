import { router, useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import { ActivityIndicator, FlatList, StyleSheet } from "react-native"

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Screen,
} from "@/components/ui"
import { useApp } from "@/lib/app-provider"
import type { Workout } from "@/types/domain"

export function HistoryScreen() {
  const { services } = useApp()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useFocusEffect(
    useCallback(() => {
      let current = true
      setLoading(true)
      setError("")
      services.workouts
        .listHistory()
        .then((results) => {
          if (current) setWorkouts(results)
        })
        .catch((failure) => {
          if (current)
            setError(
              failure instanceof Error
                ? failure.message
                : "Unable to load history."
            )
        })
        .finally(() => {
          if (current) setLoading(false)
        })
      return () => {
        current = false
      }
    }, [services, retry])
  )
  return (
    <Screen
      scroll={false}
      title="History"
      subtitle="Every session, a little stronger."
    >
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading workout history" />
      ) : error ? (
        <>
          <ErrorMessage message={error} />
          <Button
            label="Try again"
            onPress={() => setRetry((value) => value + 1)}
          />
        </>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Your first session starts here"
              message="Complete a workout to see your logged sets and next-session suggestions."
              action={
                <Button
                  label="Choose a routine"
                  onPress={() => router.replace("/")}
                />
              }
            />
          }
          renderItem={({ item }) => {
            const sets = item.entries.flatMap((entry) => entry.sets)
            const completed = sets.filter(
              (set) => set.status === "completed"
            ).length
            const minutes = Math.max(
              1,
              Math.round(
                ((item.finishedAt ?? item.startedAt) - item.startedAt) / 60000
              )
            )
            return (
              <Card>
                <AppText variant="caption">
                  {new Date(
                    item.finishedAt ?? item.startedAt
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </AppText>
                <AppText variant="heading">{item.routineName}</AppText>
                <AppText>
                  {minutes} min · {completed} completed sets ·{" "}
                  {item.entries.length} exercises
                </AppText>
                <Button
                  label={`Review ${item.routineName}`}
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/workout/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              </Card>
            )
          }}
        />
      )}
    </Screen>
  )
}
const styles = StyleSheet.create({ list: { gap: 12, paddingBottom: 24 } })

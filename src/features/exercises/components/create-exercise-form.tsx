import { useRef, useState } from "react"
import { View } from "react-native"

import { AppText, Button, ErrorMessage, Field } from "@/components/ui"
import { useApp } from "@/lib/app-provider"
import type { Exercise } from "@/types/domain"

export function CreateExerciseForm({
  onCreated,
}: {
  onCreated: (exercise: Exercise) => void
}) {
  const { services } = useApp()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [bodyweight, setBodyweight] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const saving = useRef(false)
  const create = async () => {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError("")
    try {
      const exercise = await services.exercises.create({
        name,
        trackingType: bodyweight ? "bodyweight" : "weighted",
      })
      onCreated(exercise)
      setName("")
      setOpen(false)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create exercise."
      )
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  if (!open)
    return (
      <Button
        label="Add new exercise"
        variant="secondary"
        onPress={() => setOpen(true)}
      />
    )
  return (
    <View style={{ gap: 12 }}>
      <AppText variant="heading">New exercise</AppText>
      <Field
        label="Exercise name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Bench press"
      />
      <AppText variant="caption">
        {bodyweight ? "Bodyweight exercise" : "Weighted exercise"}
      </AppText>
      <Button
        label={bodyweight ? "Switch to weighted" : "Switch to bodyweight"}
        variant="secondary"
        disabled={busy}
        onPress={() => setBodyweight((value) => !value)}
      />
      {error ? <ErrorMessage message={error} /> : null}
      <Button
        label="Create exercise"
        disabled={!name.trim()}
        loading={busy}
        onPress={() => void create()}
      />
      <Button
        label="Cancel"
        variant="secondary"
        disabled={busy}
        onPress={() => setOpen(false)}
      />
    </View>
  )
}

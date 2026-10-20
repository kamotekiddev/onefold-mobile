import { useRef, useState } from "react"
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppText, Card, ErrorMessage } from "@/components/ui"
import {
  Colors,
  Radii,
  Spacing,
  Typography,
  usePalette,
} from "@/constants/theme"
import { useCreateExercise } from "../hooks/queries"
import type { Exercise } from "@/types/domain"

export function CreateExerciseForm({
  onCreated,
}: {
  onCreated: (exercise: Exercise) => void
}) {
  const creation = useCreateExercise()
  const p = usePalette()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [bodyweight, setBodyweight] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const saving = useRef(false)
  const close = () => {
    if (!saving.current) setOpen(false)
  }
  const create = async () => {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError("")
    try {
      const exercise = await creation.mutateAsync({
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
  const trigger = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add new exercise"
      accessibilityState={{ expanded: open }}
      onPress={() => {
        Keyboard.dismiss()
        setError("")
        setOpen(true)
      }}
      style={({ pressed }) => [
        styles.openAction,
        {
          backgroundColor: pressed ? p.backgroundSelected : p.surface,
          borderColor: p.border,
        },
      ]}
    >
      <View style={[styles.addMark, { backgroundColor: p.accentSoft }]}>
        <AppText color={p.accent} style={styles.plus}>
          +
        </AppText>
      </View>
      <View style={styles.copy}>
        <AppText color={p.accent} style={styles.actionLabel}>
          Add new exercise
        </AppText>
        <AppText variant="caption" color={p.textSecondary}>
          Create a movement for your routine.
        </AppText>
      </View>
    </Pressable>
  )
  const form = (
    <Card style={styles.form}>
      <View style={styles.copy}>
        <AppText variant="heading">New exercise</AppText>
        <AppText variant="caption" color={p.textSecondary}>
          Name your movement and choose how to track it.
        </AppText>
      </View>
      <View style={styles.fieldGroup}>
        <AppText variant="caption" style={styles.actionLabel}>
          Exercise name
        </AppText>
        <TextInput
          accessibilityLabel="Exercise name"
          autoCapitalize="sentences"
          autoCorrect={false}
          editable={!busy}
          onChangeText={setName}
          placeholder="e.g. Bench press"
          placeholderTextColor={p.textSecondary}
          selectionColor={p.accent}
          style={[
            styles.input,
            {
              backgroundColor: p.background,
              borderColor: p.border,
              color: p.text,
            },
          ]}
          value={name}
        />
      </View>
      <View style={styles.fieldGroup}>
        <AppText variant="caption" style={styles.actionLabel}>
          Tracking type
        </AppText>
        {[
          {
            label: "Weighted",
            description: "Track weight and reps.",
            value: false,
          },
          {
            label: "Bodyweight",
            description: "Track reps without added weight.",
            value: true,
          },
        ].map((option) => {
          const checked = bodyweight === option.value
          return (
            <Pressable
              key={option.label}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label}. ${option.description}`}
              accessibilityState={{ checked, disabled: busy }}
              disabled={busy}
              onPress={() => setBodyweight(option.value)}
              style={({ pressed }) => [
                styles.trackingOption,
                {
                  backgroundColor: checked
                    ? p.accentSoft
                    : pressed
                      ? p.backgroundElement
                      : p.surface,
                  borderColor: checked ? p.accent : p.border,
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: checked ? p.accent : p.border },
                ]}
              >
                {checked ? (
                  <View
                    style={[styles.radioDot, { backgroundColor: p.accent }]}
                  />
                ) : null}
              </View>
              <View style={styles.copy}>
                <AppText style={styles.actionLabel}>{option.label}</AppText>
                <AppText variant="caption" color={p.textSecondary}>
                  {option.description}
                </AppText>
              </View>
            </Pressable>
          )
        })}
      </View>
      {error ? (
        <View style={[styles.error, { backgroundColor: p.dangerSoft }]}>
          <ErrorMessage message={error} />
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={close}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: pressed ? p.backgroundElement : p.surface,
              borderColor: p.border,
              opacity: busy ? 0.5 : 1,
            },
          ]}
        >
          <AppText style={[styles.actionLabel, styles.buttonLabel]}>
            Cancel
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? "Creating exercise" : "Create exercise"}
          accessibilityState={{ busy, disabled: busy || !name.trim() }}
          disabled={busy || !name.trim()}
          onPress={() => void create()}
          style={({ pressed }) => [
            styles.action,
            styles.createAction,
            {
              backgroundColor: p.accent,
              borderColor: p.accent,
              opacity: !name.trim() ? 0.45 : pressed || busy ? 0.72 : 1,
            },
          ]}
        >
          {busy ? <ActivityIndicator color={p.accentText} /> : null}
          <AppText
            color={p.accentText}
            style={[styles.actionLabel, styles.buttonLabel]}
          >
            {busy ? "Creating…" : "Create exercise"}
          </AppText>
        </Pressable>
      </View>
    </Card>
  )
  return (
    <>
      {trigger}
      <Modal
        transparent
        visible={open}
        onRequestClose={close}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modal}>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: Colors.light.text, opacity: 0.5 },
            ]}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modal}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.modalContent,
                {
                  paddingTop: insets.top + Spacing.three,
                  paddingBottom: insets.bottom + Spacing.three,
                  paddingLeft: insets.left + Spacing.three,
                  paddingRight: insets.right + Spacing.three,
                },
              ]}
            >
              <View
                accessibilityViewIsModal
                onAccessibilityEscape={close}
                style={styles.dialog}
              >
                {form}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  modalContent: { flexGrow: 1, justifyContent: "center" },
  dialog: { alignSelf: "center", maxWidth: 480, width: "100%" },
  openAction: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 48,
    padding: Spacing.three,
  },
  addMark: {
    alignItems: "center",
    borderRadius: Radii.control,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  plus: { fontSize: Typography.heading, fontWeight: "600" },
  copy: { flexShrink: 1, gap: Spacing.one, minWidth: 0 },
  form: { gap: Spacing.three, padding: Spacing.three },
  fieldGroup: { gap: Spacing.two },
  input: {
    borderRadius: Radii.control,
    borderWidth: 1,
    fontSize: Typography.body,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  trackingOption: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 64,
    padding: Spacing.three,
  },
  radio: {
    alignItems: "center",
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  radioDot: { borderRadius: Radii.pill, height: 12, width: 12 },
  error: { borderRadius: Radii.control, padding: Spacing.three },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  action: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 100,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  createAction: { flexGrow: 2, flexBasis: 160 },
  actionLabel: { fontWeight: "600", textAlign: "left" },
  buttonLabel: { flexShrink: 1, textAlign: "center" },
})

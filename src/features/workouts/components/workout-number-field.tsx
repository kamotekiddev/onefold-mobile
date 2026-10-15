import { useState } from "react"
import { StyleSheet, TextInput, View } from "react-native"

import { AppText } from "@/components/ui"
import { Radii, usePalette } from "@/constants/theme"

export function WorkoutNumberField({
  label,
  accessibilityLabel,
  value,
  onChangeText,
  keyboardType,
  suffix,
}: {
  label: string
  accessibilityLabel: string
  value: string
  onChangeText: (value: string) => void
  keyboardType: "number-pad" | "decimal-pad"
  suffix?: string
}) {
  const p = usePalette()
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.field}>
      <AppText variant="caption" color={p.textSecondary} style={styles.label}>
        {label}
        {suffix ? ` · ${suffix}` : ""}
      </AppText>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder="—"
        placeholderTextColor={p.textSecondary}
        selectionColor={p.accent}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            color: p.text,
            backgroundColor: p.background,
            borderColor: focused ? p.accent : p.border,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontWeight: "600" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
})

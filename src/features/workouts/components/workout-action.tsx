import { ActivityIndicator, Pressable, StyleSheet } from "react-native"

import { AppText } from "@/components/ui"
import { Radii, usePalette } from "@/constants/theme"

export function WorkoutAction({
  label,
  accessibilityLabel,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: {
  label: string
  accessibilityLabel?: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger"
  disabled?: boolean
  loading?: boolean
}) {
  const p = usePalette()
  const color =
    variant === "primary"
      ? p.accentText
      : variant === "danger"
        ? p.danger
        : p.accent
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor:
            variant === "primary"
              ? p.accent
              : variant === "danger"
                ? p.dangerSoft
                : p.surface,
          borderColor: variant === "primary" ? p.accent : p.border,
          opacity: disabled || loading ? 0.55 : pressed ? 0.72 : 1,
        },
      ]}
    >
      {loading && <ActivityIndicator size="small" color={color} />}
      <AppText variant="caption" color={color} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: Radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { flexShrink: 1, fontWeight: "600", textAlign: "center" },
})

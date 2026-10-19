import { SymbolView } from "expo-symbols"
import { Pressable, StyleSheet, View } from "react-native"

import { AppText, Card, ErrorMessage, Screen } from "@/components/ui"
import { Radii, Spacing, usePalette } from "@/constants/theme"

type Props = {
  title: string
  description: string
  message: string
  recoveryError?: string
  onRetry?: () => void
  secondaryAction?: { label: string; onPress: () => void }
}

export function AppRecoveryScreen({
  title,
  description,
  message,
  recoveryError,
  onRetry,
  secondaryAction,
}: Props) {
  const p = usePalette()

  return (
    <Screen safeAreaEdges={["top", "left", "right", "bottom"]}>
      <AppText variant="caption" color={p.accent} style={styles.brand}>
        ONEFOLD
      </AppText>
      <View style={styles.body}>
        <Card style={styles.card}>
          <View style={styles.heading}>
            <View
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.icon, { backgroundColor: p.accentSoft }]}
            >
              <SymbolView
                name={{
                  ios: "exclamationmark.triangle",
                  android: "warning",
                  web: "warning",
                }}
                size={28}
                tintColor={p.accent}
              />
            </View>
            <AppText variant="heading" style={styles.centered}>
              {title}
            </AppText>
            <AppText color={p.textSecondary} style={styles.centered}>
              {description}
            </AppText>
          </View>

          <View style={[styles.details, { backgroundColor: p.dangerSoft }]}>
            <ErrorMessage message={message} />
            {recoveryError ? <ErrorMessage message={recoveryError} /> : null}
          </View>

          {onRetry || secondaryAction ? (
            <View style={styles.actions}>
              {onRetry ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onRetry}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: p.accent, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <AppText color={p.accentText} style={styles.actionLabel}>
                    Retry loading
                  </AppText>
                </Pressable>
              ) : null}
              {secondaryAction ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={secondaryAction.onPress}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: pressed
                        ? p.backgroundElement
                        : p.surface,
                      borderColor: p.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <AppText color={p.accent} style={styles.actionLabel}>
                    {secondaryAction.label}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Card>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  brand: {
    fontWeight: "800",
    letterSpacing: 1.6,
    paddingVertical: Spacing.two,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: Spacing.five,
  },
  card: {
    alignSelf: "center",
    gap: Spacing.four,
    maxWidth: 440,
    padding: Spacing.four,
    width: "100%",
  },
  heading: { alignItems: "center", gap: Spacing.three },
  icon: {
    alignItems: "center",
    borderRadius: Radii.card,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  centered: { textAlign: "center" },
  details: {
    borderRadius: Radii.control,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  actions: { gap: Spacing.two },
  action: {
    alignItems: "center",
    borderRadius: Radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionLabel: { fontWeight: "600", textAlign: "center" },
})

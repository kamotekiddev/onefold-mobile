import { Image } from "expo-image"
import { StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui"
import { Radii, usePalette } from "@/constants/theme"
import type { Exercise } from "@/types/domain"

import { exerciseIllustrations } from "../illustrations"

export function ExerciseGuide({ exercise }: { exercise: Exercise }) {
  const p = usePalette()
  const illustration = exerciseIllustrations[exercise.id]
  if (!illustration) return null

  return (
    <View style={styles.guide}>
      <AppText variant="caption" color={p.textSecondary} style={styles.label}>
        HOW TO DO IT
      </AppText>
      <View
        style={[
          styles.frame,
          { backgroundColor: p.backgroundElement, borderColor: p.border },
        ]}
      >
        <Image
          source={illustration.source}
          contentFit="contain"
          accessibilityLabel={illustration.description}
          accessible
          style={styles.image}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  guide: { gap: 8, paddingBottom: 8 },
  label: { fontWeight: "700", letterSpacing: 0.4 },
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: 240,
    borderRadius: Radii.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
})

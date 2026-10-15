import type { ImageSource } from "expo-image"

interface ExerciseIllustration {
  source: ImageSource | number
  description: string
}

// Add bundled exercise artwork here by catalog ID when illustrations are ready.
export const exerciseIllustrations: Partial<
  Record<string, ExerciseIllustration>
> = {}

# Theme

## Compact token summary

- Light: background `#F5F7F7`, surface `#FFFFFF`, text `#172526`, secondary `#526467`, accent `#006D65`, accent text `#FFFFFF`, accent soft `#DDF3EE`, border `#CAD8D6`, danger `#AD2F38`.
- Dark: background `#101919`, surface `#192525`, text `#EDF5F3`, secondary `#AEC2BE`, accent `#72DACA`, accent text `#072D29`, accent soft `#193D36`, border `#3E5550`, danger `#FFABB0`.
- Typography: system sans; title 30, heading 20, body 16, caption 13; line height is 1.4x.
- Spacing: 2, 4, 8, 16, 24, 32, 64.
- Radii: control 12, card 18, pill 28.
- Controls: minimum touch height 48. Content width max 760 with 20 horizontal padding.
- No Tailwind, global CSS, or custom shadow tokens. Appearance follows system light/dark mode.

## Raw source: `src/constants/theme.ts`

```ts
import { Platform, useColorScheme } from "react-native"
export const Colors = {
  light: { background: "#F5F7F7", surface: "#FFFFFF", text: "#172526", textSecondary: "#526467", accent: "#006D65", accentText: "#FFFFFF", accentSoft: "#DDF3EE", border: "#CAD8D6", danger: "#AD2F38", dangerSoft: "#FBEAEC", success: "#006D65", disabled: "#758683", backgroundElement: "#EAF0EF", backgroundSelected: "#DDF3EE" },
  dark: { background: "#101919", surface: "#192525", text: "#EDF5F3", textSecondary: "#AEC2BE", accent: "#72DACA", accentText: "#072D29", accentSoft: "#193D36", border: "#3E5550", danger: "#FFABB0", dangerSoft: "#472A2E", success: "#72DACA", disabled: "#91A39F", backgroundElement: "#22312E", backgroundSelected: "#193D36" },
} as const
export type ThemeColor = keyof typeof Colors.light
export function usePalette() { return Colors[useColorScheme() === "dark" ? "dark" : "light"] }
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const
export const Radii = { control: 12, card: 18, pill: 28 } as const
export const Typography = { title: 30, heading: 20, body: 16, caption: 13 } as const
export const Fonts = { sans: Platform.OS === "ios" ? "System" : "sans-serif", mono: Platform.OS === "ios" ? "Menlo" : "monospace" }
export const BottomTabInset = 0
export const MaxContentWidth = 760
```

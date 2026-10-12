import { Alert, Platform } from "react-native"
import type { RoutineEntry, WeightUnit } from "@/types/domain"

export function confirmAction(
    title: string,
    message: string,
    action: string,
    onConfirm: () => void
) {
    if (Platform.OS === "web") {
        if (window.confirm(`${title}\n\n${message}`)) onConfirm()
        return
    }
    Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: action, style: "destructive", onPress: onConfirm },
    ])
}
export const errorText = (error: unknown) =>
    error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
export const fromKg = (value: number, unit: WeightUnit) =>
    unit === "lb" ? value * 2.2046226218 : value
export const toKg = (value: number, unit: WeightUnit) =>
    unit === "lb" ? value / 2.2046226218 : value
export const weightText = (value: number, unit: WeightUnit) =>
    Number(fromKg(value, unit).toFixed(2)).toString()
export function prescriptionText(entry: RoutineEntry, unit: WeightUnit) {
    return `${entry.setCount} sets · ${entry.repMin}–${entry.repMax} reps${entry.startingWeight === undefined ? "" : ` · ${weightText(entry.startingWeight, unit)} ${unit}`} · ${entry.restSeconds}s rest`
}
export function progressionText(entry: RoutineEntry, unit: WeightUnit) {
    if (entry.progressionMode === "manual")
        return "Manual: keep your targets until you change them."
    if (entry.progressionMode === "weight")
        return `When every prescribed set reaches ${entry.repMax} reps at its load, add ${weightText(entry.weightIncrement ?? 0, unit)} ${unit} and reset to ${entry.repMin} reps.`
    return `When every prescribed set meets its reps and load, add ${entry.repIncrement ?? 1} reps, up to ${entry.repMax}. At the cap, adjust manually.`
}

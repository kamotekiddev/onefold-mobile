import {
    Button as NativeButton,
    Host,
    TextInput as NativeInput,
    useNativeState,
} from "@expo/ui"
import { useEffect, useRef, type ReactNode } from "react"
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type KeyboardTypeOptions,
    type StyleProp,
    type TextStyle,
    type ViewStyle,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
    MaxContentWidth,
    Radii,
    Typography,
    usePalette,
} from "@/constants/theme"

export { usePalette } from "@/constants/theme"

export function AppText({
    children,
    variant = "body",
    color,
    style,
}: {
    children: ReactNode
    variant?: keyof typeof Typography
    color?: string
    style?: StyleProp<TextStyle>
}) {
    const p = usePalette()
    return (
        <Text
            accessibilityRole={
                variant === "title" || variant === "heading"
                    ? "header"
                    : undefined
            }
            style={[
                {
                    color: color ?? p.text,
                    fontSize: Typography[variant],
                    lineHeight: Typography[variant] * 1.4,
                    fontWeight:
                        variant === "title" || variant === "heading"
                            ? "700"
                            : "400",
                },
                style,
            ]}
        >
            {children}
        </Text>
    )
}

export function Screen({
    children,
    scroll = true,
    title,
    subtitle,
}: {
    children: ReactNode
    scroll?: boolean
    title?: string
    subtitle?: string
}) {
    const p = usePalette()
    const header =
        title || subtitle ? (
            <View style={styles.header}>
                {title ? <AppText variant="title">{title}</AppText> : null}
                {subtitle ? (
                    <AppText color={p.textSecondary}>{subtitle}</AppText>
                ) : null}
            </View>
        ) : null
    return (
        <SafeAreaView
            edges={["left", "right", "bottom"]}
            style={[styles.flex, { backgroundColor: p.background }]}
        >
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {scroll ? (
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.content}
                    >
                        {header}
                        {children}
                    </ScrollView>
                ) : (
                    <View style={[styles.content, styles.flex]}>
                        {header}
                        {children}
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export function Button({
    label,
    onPress,
    variant = "primary",
    disabled,
    loading,
}: {
    label: string
    onPress: () => void
    variant?: "primary" | "secondary" | "danger"
    disabled?: boolean
    loading?: boolean
}) {
    const p = usePalette()
    return (
        <Host
            matchContents={{ vertical: true }}
            seedColor={variant === "danger" ? p.danger : p.accent}
            style={styles.control}
            accessibilityLabel={label}
            accessibilityState={{
                disabled: disabled || loading,
                busy: loading,
            }}
        >
            <NativeButton
                label={loading ? `${label}…` : label}
                disabled={disabled || loading}
                onPress={onPress}
                variant={variant === "secondary" ? "outlined" : "filled"}
                style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: Radii.control,
                    width: "100%",
                }}
            />
        </Host>
    )
}

export function Field({
    label,
    value,
    onChangeText,
    error,
    keyboardType,
    secureTextEntry,
    placeholder,
    suffix,
}: {
    label: string
    value: string
    onChangeText: (value: string) => void
    error?: string
    keyboardType?: KeyboardTypeOptions
    secureTextEntry?: boolean
    placeholder?: string
    suffix?: string
}) {
    const p = usePalette()
    const nativeValue = useNativeState(value)
    const current = useRef(value)
    useEffect(() => {
        if (current.current !== value) {
            nativeValue.set(value)
            current.current = value
        }
    }, [value, nativeValue])
    return (
        <View style={styles.field}>
            <AppText variant="caption" style={{ fontWeight: "600" }}>
                {label}
                {suffix ? ` · ${suffix}` : ""}
            </AppText>
            <Host
                matchContents={{ vertical: true }}
                seedColor={p.accent}
                style={styles.control}
            >
                <NativeInput
                    value={nativeValue}
                    onChangeText={(next) => {
                        current.current = next
                        onChangeText(next)
                    }}
                    placeholder={placeholder ?? label}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={
                        keyboardType === "email-address" || secureTextEntry
                            ? "none"
                            : "sentences"
                    }
                    autoCorrect={false}
                    textStyle={{ fontSize: 17, color: p.text }}
                    placeholderTextColor={p.textSecondary}
                    cursorColor={p.accent}
                    style={{
                        width: "100%",
                        padding: 14,
                        borderRadius: Radii.control,
                        borderWidth: 1,
                        borderColor: error ? p.danger : p.border,
                        backgroundColor: p.surface,
                    }}
                />
            </Host>
            {error ? <ErrorMessage message={error} /> : null}
        </View>
    )
}

export function Card({
    children,
    style,
}: {
    children: ReactNode
    style?: StyleProp<ViewStyle>
}) {
    const p = usePalette()
    return (
        <View
            style={[
                styles.card,
                { backgroundColor: p.surface, borderColor: p.border },
                style,
            ]}
        >
            {children}
        </View>
    )
}
export function ErrorMessage({ message }: { message: string }) {
    const p = usePalette()
    return (
        <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: p.danger, fontSize: 14, lineHeight: 21 }}
        >
            {message}
        </Text>
    )
}
export function EmptyState({
    title,
    message,
    action,
}: {
    title: string
    message: string
    action?: ReactNode
}) {
    return (
        <Card>
            <AppText variant="heading">{title}</AppText>
            <AppText>{message}</AppText>
            {action}
        </Card>
    )
}
export function LoadingState({ label = "Loading…" }: { label?: string }) {
    const p = usePalette()
    return (
        <View style={styles.header}>
            <ActivityIndicator color={p.accent} accessibilityLabel={label} />
            <AppText>{label}</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: {
        padding: 20,
        gap: 16,
        width: "100%",
        maxWidth: MaxContentWidth,
        alignSelf: "center",
        flexGrow: 1,
    },
    header: { gap: 8, paddingVertical: 8 },
    card: { padding: 18, gap: 12, borderRadius: Radii.card, borderWidth: 1 },
    field: { gap: 6 },
    control: { width: "100%", minHeight: 48 },
})

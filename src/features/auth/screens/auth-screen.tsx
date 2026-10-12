import { router } from "expo-router"
import { useRef, useState } from "react"
import { Pressable, View } from "react-native"

import {
    AppText,
    Button,
    Card,
    ErrorMessage,
    Field,
    Screen,
} from "@/components/ui"
import { usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"

import { validateAuth, type AuthMode } from "../utils/validation"

const titles = {
    "sign-in": "Welcome back.",
    register: "Make room for progress.",
    "forgot-password": "Reset your password.",
}
export function AuthScreen({ mode }: { mode: AuthMode }) {
    const { services } = useApp()
    const p = usePalette()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmation, setConfirmation] = useState("")
    const [visible, setVisible] = useState(false)
    const [errors, setErrors] = useState<ReturnType<typeof validateAuth>>({})
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)
    const [sent, setSent] = useState(false)
    const pending = useRef(false)
    const submit = async () => {
        if (pending.current) return
        const validation = validateAuth(mode, email, password, confirmation)
        setErrors(validation)
        if (Object.keys(validation).length) return
        pending.current = true
        setBusy(true)
        setError("")
        try {
            if (mode === "forgot-password") {
                await services.auth.requestPasswordReset(email)
                setSent(true)
            } else if (mode === "register")
                await services.auth.register(email, password)
            else await services.auth.signIn(email, password)
            setPassword("")
            setConfirmation("")
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Unable to continue. Please retry."
            )
        } finally {
            pending.current = false
            setBusy(false)
        }
    }
    return (
        <Screen>
            <View style={{ paddingVertical: 24, gap: 12 }}>
                <AppText
                    color={p.accent}
                    style={{ fontWeight: "800", letterSpacing: 3 }}
                >
                    ONEFOLD / TRAINING
                </AppText>
                <AppText variant="title">{titles[mode]}</AppText>
                <AppText color={p.textSecondary}>
                    Simple routines. Focused sessions. Progress you can see.
                </AppText>
            </View>
            <Card style={{ backgroundColor: p.accentSoft }}>
                <AppText style={{ fontWeight: "700" }}>Demo mode</AppText>
                <AppText variant="caption">
                    Accounts are simulated. Use any valid email and a demo
                    password. No real registration or reset email occurs.
                    Passwords are never saved.
                </AppText>
            </Card>
            {sent ? (
                <Card>
                    <AppText variant="heading">Demo request received</AppText>
                    <AppText>
                        No email was sent. You can return and sign in with any
                        valid email and a nonempty demo password.
                    </AppText>
                    <Button
                        label="Back to sign in"
                        onPress={() => router.replace("/sign-in")}
                    />
                </Card>
            ) : (
                <Card>
                    <Field
                        label="Email address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        error={errors.email}
                        placeholder="you@example.com"
                    />
                    {mode !== "forgot-password" ? (
                        <>
                            <Field
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!visible}
                                error={errors.password}
                            />
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={
                                    visible ? "Hide password" : "Show password"
                                }
                                onPress={() => setVisible(!visible)}
                                style={{
                                    minHeight: 48,
                                    justifyContent: "center",
                                }}
                            >
                                <AppText color={p.accent}>
                                    {visible
                                        ? "Hide password"
                                        : "Show password"}
                                </AppText>
                            </Pressable>
                        </>
                    ) : null}
                    {mode === "register" ? (
                        <Field
                            label="Confirm password"
                            value={confirmation}
                            onChangeText={setConfirmation}
                            secureTextEntry={!visible}
                            error={errors.confirmation}
                        />
                    ) : null}
                    {error ? <ErrorMessage message={error} /> : null}
                    <Button
                        label={
                            mode === "sign-in"
                                ? "Sign in to demo"
                                : mode === "register"
                                  ? "Create demo account"
                                  : "Simulate password reset"
                        }
                        loading={busy}
                        onPress={() => void submit()}
                    />
                </Card>
            )}
            {mode === "sign-in" ? (
                <>
                    <Button
                        label="Create demo account"
                        variant="secondary"
                        onPress={() => router.push("/register")}
                    />
                    <Button
                        label="Forgot password?"
                        variant="secondary"
                        onPress={() => router.push("/forgot-password")}
                    />
                </>
            ) : (
                <Button
                    label="Back to sign in"
                    variant="secondary"
                    onPress={() => router.replace("/sign-in")}
                />
            )}
            <AppText variant="caption" color={p.textSecondary}>
                Your routines and workout history stay on this device.
            </AppText>
        </Screen>
    )
}

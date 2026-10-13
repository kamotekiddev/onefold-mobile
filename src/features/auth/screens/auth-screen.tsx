import { router } from "expo-router"
import { useRef, useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native"

import { AppText, Card, ErrorMessage, Screen } from "@/components/ui"
import { usePalette } from "@/constants/theme"
import { useApp } from "@/lib/app-provider"

import { validateAuth, type AuthMode } from "../utils/validation"

const titles = {
  "sign-in": "Welcome back.",
  register: "Make room for progress.",
  "forgot-password": "Reset your password.",
}

type Palette = ReturnType<typeof usePalette>

function SocialButton({
  label,
  mark,
  palette,
}: {
  label: string
  mark: string
  palette: Palette
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: true }}
      disabled
      style={styles.touchTarget}
    >
      <View
        style={[
          styles.socialButton,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <AppText style={styles.providerMark}>{mark}</AppText>
        <AppText style={styles.socialLabel}>{label}</AppText>
      </View>
    </Pressable>
  )
}

function AuthField({
  label,
  value,
  onChangeText,
  palette,
  error,
  keyboardType,
  placeholder,
  secureTextEntry,
  trailing,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  palette: Palette
  error?: string
  keyboardType?: KeyboardTypeOptions
  placeholder?: string
  secureTextEntry?: boolean
  trailing?: ReactNode
}) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" style={styles.fieldLabel}>
        {label}
      </AppText>
      <View style={styles.touchTarget}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={
            keyboardType === "email-address" || secureTextEntry
              ? "none"
              : "sentences"
          }
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={palette.textSecondary}
          secureTextEntry={secureTextEntry}
          selectionColor={palette.accent}
          style={[
            styles.input,
            trailing ? styles.inputWithTrailing : undefined,
            {
              backgroundColor: palette.surface,
              borderColor: error ? palette.danger : palette.border,
              color: palette.text,
            },
          ]}
          value={value}
        />
        {trailing}
      </View>
      {error ? <ErrorMessage message={error} /> : null}
    </View>
  )
}

function PrimaryAction({
  label,
  loading,
  onPress,
  palette,
}: {
  label: string
  loading: boolean
  onPress: () => void
  palette: Palette
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={styles.touchTarget}
    >
      <View
        style={[
          styles.primaryButton,
          { backgroundColor: palette.accent },
          loading ? styles.loading : undefined,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.accentText} />
        ) : (
          <AppText color={palette.accentText} style={styles.primaryLabel}>
            {label}
          </AppText>
        )}
      </View>
    </Pressable>
  )
}

function TextAction({
  label,
  onPress,
  palette,
}: {
  label: string
  onPress: () => void
  palette: Palette
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.textAction}
    >
      <AppText color={palette.accent} style={styles.textActionLabel}>
        {label}
      </AppText>
    </Pressable>
  )
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
        e instanceof Error ? e.message : "Unable to continue. Please retry."
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <Screen safeAreaEdges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <AppText color={p.accent} style={styles.eyebrow}>
            ONEFOLD / TRAINING
          </AppText>
          <AppText style={styles.title}>{titles[mode]}</AppText>
          <AppText color={p.textSecondary} style={styles.subtitle}>
            Simple routines. Focused sessions. Progress you can see.
          </AppText>
        </View>

        {mode === "sign-in" && !sent ? (
          <>
            <View style={styles.socialStack}>
              <SocialButton label="Continue with Google" mark="G" palette={p} />
              <SocialButton
                label="Continue with Apple"
                mark={Platform.OS === "ios" ? "" : "A"}
                palette={p}
              />
            </View>
            <View style={styles.divider}>
              <View
                style={[styles.dividerLine, { backgroundColor: p.border }]}
              />
              <AppText color={p.textSecondary} style={styles.dividerLabel}>
                or continue with email
              </AppText>
              <View
                style={[styles.dividerLine, { backgroundColor: p.border }]}
              />
            </View>
          </>
        ) : null}

        {sent ? (
          <Card>
            <AppText variant="heading">Demo request received</AppText>
            <AppText>
              No email was sent. You can return and sign in with any valid email
              and a nonempty demo password.
            </AppText>
            <PrimaryAction
              label="Back to sign in"
              loading={false}
              onPress={() => router.replace("/sign-in")}
              palette={p}
            />
          </Card>
        ) : (
          <View style={styles.form}>
            <AuthField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={errors.email}
              placeholder="you@example.com"
              palette={p}
            />
            {mode !== "forgot-password" ? (
              <AuthField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!visible}
                error={errors.password}
                palette={p}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      visible ? "Hide password" : "Show password"
                    }
                    onPress={() => setVisible(!visible)}
                    style={styles.fieldAction}
                  >
                    <AppText color={p.accent} style={styles.fieldActionLabel}>
                      {visible ? "Hide" : "Show"}
                    </AppText>
                  </Pressable>
                }
              />
            ) : null}
            {mode === "register" ? (
              <AuthField
                label="Confirm password"
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry={!visible}
                error={errors.confirmation}
                palette={p}
              />
            ) : null}
            {error ? <ErrorMessage message={error} /> : null}
            <PrimaryAction
              label={
                mode === "sign-in"
                  ? "Sign in to demo"
                  : mode === "register"
                    ? "Create demo account"
                    : "Simulate password reset"
              }
              loading={busy}
              onPress={() => void submit()}
              palette={p}
            />
          </View>
        )}

        {!sent ? (
          mode === "sign-in" ? (
            <View style={styles.secondaryActions}>
              <TextAction
                label="Create demo account"
                onPress={() => router.push("/register")}
                palette={p}
              />
              <TextAction
                label="Forgot password?"
                onPress={() => router.push("/forgot-password")}
                palette={p}
              />
            </View>
          ) : (
            <View style={styles.secondaryActions}>
              <TextAction
                label="Back to sign in"
                onPress={() => router.replace("/sign-in")}
                palette={p}
              />
            </View>
          )
        ) : null}

        <View
          style={[styles.demoNotice, { backgroundColor: p.backgroundElement }]}
        >
          <AppText variant="caption" style={styles.demoTitle}>
            Demo mode
          </AppText>
          <AppText
            variant="caption"
            color={p.textSecondary}
            style={styles.demoCopy}
          >
            Accounts are simulated. Use any valid email and a demo password. No
            real registration or reset email occurs. Passwords are never saved.
          </AppText>
        </View>

        <AppText
          variant="caption"
          color={p.textSecondary}
          style={styles.privacyNote}
        >
          Your routines and workout history stay on this device.
        </AppText>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    gap: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  hero: { gap: 8 },
  eyebrow: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 3,
  },
  title: { fontSize: 26, lineHeight: 34, fontWeight: "700" },
  subtitle: { fontSize: 15, lineHeight: 20 },
  socialStack: { gap: 8 },
  touchTarget: {
    width: "100%",
    minHeight: 48,
    justifyContent: "center",
  },
  socialButton: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  providerMark: { width: 18, fontSize: 18, lineHeight: 22, fontWeight: "700" },
  socialLabel: { fontSize: 15, lineHeight: 20 },
  divider: { flexDirection: "row", alignItems: "center", gap: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 12, lineHeight: 18 },
  form: { gap: 12 },
  field: { gap: 4 },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    width: "100%",
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 20,
  },
  inputWithTrailing: { paddingRight: 52 },
  fieldAction: {
    position: "absolute",
    right: 2,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldActionLabel: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  primaryButton: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryLabel: { fontSize: 16, lineHeight: 20, fontWeight: "600" },
  loading: { opacity: 0.75 },
  secondaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 16,
    rowGap: 4,
  },
  textAction: {
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textActionLabel: { fontSize: 14, lineHeight: 20 },
  demoNotice: { padding: 12, borderRadius: 14, gap: 6 },
  demoTitle: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  demoCopy: { fontSize: 12, lineHeight: 16 },
  privacyNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
})

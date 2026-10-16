export type AuthMode = "sign-in" | "register" | "forgot-password"
export function validateAuth(
  mode: AuthMode,
  email: string,
  password: string,
  confirmation: string
) {
  const errors: { email?: string; password?: string; confirmation?: string } =
    {}
  if (!email.trim()) errors.email = "Enter your email address."
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = "Enter a valid email address."
  if (mode !== "forgot-password" && !password)
    errors.password = "Enter your password."
  if (mode === "register" && password !== confirmation)
    errors.confirmation = "Passwords must match."
  return errors
}

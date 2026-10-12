import assert from "node:assert/strict"
import test from "node:test"
import { validateAuth } from "./validation"

test("sign in validates missing and malformed fields", () => {
  assert.ok(validateAuth("sign-in", "", "", "").email)
  assert.ok(validateAuth("sign-in", "not-an-email", "", "").password)
  assert.ok(validateAuth("sign-in", "not-an-email", "demo", "").email)
  assert.deepEqual(
    validateAuth("sign-in", " demo@example.com ", "demo", ""),
    {}
  )
})
test("registration requires matching passwords", () => {
  assert.ok(
    validateAuth("register", "demo@example.com", "demo", "different")
      .confirmation
  )
  assert.deepEqual(
    validateAuth("register", "demo@example.com", "demo", "demo"),
    {}
  )
})
test("reset validates only the email", () => {
  assert.deepEqual(
    validateAuth("forgot-password", "demo@example.com", "", ""),
    {}
  )
  assert.ok(validateAuth("forgot-password", "", "", "").email)
})

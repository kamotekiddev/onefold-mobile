import assert from "node:assert/strict"
import test from "node:test"
import { getDropIndex } from "./reorder"

test("drag reorder handles different row heights and scroll displacement", () => {
    const entries = [{ id: "a" }, { id: "b" }, { id: "c" }]
    const heights = { a: 100, b: 240, c: 150 }
    assert.equal(getDropIndex(entries, heights, "a", 0), 0)
    assert.equal(getDropIndex(entries, heights, "a", 180), 1)
    assert.equal(getDropIndex(entries, heights, "a", 400), 2)
    assert.equal(getDropIndex(entries, heights, "c", -400), 0)
    assert.equal(getDropIndex(entries, heights, "c", 900), 2)
})

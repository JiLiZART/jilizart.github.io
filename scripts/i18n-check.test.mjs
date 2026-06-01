import { test } from "node:test";
import assert from "node:assert/strict";
import { diffKeys } from "./i18n-check.mjs";

test("identical keysets -> no diffs", () => {
  const a = { x: "1", n: { y: "2" } };
  const b = { x: "a", n: { y: "b" } };
  assert.deepEqual(diffKeys(a, b), { missingInB: [], missingInA: [] });
});
test("missing nested key in b is reported", () => {
  const a = { n: { y: "2", z: "3" } };
  const b = { n: { y: "2" } };
  assert.deepEqual(diffKeys(a, b), { missingInB: ["n.z"], missingInA: [] });
});
test("extra key in b is reported as missingInA", () => {
  const a = { x: "1" };
  const b = { x: "1", extra: "2" };
  assert.deepEqual(diffKeys(a, b), { missingInB: [], missingInA: ["extra"] });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createTranslator } from "./translator.mjs";

const dict = { hero: { title: "Привет" }, greet: "Hi {{name}}" };
const enDict = { hero: { title: "Hello" }, only: "EN only", greet: "Hi {{name}}" };
const { t } = createTranslator({ dict, enDict });

test("nested dotted lookup", () => assert.equal(t("hero.title"), "Привет"));
test("interpolates {{vars}}", () => assert.equal(t("greet", { name: "Nik" }), "Hi Nik"));
test("missing in active dict falls back to enDict", () => assert.equal(t("only"), "EN only"));
test("missing everywhere returns the key", () => assert.equal(t("nope.here"), "nope.here"));
test("unknown interpolation var is left intact", () =>
  assert.equal(t("greet", {}), "Hi {{name}}"));
test("non-string node returns the key", () => assert.equal(t("hero"), "hero"));

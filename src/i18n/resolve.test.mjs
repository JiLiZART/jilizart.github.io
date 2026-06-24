import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLang } from "./resolve.mjs";

test("explicit SITE_LANG=ru wins", () => {
  assert.equal(resolveLang({ SITE_LANG: "ru" }), "ru");
});
test("explicit SITE_LANG=en wins", () => {
  assert.equal(resolveLang({ SITE_LANG: "en" }), "en");
});
test("SITE_LANG is case-insensitive and trimmed", () => {
  assert.equal(resolveLang({ SITE_LANG: " RU " }), "ru");
});
test("unknown SITE_LANG falls back to en", () => {
  assert.equal(resolveLang({ SITE_LANG: "fr" }), "en");
});
test("CF_PAGES_URL ru hint used when SITE_LANG unset", () => {
  assert.equal(resolveLang({ CF_PAGES_URL: "https://artkost-ru.pages.dev" }), "ru");
  assert.equal(resolveLang({ CF_PAGES_URL: "https://artkost.ru" }), "ru");
});
test("CF_PAGES_URL without ru hint -> en", () => {
  assert.equal(resolveLang({ CF_PAGES_URL: "https://artkost.dev" }), "en");
  assert.equal(resolveLang({ CF_PAGES_URL: "https://truth.pages.dev" }), "en");
});
test("empty env -> en", () => {
  assert.equal(resolveLang({}), "en");
});
test("explicit SITE_LANG beats CF_PAGES_URL", () => {
  assert.equal(resolveLang({ SITE_LANG: "en", CF_PAGES_URL: "https://artkost.ru" }), "en");
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { JOURNAL_LIMITS, validateJournalEntry } from "./journal-limits.mjs";
const source = await fs.readFile(new URL("../integrated-app.js", import.meta.url), "utf8");
const start = source.indexOf("  function journalEntryBytes(");
const end = source.indexOf("  function buildJournalEntry(", start);
assert(start >= 0 && end > start);
const functions = vm.runInNewContext(source.slice(start, end) + "\n({journalEntryBytes,validateJournalFiles});", { TextEncoder, journalLimits: JOURNAL_LIMITS });
const photo = "data:image/png;base64,iVBORw0KGgo=";

test("six photos and legacy text-only journals remain valid", () => {
  assert.equal(validateJournalEntry({ summary: "旧游记" }), null);
  assert.equal(validateJournalEntry({ photos: Array(6).fill(photo) }), null);
  assert.equal(validateJournalEntry({ photos: Array(7).fill(photo) }).code, "JOURNAL_PHOTOS_TOO_MANY");
  assert.equal(validateJournalEntry({ photos: {} }).status, 400);
});

test("one MB is measured in UTF8 bytes with an inclusive boundary", () => {
  const overhead = Buffer.byteLength(JSON.stringify({ summary: "", updatedBy: "LL" }), "utf8");
  const exact = { summary: "a".repeat(JOURNAL_LIMITS.max_entry_bytes - overhead), updatedBy: "LL" };
  assert.equal(validateJournalEntry(exact), null);
  assert.equal(validateJournalEntry({ ...exact, summary: exact.summary + "a" }).code, "JOURNAL_TOO_LARGE");
  const chinese = { summary: "旅".repeat(400000) };
  assert(JSON.stringify(chinese).length < JOURNAL_LIMITS.max_entry_bytes);
  assert.equal(validateJournalEntry(chinese).status, 413);
  assert.equal(functions.journalEntryBytes(chinese), Buffer.byteLength(JSON.stringify(chinese), "utf8"));
});

test("original file limits reject oversize and non-images without silent truncation", () => {
  const file = { name: "test.jpg", type: "image/jpeg", size: JOURNAL_LIMITS.max_original_photo_bytes };
  assert.equal(functions.validateJournalFiles([file]), "");
  assert(functions.validateJournalFiles([{ ...file, size: file.size + 1 }]).includes("不能超过"));
  assert(functions.validateJournalFiles(Array(7).fill(file)).includes("你选择了7张"));
  assert(functions.validateJournalFiles([{ ...file, type: "text/plain", name: "note.txt" }]).includes("不是图片"));
  assert.equal(functions.validateJournalFiles([]), "");
});

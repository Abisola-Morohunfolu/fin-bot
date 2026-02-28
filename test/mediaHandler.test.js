import test from "node:test";
import assert from "node:assert/strict";
import {
  __resetPendingForTest,
  __setPendingForTest,
  buildPendingCard,
  clearPendingFor,
  getPending,
  hasPending,
  updatePendingField
} from "../src/bot/mediaHandler.js";

const PHONE = "2348012345678@c.us";

const basePending = {
  type: "expense",
  amount: 4500,
  currency: "NGN",
  merchant: "Shoprite",
  category: "shopping",
  date: "2026-02-27",
  description: "Groceries",
  confidence: "high"
};

test.beforeEach(() => {
  __resetPendingForTest();
});

test.after(() => {
  __resetPendingForTest();
});

test("stores and reads pending transaction state", () => {
  __setPendingForTest(PHONE, basePending);
  assert.equal(hasPending(PHONE), true);
  assert.deepEqual(getPending(PHONE), basePending);
});

test("updates editable fields and keeps pending state", () => {
  __setPendingForTest(PHONE, basePending);
  const result = updatePendingField(PHONE, "category", "food");

  assert.equal(result.error, undefined);
  assert.equal(result.data.category, "food");
  assert.equal(getPending(PHONE).category, "food");
});

test("validates amount edits", () => {
  __setPendingForTest(PHONE, basePending);

  const bad = updatePendingField(PHONE, "amount", "abc");
  assert.equal(bad.error, "Amount must be a valid positive number.");

  const good = updatePendingField(PHONE, "amount", "6,000");
  assert.equal(good.error, undefined);
  assert.equal(good.data.amount, 6000);
});

test("returns error for unknown fields", () => {
  __setPendingForTest(PHONE, basePending);
  const result = updatePendingField(PHONE, "foo", "bar");
  assert.equal(result.error, "Unknown field: foo");
});

test("builds confirmation card and clears pending state", () => {
  __setPendingForTest(PHONE, basePending);
  const card = buildPendingCard(PHONE);
  assert.match(card, /Please confirm this transaction/);
  assert.match(card, /Category: shopping/);

  clearPendingFor(PHONE);
  assert.equal(hasPending(PHONE), false);
  assert.equal(buildPendingCard(PHONE), null);
});

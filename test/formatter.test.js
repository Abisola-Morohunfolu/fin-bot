import test from "node:test";
import assert from "node:assert/strict";
import { formatCurrency, formatSummary } from "../src/utils/formatter.js";

test("formats NGN currency", () => {
  assert.equal(formatCurrency(4500, "NGN"), "₦4,500");
});

test("formats USD currency", () => {
  assert.equal(formatCurrency(4500, "USD"), "$4,500");
});

test("formats summary output", () => {
  const summary = formatSummary({
    month: "2026-02",
    income: 100000,
    expenses: 4500,
    balance: 95500
  });

  assert.match(summary, /Summary \(2026-02\)/);
  assert.match(summary, /Income: ₦100,000/);
  assert.match(summary, /Expenses: ₦4,500/);
  assert.match(summary, /Balance: ₦95,500/);
});

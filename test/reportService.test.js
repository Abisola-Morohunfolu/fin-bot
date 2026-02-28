import test from "node:test";
import assert from "node:assert/strict";
import { buildSummaryMessage } from "../src/services/reportService.js";

test("builds summary message with budget progress bars", () => {
  const summary = {
    month: "2026-02",
    income: 320000,
    expenses: 184500,
    balance: 135500,
    categories: [
      { category: "food", amount: 42000 },
      { category: "transport", amount: 31000 },
      { category: "rent", amount: 80000 }
    ]
  };

  const budgets = [
    { category: "food", amount: 50000, month: "2026-02" },
    { category: "transport", amount: 50000, month: "2026-02" },
    { category: "rent", amount: 80000, month: "2026-02" }
  ];

  const message = buildSummaryMessage(summary, budgets);
  assert.match(message, /February 2026/);
  assert.match(message, /Income:\s+₦320,000/);
  assert.match(message, /food/);
  assert.match(message, /\[.*\]/);
  assert.match(message, /⚠️ at limit/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { INTENTS, parseIntent } from "../src/nlp/intentParser.js";

test("parses expense command", () => {
  const result = parseIntent("spent 4,500 on groceries");
  assert.equal(result.intent, INTENTS.ADD_EXPENSE);
  assert.equal(result.amount, 4500);
  assert.equal(result.category, "groceries");
});

test("parses income command", () => {
  const result = parseIntent("earned 100000 salary");
  assert.equal(result.intent, INTENTS.ADD_INCOME);
  assert.equal(result.amount, 100000);
  assert.equal(result.description, "salary");
});

test("parses utility commands", () => {
  assert.equal(parseIntent("balance").intent, INTENTS.GET_BALANCE);
  assert.equal(parseIntent("summary").intent, INTENTS.GET_SUMMARY);
  assert.equal(parseIntent("summary last month").monthOffset, -1);
  assert.equal(parseIntent("budgets").intent, INTENTS.GET_BUDGETS);
  assert.equal(parseIntent("categories").intent, INTENTS.LIST_CATEGORIES);
  assert.equal(parseIntent("top 5").intent, INTENTS.GET_TOP);
  assert.equal(parseIntent("/help").intent, INTENTS.HELP);
});

test("parses budget command", () => {
  const result = parseIntent("budget food 30000");
  assert.equal(result.intent, INTENTS.SET_BUDGET);
  assert.equal(result.category, "food");
  assert.equal(result.amount, 30000);
});

test("returns UNKNOWN for unsupported command", () => {
  assert.equal(parseIntent("hello there").intent, INTENTS.UNKNOWN);
});

test("parses create category command", () => {
  const result = parseIntent("category add fuel");
  assert.equal(result.intent, INTENTS.CREATE_CATEGORY);
  assert.equal(result.name, "fuel");
});

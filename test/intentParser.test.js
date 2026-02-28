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
  assert.equal(parseIntent("/help").intent, INTENTS.HELP);
});

test("returns UNKNOWN for unsupported command", () => {
  assert.equal(parseIntent("hello there").intent, INTENTS.UNKNOWN);
});

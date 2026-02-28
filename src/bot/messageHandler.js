import { parseIntent, INTENTS } from "../nlp/intentParser.js";
import {
  addTransaction,
  getBalance,
  getMonthlySummary
} from "../services/financeService.js";
import { formatCurrency, formatSummary } from "../utils/formatter.js";
import {
  buildPendingCard,
  clearPendingFor,
  getPending,
  handleMedia,
  hasPending,
  updatePendingField
} from "./mediaHandler.js";

function helpMessage() {
  return [
    "Supported commands:",
    "- spent <amount> on <category>",
    "- earned <amount> <description>",
    "- balance",
    "- summary or report",
    "- help"
  ].join("\n");
}

export async function handleMessage(msg) {
  if (msg.hasMedia) {
    try {
      return await handleMedia(msg);
    } catch (error) {
      return `Could not process image: ${error.message}`;
    }
  }

  const from = msg.from;
  const text = (msg.body || "").trim();
  const lower = text.toLowerCase();

  if (hasPending(from)) {
    if (lower === "yes") {
      const pending = getPending(from);
      const created = await addTransaction({
        type: pending.type,
        amount: pending.amount,
        category: pending.category,
        description: pending.description,
        currency: pending.currency,
        source: "image"
      });
      clearPendingFor(from);
      return `✅ Saved: ${pending.type === "expense" ? "-" : "+"}${formatCurrency(created.amount, created.currency)} (${created.category})`;
    }

    if (lower === "no") {
      clearPendingFor(from);
      return "❌ Discarded pending transaction.";
    }

    const editMatch = text.match(/^edit\s+(\w+)\s+(.+)$/i);
    if (editMatch) {
      const field = editMatch[1];
      const value = editMatch[2].trim();
      const result = updatePendingField(from, field, value);
      if (result?.error) {
        return `⚠️ ${result.error}`;
      }
      const card = buildPendingCard(from);
      return card || "No pending transaction found.";
    }

    return "Pending transaction detected. Reply with `yes`, `no`, or `edit [field] [value]`.";
  }

  const parsed = parseIntent(msg.body);

  switch (parsed.intent) {
    case INTENTS.ADD_EXPENSE: {
      const created = await addTransaction({
        type: "expense",
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description
      });
      return `✅ Saved: -${formatCurrency(created.amount, created.currency)} (${created.category})`;
    }

    case INTENTS.ADD_INCOME: {
      const created = await addTransaction({
        type: "income",
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description
      });
      return `✅ Saved: +${formatCurrency(created.amount, created.currency)} (${created.description || created.category})`;
    }

    case INTENTS.GET_BALANCE: {
      const data = await getBalance();
      return [
        `Balance: ${formatCurrency(data.balance)}`,
        `Income: ${formatCurrency(data.income)}`,
        `Expenses: ${formatCurrency(data.expenses)}`
      ].join("\n");
    }

    case INTENTS.GET_SUMMARY: {
      const summary = await getMonthlySummary();
      return formatSummary(summary);
    }

    case INTENTS.HELP:
      return helpMessage();

    case INTENTS.UNKNOWN:
    default:
      return "I didn't understand that. Send help for commands.";
  }
}

import { parseIntent, INTENTS } from "../nlp/intentParser.js";
import {
  addTransaction,
  getBalance,
  getMonthlySummary
} from "../services/financeService.js";
import { formatCurrency, formatSummary } from "../utils/formatter.js";

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

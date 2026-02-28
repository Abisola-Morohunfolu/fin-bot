import { parseIntent, INTENTS } from "../nlp/intentParser.js";
import {
  addTransaction,
  getBalance,
  getCurrentMonthKey,
  setBudget
} from "../services/financeService.js";
import { formatCurrency } from "../utils/formatter.js";
import {
  buildSummaryMessage,
  getBudgets,
  getMonthlySummary,
  getTopExpenses
} from "../services/reportService.js";
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
    "- budget <category> <amount>",
    "- budgets",
    "- balance",
    "- summary | summary last month",
    "- top <n>",
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
      const { transaction, budgetAlert } = await addTransaction({
        type: pending.type,
        amount: pending.amount,
        category: pending.category,
        description: pending.description,
        currency: pending.currency,
        source: "image"
      });
      clearPendingFor(from);
      const saved = `✅ Saved: ${pending.type === "expense" ? "-" : "+"}${formatCurrency(transaction.amount, transaction.currency)} (${transaction.category})`;
      return budgetAlert ? `${saved}\n${budgetAlert}` : saved;
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
      const { transaction, budgetAlert } = await addTransaction({
        type: "expense",
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description
      });
      const saved = `✅ Saved: -${formatCurrency(transaction.amount, transaction.currency)} (${transaction.category})`;
      return budgetAlert ? `${saved}\n${budgetAlert}` : saved;
    }

    case INTENTS.ADD_INCOME: {
      const { transaction } = await addTransaction({
        type: "income",
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description
      });
      return `✅ Saved: +${formatCurrency(transaction.amount, transaction.currency)} (${transaction.description || transaction.category})`;
    }

    case INTENTS.SET_BUDGET: {
      const month = getCurrentMonthKey();
      const budget = await setBudget(parsed.category, parsed.amount, month);
      return `✅ Budget set: ${budget.category} ${formatCurrency(budget.amount)} for ${budget.month}`;
    }

    case INTENTS.GET_BUDGETS: {
      const month = getCurrentMonthKey();
      const budgets = await getBudgets(month);
      if (budgets.length === 0) {
        return `No budgets set for ${month}.`;
      }
      return [
        `Budgets (${month}):`,
        ...budgets.map((item) => `- ${item.category}: ${formatCurrency(item.amount)}`)
      ].join("\n");
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
      const month = getCurrentMonthKey(parsed.monthOffset || 0);
      const [summary, budgets] = await Promise.all([
        getMonthlySummary(month),
        getBudgets(month)
      ]);
      return buildSummaryMessage(summary, budgets);
    }

    case INTENTS.GET_TOP: {
      const month = getCurrentMonthKey();
      const top = await getTopExpenses(parsed.limit || 5, month);
      if (top.length === 0) {
        return "No expenses found for this month.";
      }
      return [
        `Top ${top.length} expenses (${month}):`,
        ...top.map((item, idx) => `${idx + 1}. ${formatCurrency(item.amount, item.currency)} - ${item.category}${item.description ? ` (${item.description})` : ""}`)
      ].join("\n");
    }

    case INTENTS.HELP:
      return helpMessage();

    case INTENTS.UNKNOWN:
    default:
      return "I didn't understand that. Send help for commands.";
  }
}

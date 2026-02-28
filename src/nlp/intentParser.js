export const INTENTS = {
  ADD_EXPENSE: "ADD_EXPENSE",
  ADD_INCOME: "ADD_INCOME",
  SET_BUDGET: "SET_BUDGET",
  GET_BUDGETS: "GET_BUDGETS",
  GET_BALANCE: "GET_BALANCE",
  GET_SUMMARY: "GET_SUMMARY",
  GET_TOP: "GET_TOP",
  HELP: "HELP",
  UNKNOWN: "UNKNOWN"
};

function toAmount(value) {
  return Number(value.replace(/,/g, ""));
}

export function parseIntent(input = "") {
  const text = input.trim();
  const lower = text.toLowerCase();

  if (lower === "help" || lower === "/help") {
    return { intent: INTENTS.HELP };
  }

  if (lower === "balance") {
    return { intent: INTENTS.GET_BALANCE };
  }

  if (lower === "budgets") {
    return { intent: INTENTS.GET_BUDGETS };
  }

  const budgetMatch = lower.match(/^budget\s+([a-z][a-z0-9\s-]{1,50})\s+([\d,.]+)$/i);
  if (budgetMatch) {
    const category = budgetMatch[1].trim();
    const amount = toAmount(budgetMatch[2]);
    if (!Number.isNaN(amount) && amount > 0) {
      return { intent: INTENTS.SET_BUDGET, category, amount };
    }
  }

  const topMatch = lower.match(/^top\s+(\d{1,2})$/i);
  if (topMatch) {
    return { intent: INTENTS.GET_TOP, limit: Number(topMatch[1]) };
  }

  if (lower === "summary" || lower === "report") {
    return { intent: INTENTS.GET_SUMMARY };
  }

  if (lower === "summary last month" || lower === "report last month") {
    return { intent: INTENTS.GET_SUMMARY, monthOffset: -1 };
  }

  const expenseMatch = lower.match(
    /^spent\s+([\d,.]+)\s+on\s+([a-z][a-z0-9\s-]{1,50})$/i
  );
  if (expenseMatch) {
    const amount = toAmount(expenseMatch[1]);
    const category = expenseMatch[2].trim();
    if (!Number.isNaN(amount) && amount > 0) {
      return {
        intent: INTENTS.ADD_EXPENSE,
        amount,
        category,
        description: category
      };
    }
  }

  const incomeMatch = lower.match(
    /^earned\s+([\d,.]+)\s+([a-z][a-z0-9\s-]{1,50})$/i
  );
  if (incomeMatch) {
    const amount = toAmount(incomeMatch[1]);
    const description = incomeMatch[2].trim();
    if (!Number.isNaN(amount) && amount > 0) {
      return {
        intent: INTENTS.ADD_INCOME,
        amount,
        category: "income",
        description
      };
    }
  }

  return { intent: INTENTS.UNKNOWN };
}

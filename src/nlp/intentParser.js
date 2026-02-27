export const INTENTS = {
  ADD_EXPENSE: "ADD_EXPENSE",
  ADD_INCOME: "ADD_INCOME",
  GET_BALANCE: "GET_BALANCE",
  GET_SUMMARY: "GET_SUMMARY",
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

  if (lower === "summary" || lower === "report") {
    return { intent: INTENTS.GET_SUMMARY };
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

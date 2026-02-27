function currencyToLocale(currency) {
  if (currency === "NGN") {
    return "en-NG";
  }
  return "en-US";
}

export function formatCurrency(amount, currency = process.env.CURRENCY || "NGN") {
  return new Intl.NumberFormat(currencyToLocale(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatSummary(data) {
  return [
    `Summary (${data.month})`,
    `Income: ${formatCurrency(data.income)}`,
    `Expenses: ${formatCurrency(data.expenses)}`,
    `Balance: ${formatCurrency(data.balance)}`
  ].join("\n");
}

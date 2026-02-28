import { prisma } from "../db/prismaClient.js";
import { formatCurrency } from "../utils/formatter.js";
import { getCurrentMonthKey, getBudgets as getBudgetsFromFinance } from "./financeService.js";

function getMonthRange(month) {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
  return { start, end };
}

function progressBar(percent, size = 10) {
  const capped = Math.max(0, Math.min(percent, 100));
  const filled = Math.round((capped / 100) * size);
  return `[${"█".repeat(filled)}${"░".repeat(size - filled)}]`;
}

function monthName(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

export async function getMonthlySummary(month = getCurrentMonthKey()) {
  const { start, end } = getMonthRange(month);

  const [rows, incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        type: "expense",
        createdAt: { gte: start, lt: end }
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } }
    }),
    prisma.transaction.aggregate({
      where: {
        type: "income",
        createdAt: { gte: start, lt: end }
      },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: {
        type: "expense",
        createdAt: { gte: start, lt: end }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    month,
    income: incomeAgg._sum.amount || 0,
    expenses: expenseAgg._sum.amount || 0,
    balance: (incomeAgg._sum.amount || 0) - (expenseAgg._sum.amount || 0),
    categories: rows.map((row) => ({
      category: row.category,
      amount: row._sum.amount || 0
    }))
  };
}

export async function getBudgets(month = getCurrentMonthKey()) {
  return getBudgetsFromFinance(month);
}

export function buildSummaryMessage(summary, budgets) {
  const budgetByCategory = new Map(
    budgets.map((item) => [item.category.toLowerCase(), item.amount])
  );

  const lines = [
    `📊 ${monthName(summary.month)}`,
    "────────────────────",
    `Income:    ${formatCurrency(summary.income)}`,
    `Expenses:  ${formatCurrency(summary.expenses)}`,
    `Balance:   ${formatCurrency(summary.balance)}`,
    "",
    "By category:"
  ];

  if (summary.categories.length === 0) {
    lines.push("No expenses recorded for this month.");
    return lines.join("\n");
  }

  for (const item of summary.categories) {
    const budget = budgetByCategory.get(item.category.toLowerCase());
    if (!budget) {
      lines.push(`${item.category}: ${formatCurrency(item.amount)}`);
      continue;
    }

    const percent = budget > 0 ? (item.amount / budget) * 100 : 0;
    const alert = percent >= 100 ? " ⚠️ at limit" : "";
    lines.push(
      `${item.category.padEnd(12, " ")} ${formatCurrency(item.amount)} ${progressBar(percent)} ${Math.round(percent)}% of ${formatCurrency(budget)} budget${alert}`
    );
  }

  return lines.join("\n");
}

export async function getTopExpenses(limit = 5, month = getCurrentMonthKey()) {
  const { start, end } = getMonthRange(month);
  return prisma.transaction.findMany({
    where: {
      type: "expense",
      createdAt: { gte: start, lt: end }
    },
    orderBy: { amount: "desc" },
    take: limit
  });
}

import { prisma } from "../db/prismaClient.js";
import { formatCurrency } from "../utils/formatter.js";

function getMonthRange(month) {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
  return { start, end };
}

export function getCurrentMonthKey(offsetMonths = 0) {
  const now = new Date();
  const shifted = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function getBudgetAlertForTransaction(transaction) {
  if (transaction.type !== "expense") {
    return null;
  }

  const month = getCurrentMonthKey();
  const budget = await prisma.budget.findUnique({
    where: {
      category_month: {
        category: transaction.category,
        month
      }
    }
  });

  if (!budget) {
    return null;
  }

  const { start, end } = getMonthRange(month);
  const spent = await prisma.transaction.aggregate({
    where: {
      type: "expense",
      category: transaction.category,
      createdAt: { gte: start, lt: end }
    },
    _sum: { amount: true }
  });

  const totalSpent = spent._sum.amount || 0;
  if (totalSpent <= budget.amount) {
    return null;
  }

  return `⚠️ You have exceeded your ${transaction.category} budget (${formatCurrency(budget.amount)})`;
}

export async function addTransaction({
  type,
  amount,
  category,
  description,
  currency = process.env.CURRENCY || "NGN",
  source = "text",
  rawImageUrl = null
}) {
  const transaction = await prisma.transaction.create({
    data: {
      type,
      amount,
      currency,
      category,
      description,
      source,
      rawImageUrl
    }
  });

  const budgetAlert = await getBudgetAlertForTransaction(transaction);
  return { transaction, budgetAlert };
}

export async function getBalance() {
  const [expenseAgg, incomeAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: "expense" },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { type: "income" },
      _sum: { amount: true }
    })
  ]);

  const expenses = expenseAgg._sum.amount || 0;
  const income = incomeAgg._sum.amount || 0;

  return {
    income,
    expenses,
    balance: income - expenses
  };
}

export async function getMonthlySummary(month = getCurrentMonthKey()) {
  const { start, end } = getMonthRange(month);

  const [expenses, income] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        type: "expense",
        createdAt: { gte: start, lt: end }
      },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: {
        type: "income",
        createdAt: { gte: start, lt: end }
      },
      _sum: { amount: true }
    })
  ]);

  const totalExpenses = expenses._sum.amount || 0;
  const totalIncome = income._sum.amount || 0;

  return {
    month,
    income: totalIncome,
    expenses: totalExpenses,
    balance: totalIncome - totalExpenses
  };
}

export async function setBudget(category, amount, month = getCurrentMonthKey()) {
  return prisma.budget.upsert({
    where: {
      category_month: { category, month }
    },
    create: { category, amount, month },
    update: { amount }
  });
}

export async function getBudgets(month = getCurrentMonthKey()) {
  return prisma.budget.findMany({
    where: { month },
    orderBy: { category: "asc" }
  });
}

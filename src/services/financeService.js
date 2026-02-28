import { prisma } from "../db/prismaClient.js";
import { formatCurrency } from "../utils/formatter.js";
import { resolveOrCreateCategory } from "./categoryService.js";

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
      categoryId_month: {
        categoryId: transaction.categoryId,
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
      categoryId: transaction.categoryId,
      createdAt: { gte: start, lt: end }
    },
    _sum: { amount: true }
  });

  const totalSpent = spent._sum.amount || 0;
  if (totalSpent <= budget.amount) {
    return null;
  }

  return `⚠️ You have exceeded your ${transaction.category.name} budget (${formatCurrency(budget.amount)})`;
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
  const categoryRecord = await resolveOrCreateCategory(category);
  const transaction = await prisma.transaction.create({
    data: {
      type,
      amount,
      currency,
      categoryId: categoryRecord.id,
      description,
      source,
      rawImageUrl
    },
    include: {
      category: true
    }
  });

  const budgetAlert = await getBudgetAlertForTransaction(transaction);
  return {
    transaction: {
      ...transaction,
      category: transaction.category.name
    },
    budgetAlert
  };
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
  const categoryRecord = await resolveOrCreateCategory(category);
  return prisma.budget.upsert({
    where: {
      categoryId_month: { categoryId: categoryRecord.id, month }
    },
    create: { categoryId: categoryRecord.id, amount, month },
    update: { amount },
    include: { category: true }
  });
}

export async function getBudgets(month = getCurrentMonthKey()) {
  const budgets = await prisma.budget.findMany({
    where: { month },
    include: { category: true },
    orderBy: { category: { name: "asc" } }
  });
  return budgets.map((budget) => ({
    id: budget.id,
    month: budget.month,
    amount: budget.amount,
    category: budget.category.name
  }));
}

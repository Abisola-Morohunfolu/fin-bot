import { prisma } from "../db/prismaClient.js";

function getMonthRange(month) {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));
  return { start, end };
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
  return prisma.transaction.create({
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

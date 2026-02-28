import { prisma } from "../db/prismaClient.js";

const DEFAULT_CATEGORIES = [
  "food",
  "transport",
  "utilities",
  "entertainment",
  "shopping",
  "health",
  "rent",
  "other"
];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureDefaultCategories() {
  for (const name of DEFAULT_CATEGORIES) {
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { slug },
      update: { isDefault: true },
      create: { name, slug, isDefault: true }
    });
  }
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }]
  });
}

export async function createCategory(name) {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Category name cannot be empty.");
  }

  const slug = slugify(normalized);
  if (!slug) {
    throw new Error("Category name is invalid.");
  }

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return existing;
  }

  return prisma.category.create({
    data: { name: normalized, slug, isDefault: false }
  });
}

export async function resolveOrCreateCategory(name) {
  return createCategory(name);
}

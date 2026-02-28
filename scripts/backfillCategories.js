import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

function normalize(value) {
  return value.trim().toLowerCase();
}

function quote(value) {
  return value.replace(/'/g, "''");
}

async function tableColumns(tableName) {
  return prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
}

async function hasColumn(tableName, columnName) {
  const columns = await tableColumns(tableName);
  return columns.some((col) => col.name === columnName);
}

async function createCategoryTableIfMissing() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "ownerPhone" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");`
  );
}

async function ensureCategoryIdColumns() {
  if (!(await hasColumn("Transaction", "categoryId"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Transaction" ADD COLUMN "categoryId" INTEGER;`
    );
  }
  if (!(await hasColumn("Budget", "categoryId"))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Budget" ADD COLUMN "categoryId" INTEGER;`
    );
  }
}

async function loadExistingCategoryMap() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id", "name", "slug" FROM "Category";`
  );
  const byName = new Map();
  const usedSlugs = new Set();
  for (const row of rows) {
    byName.set(normalize(row.name), row.id);
    usedSlugs.add(row.slug);
  }
  return { byName, usedSlugs };
}

function uniqueSlug(base, usedSlugs) {
  let candidate = base || "category";
  let idx = 1;
  while (usedSlugs.has(candidate)) {
    candidate = `${base || "category"}-${idx++}`;
  }
  usedSlugs.add(candidate);
  return candidate;
}

async function collectLegacyCategoryNames() {
  const txRows = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT TRIM("category") AS category
    FROM "Transaction"
    WHERE "category" IS NOT NULL AND TRIM("category") != '';
  `);
  const budgetRows = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT TRIM("category") AS category
    FROM "Budget"
    WHERE "category" IS NOT NULL AND TRIM("category") != '';
  `);

  const names = new Set(DEFAULT_CATEGORIES);
  for (const row of [...txRows, ...budgetRows]) {
    if (row.category) {
      names.add(row.category.trim());
    }
  }
  return [...names];
}

async function upsertCategories(names) {
  const { byName, usedSlugs } = await loadExistingCategoryMap();

  for (const originalName of names) {
    const name = originalName.trim();
    if (!name) {
      continue;
    }
    const key = normalize(name);
    if (byName.has(key)) {
      continue;
    }

    const base = slugify(name);
    const slug = uniqueSlug(base, usedSlugs);
    const isDefault = DEFAULT_CATEGORIES.includes(key) ? 1 : 0;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Category" ("name", "slug", "isDefault") VALUES ('${quote(name)}', '${quote(slug)}', ${isDefault});`
    );
  }
}

async function backfillCategoryIds() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id", "name" FROM "Category";`
  );

  for (const row of rows) {
    const key = normalize(row.name);
    await prisma.$executeRawUnsafe(
      `UPDATE "Transaction" SET "categoryId" = ${row.id} WHERE "categoryId" IS NULL AND lower(trim("category")) = '${quote(key)}';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Budget" SET "categoryId" = ${row.id} WHERE "categoryId" IS NULL AND lower(trim("category")) = '${quote(key)}';`
    );
  }

  const other = await prisma.$queryRawUnsafe(
    `SELECT "id" FROM "Category" WHERE lower("name") = 'other' LIMIT 1;`
  );
  if (other.length > 0) {
    const otherId = other[0].id;
    await prisma.$executeRawUnsafe(
      `UPDATE "Transaction" SET "categoryId" = ${otherId} WHERE "categoryId" IS NULL;`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Budget" SET "categoryId" = ${otherId} WHERE "categoryId" IS NULL;`
    );
  }
}

async function rebuildTablesWithConstraints() {
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=OFF;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Transaction_new" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "type" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'NGN',
      "categoryId" INTEGER NOT NULL,
      "description" TEXT,
      "source" TEXT NOT NULL DEFAULT 'text',
      "rawImageUrl" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Transaction_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Transaction_new" ("id", "type", "amount", "currency", "categoryId", "description", "source", "rawImageUrl", "createdAt")
    SELECT "id", "type", "amount", "currency", "categoryId", "description", "source", "rawImageUrl", "createdAt"
    FROM "Transaction";
  `);

  await prisma.$executeRawUnsafe(`DROP TABLE "Transaction";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Transaction_new" RENAME TO "Transaction";`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Budget_new" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "categoryId" INTEGER NOT NULL,
      "amount" REAL NOT NULL,
      "month" TEXT NOT NULL,
      CONSTRAINT "Budget_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Budget_new" ("id", "categoryId", "amount", "month")
    SELECT "id", "categoryId", "amount", "month"
    FROM "Budget";
  `);

  await prisma.$executeRawUnsafe(`DROP TABLE "Budget";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Budget_new" RENAME TO "Budget";`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Budget_categoryId_month_key" ON "Budget"("categoryId", "month");`
  );

  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=ON;`);
}

async function main() {
  const hasLegacyTransactionCategory = await hasColumn("Transaction", "category");
  const hasLegacyBudgetCategory = await hasColumn("Budget", "category");

  if (!hasLegacyTransactionCategory && !hasLegacyBudgetCategory) {
    console.log("Legacy category columns not found. Backfill script already applied.");
    return;
  }

  await createCategoryTableIfMissing();
  await ensureCategoryIdColumns();

  const names = await collectLegacyCategoryNames();
  await upsertCategories(names);
  await backfillCategoryIds();
  await rebuildTablesWithConstraints();

  console.log("Category migration complete.");
}

main()
  .catch((error) => {
    console.error("Category migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

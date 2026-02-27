import { PrismaClient } from "@prisma/client";

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!globalThis.__prismaClient) {
    globalThis.__prismaClient = new PrismaClient();
  }
  prisma = globalThis.__prismaClient;
}

export { prisma };

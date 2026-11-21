// Shared DB guard for content-pass scripts: DATABASE_URL must be exported
// explicitly, and any database other than the local dev copy needs --prod.
import { PrismaClient } from "@prisma/client";

const DEV_DATABASE = "wellbotany_dev";

export function connect(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Export DATABASE_URL (dev database) first");
  const database = url.split("?")[0].split("/").pop();
  if (database !== DEV_DATABASE && !process.argv.includes("--prod")) {
    throw new Error(`DATABASE_URL is "${database}", not ${DEV_DATABASE} — pass --prod to confirm`);
  }
  console.log(`DB: ${url.replace(/\/\/[^@]+@/, "//***@").split("?")[0]}`);
  return new PrismaClient();
}

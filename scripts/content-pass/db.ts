// Shared DB guard for content-pass scripts: DATABASE_URL must be exported
// explicitly, and the production endpoint needs --prod.
import { PrismaClient } from "@prisma/client";

const PROD_ENDPOINT = "ep-lingering-cake";

export function connect(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Export DATABASE_URL (dev branch) first");
  if (url.includes(PROD_ENDPOINT) && !process.argv.includes("--prod")) {
    throw new Error("DATABASE_URL is production — pass --prod to confirm");
  }
  console.log(`DB: ${url.replace(/\/\/[^@]+@/, "//***@").split("?")[0]}`);
  return new PrismaClient();
}

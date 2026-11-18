import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const MIGRATIONS_DIR = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function migrateDb(url: string): Promise<void> {
  const client = postgres(url, { max: 1, ssl: /localhost|127\.0\.0\.1|railway\.internal/.test(url) ? false : "require" });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_DIR });
  } finally {
    await client.end();
  }
}

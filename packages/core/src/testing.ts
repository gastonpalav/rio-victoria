import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./db/schema";
import type { Db } from "./db/client";
import { MIGRATIONS_DIR } from "./db/migrate";

/** Base Postgres en memoria (PGlite) con las migraciones aplicadas. Solo para tests. */
export async function createTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db as unknown as Db;
}

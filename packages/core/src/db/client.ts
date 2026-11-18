import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

function isLocal(url: string) {
  return /@(localhost|127\.0\.0\.1)[:/]|\.railway\.internal[:/]/.test(url);
}

export function createDb(url: string, opts: { max?: number } = {}): Db {
  const client = postgres(url, { max: opts.max ?? 5, ssl: isLocal(url) ? false : "require", prepare: false });
  return drizzle(client, { schema }) as unknown as Db;
}

export { schema };

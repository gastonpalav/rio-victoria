import { pgTable, integer, text, real, boolean, timestamp, serial, primaryKey, index } from "drizzle-orm/pg-core";

export const stations = pgTable("stations", {
  id: integer("id").primaryKey(), // id de Prefectura
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  river: text("river").notNull(),
  riverOrder: integer("river_order").notNull(),
  alertM: real("alert_m"),
  evacuationM: real("evacuation_m"),
  periodHours: real("period_hours"),
  hidden: boolean("hidden").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const readings = pgTable(
  "readings",
  {
    stationId: integer("station_id").notNull().references(() => stations.id),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    heightM: real("height_m").notNull(),
    source: text("source", { enum: ["tabla", "historial"] }).notNull(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.stationId, t.ts] }), index("readings_ts_idx").on(t.ts)],
);

export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok"),
  inserted: integer("inserted").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  error: text("error"),
});

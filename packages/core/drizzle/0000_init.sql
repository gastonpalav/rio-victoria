CREATE TABLE "readings" (
	"station_id" integer NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"height_m" real NOT NULL,
	"source" text NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "readings_station_id_ts_pk" PRIMARY KEY("station_id","ts")
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"inserted" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"river" text NOT NULL,
	"river_order" integer NOT NULL,
	"alert_m" real,
	"evacuation_m" real,
	"period_hours" real,
	"hidden" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "readings_ts_idx" ON "readings" USING btree ("ts");
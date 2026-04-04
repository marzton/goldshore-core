DO $$ BEGIN
 CREATE TYPE "market_signal_type" AS ENUM('political', 'risk');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"signal_type" "market_signal_type" NOT NULL,
	"score" real NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 CREATE TYPE "account_type" AS ENUM('IND', 'IRA', 'ROTH_IRA', 'CASH', 'MARGIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "asset_type" AS ENUM('equity', 'option', 'etf');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "broker" AS ENUM('tos', 'fidelity', 'robinhood');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "option_type" AS ENUM('call', 'put');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "order_effect" AS ENUM('open', 'close');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "order_side" AS ENUM('buy', 'sell');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "order_status" AS ENUM('new', 'queued', 'partial', 'filled', 'cancelled', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "order_type" AS ENUM('market', 'limit', 'stop', 'stop_limit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "tif" AS ENUM('day', 'gtc');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"broker" "broker" NOT NULL,
	"broker_account_id" text NOT NULL,
	"name" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"margin_enabled" boolean NOT NULL,
	"options_level" integer,
	"close_only" boolean NOT NULL,
	"pdt_tracked" boolean NOT NULL,
	"ira_restricted" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instruments" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"underlying_symbol" text,
	"option_type" "option_type",
	"strike" double precision,
	"expiry" timestamp,
	"multiplier" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"broker_order_id" text,
	"status" "order_status" NOT NULL,
	"symbol" text NOT NULL,
	"side" "order_side" NOT NULL,
	"effect" "order_effect" NOT NULL,
	"order_type" "order_type" NOT NULL,
	"tif" "tif" NOT NULL,
	"quantity" double precision NOT NULL,
	"limit_price" double precision,
	"stop_price" double precision,
	"submitted_at" timestamp,
	"filled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"instrument_id" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"quantity" double precision NOT NULL,
	"avg_open_price" double precision NOT NULL,
	"mark_price" double precision,
	"market_value" double precision,
	"unrealized_pnl" double precision,
	"realized_pnl" double precision,
	"day_pnl" double precision,
	"cost_basis" double precision
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

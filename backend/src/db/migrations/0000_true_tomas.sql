CREATE TABLE IF NOT EXISTS "event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subaccount_id" uuid NOT NULL,
	"event_sid" text,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_logs_event_sid_unique" UNIQUE("event_sid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subaccount_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"subscription_sid" text,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "twilio_subaccounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"friendly_name" text NOT NULL,
	"twilio_sid" text NOT NULL,
	"twilio_auth_token_encrypted" text NOT NULL,
	"sink_sid" text,
	"webhook_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "twilio_subaccounts_twilio_sid_unique" UNIQUE("twilio_sid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_subaccount" ON "event_logs" ("subaccount_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_received_at" ON "event_logs" ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_event_type" ON "event_logs" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_subaccount_id" ON "event_subscriptions" ("subaccount_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subaccounts_user_id" ON "twilio_subaccounts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subaccounts_webhook_token" ON "twilio_subaccounts" ("webhook_token");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_subaccount_id_twilio_subaccounts_id_fk" FOREIGN KEY ("subaccount_id") REFERENCES "twilio_subaccounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_subaccount_id_twilio_subaccounts_id_fk" FOREIGN KEY ("subaccount_id") REFERENCES "twilio_subaccounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "twilio_subaccounts" ADD CONSTRAINT "twilio_subaccounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

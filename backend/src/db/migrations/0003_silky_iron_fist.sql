CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subaccount_id" uuid NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"email_address" text,
	"phone_number" text,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"event_type_filters" jsonb,
	"daily_summary_time" text DEFAULT '09:00',
	"last_notification_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_subaccount_id_unique" UNIQUE("subaccount_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_prefs_subaccount" ON "notification_preferences" ("subaccount_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_subaccount_id_twilio_subaccounts_id_fk" FOREIGN KEY ("subaccount_id") REFERENCES "twilio_subaccounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

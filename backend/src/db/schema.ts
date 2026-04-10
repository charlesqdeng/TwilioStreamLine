import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Optional now (null for OAuth users)
  // OAuth fields
  provider: text('provider'), // 'local' | 'google'
  providerId: text('provider_id'), // Google ID, etc.
  displayName: text('display_name'), // Full name from OAuth provider
  avatarUrl: text('avatar_url'), // Profile picture URL
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Twilio Subaccounts Table
export const twilioSubaccounts = pgTable('twilio_subaccounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendlyName: text('friendly_name').notNull(),
  twilioSid: text('twilio_sid').notNull().unique(), // Always the Account SID (AC...)
  twilioAuthTokenEncrypted: text('twilio_auth_token_encrypted').notNull(), // Auth Token or API Key Secret
  apiKeySid: text('api_key_sid'), // Optional: API Key SID (SK...) if using API Key auth
  sinkSid: text('sink_sid'),
  webhookToken: uuid('webhook_token').defaultRandom().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_subaccounts_user_id').on(table.userId),
  webhookTokenIdx: index('idx_subaccounts_webhook_token').on(table.webhookToken),
}));

// Event Subscriptions Table
export const eventSubscriptions = pgTable('event_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subaccountId: uuid('subaccount_id').notNull().references(() => twilioSubaccounts.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  subscriptionSid: text('subscription_sid'),
  schemaVersion: integer('schema_version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  subaccountIdIdx: index('idx_subscriptions_subaccount_id').on(table.subaccountId),
}));

// Event Logs Table
export const eventLogs = pgTable('event_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  subaccountId: uuid('subaccount_id').notNull().references(() => twilioSubaccounts.id, { onDelete: 'cascade' }),
  eventSid: text('event_sid').unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
}, (table) => ({
  subaccountIdIdx: index('idx_logs_subaccount').on(table.subaccountId),
  receivedAtIdx: index('idx_logs_received_at').on(table.receivedAt),
  eventTypeIdx: index('idx_logs_event_type').on(table.eventType),
}));

// Notification Preferences Table
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  subaccountId: uuid('subaccount_id').notNull().references(() => twilioSubaccounts.id, { onDelete: 'cascade' }).unique(),
  // Notification channels
  emailEnabled: boolean('email_enabled').default(false).notNull(),
  smsEnabled: boolean('sms_enabled').default(false).notNull(),
  emailAddress: text('email_address'),
  phoneNumber: text('phone_number'),
  // Frequency: 'realtime' = every event, 'daily' = daily summary, 'both' = both modes
  frequency: text('frequency').default('daily').notNull(), // 'realtime' | 'daily' | 'both'
  // Event type filters (array of event types to notify about, null = all events)
  eventTypeFilters: jsonb('event_type_filters').$type<string[] | null>(),
  // Daily summary settings
  dailySummaryTime: text('daily_summary_time').default('09:00'), // Time in HH:mm format (UTC)
  // Metadata
  lastNotificationSentAt: timestamp('last_notification_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  subaccountIdIdx: index('idx_notification_prefs_subaccount').on(table.subaccountId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subaccounts: many(twilioSubaccounts),
}));

export const twilioSubaccountsRelations = relations(twilioSubaccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [twilioSubaccounts.userId],
    references: [users.id],
  }),
  subscriptions: many(eventSubscriptions),
  eventLogs: many(eventLogs),
  notificationPreferences: one(notificationPreferences),
}));

export const eventSubscriptionsRelations = relations(eventSubscriptions, ({ one }) => ({
  subaccount: one(twilioSubaccounts, {
    fields: [eventSubscriptions.subaccountId],
    references: [twilioSubaccounts.id],
  }),
}));

export const eventLogsRelations = relations(eventLogs, ({ one }) => ({
  subaccount: one(twilioSubaccounts, {
    fields: [eventLogs.subaccountId],
    references: [twilioSubaccounts.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  subaccount: one(twilioSubaccounts, {
    fields: [notificationPreferences.subaccountId],
    references: [twilioSubaccounts.id],
  }),
}));

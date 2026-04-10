Product Requirements Document (PRD): StreamLine
Version: 1.3

Status: Final Draft

Core Objective: A multi-tenant monitoring dashboard for Twilio subaccount owners to isolate, configure, view real-time Event Streams, and receive intelligent notifications.

1. User Management & Onboarding
1.1 Authentication
Sign-up/Login: Users register via Email/Password.

Profile Management: Users can manage their profile and view a list of all "Connected Subaccounts."

1.2 Subaccount Linking
Manual Integration: Users add a subaccount by providing:

Friendly Name (e.g., "Client - Acme Corp")

Subaccount SID (AC...)

API Key (from Twilio Console → Account → API Keys)

Validation: The system performs a test API call to Twilio to verify the SID/API Key pair before saving.

2. Functional Requirements
2.1 Workspace Isolation (Strict Separation)
Context Switching: The UI must have a "Subaccount Selector." Switching subaccounts updates the entire application state.

Data Siloing: Events belonging to Subaccount A must never be visible when Subaccount B is the active context.

2.2 Automated Sink Provisioning
One Sink per Subaccount: Upon linking, the system automatically creates a unique Sink.

Webhook Generation: The system generates a unique, cryptographically secure URL for every subaccount:

https://api.streamline.app/v1/ingest/{unique_uuid_per_subaccount}

Lifecycle Management: If a subaccount is deleted from StreamLine, the app should attempt to delete the Sink in Twilio to stop the data flow.

2.3 Event Subscription Manager
Dynamic Discovery: Fetches available EventTypes from Twilio for the specific subaccount.

Granular Control: Users use a toggle-based UI to select/deselect specific events (e.g., messaging.message.delivered).

Batch Update: "Save" action updates the Subscription resource in Twilio to match the UI state.

2.4 Real-time Event Feed
Live Stream: A chronological log of incoming events for the active subaccount.

JSON Inspector: A code-highlighted modal to view the raw event payload.

Persistence: The system stores the last 1,000 events per subaccount for historical review (configurable based on tier).

2.5 Intelligent Notifications & Summaries
Event-Driven Alerts: Users can configure notifications to be sent when events occur, enabling proactive monitoring without constant dashboard watching.

Multi-Channel Delivery: Support for Email and SMS notifications, allowing users to choose their preferred communication method.

Flexible Frequency Options:
- **Real-time**: Immediate notification for every event (or filtered events)
- **Daily Summary**: Aggregated digest sent once per day with event counts and breakdown
- **Both**: Combination of real-time alerts + daily summary

Granular Event Filtering: Users can select specific event types to trigger notifications (e.g., only notify on failed messages), or monitor all events.

Per-Subaccount Configuration: Each subaccount has independent notification settings, allowing different alert strategies per client/project.

Customizable Timing: Daily summaries can be scheduled for a preferred time (UTC) to align with business hours.

Test Notifications: Built-in test functionality to verify email/SMS configuration before going live.

Notification Features:
- Rich HTML email formatting with event details
- Concise SMS messages optimized for mobile
- Event grouping and counts in daily summaries
- Direct links to dashboard for full event details
- Last notification timestamp tracking

3. Technical Architecture
Frontend: React/Next.js with a state manager (Zustand/Redux) to handle the "Active Subaccount" context.

Backend: Node.js/Express with background workers:
- **Event Processor Worker**: BullMQ/Redis queue to process high-volume webhooks and trigger real-time notifications
- **Daily Summary Worker**: Cron-scheduled job (BullMQ) to aggregate events and send daily digests

Real-time: Socket.io using "Room" logic where Room ID == Subaccount SID.

Database: PostgreSQL (Relational structure for accounts, settings, and notification preferences).

Notification Services:
- **Email**: Nodemailer with support for SMTP (Gmail, Outlook, etc.) and SendGrid
- **SMS**: Twilio Messages API for text message delivery
- **Queue System**: Notification jobs are processed asynchronously to prevent blocking event ingestion

4. Sample Database Schema
This schema ensures strict relational integrity and fast lookups for filtered event feeds.

SQL
-- 1. Users Table (The App Account)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Subaccounts Table (Linked Twilio Accounts)
CREATE TABLE twilio_subaccounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friendly_name TEXT NOT NULL,
    twilio_sid TEXT UNIQUE NOT NULL, -- The AC... SID
    twilio_auth_token_encrypted TEXT NOT NULL, -- Encrypted API Key
    sink_sid TEXT, -- The DG... SID created by our app
    webhook_token UUID DEFAULT gen_random_uuid(), -- Used in the unique URL
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Subscriptions Table (Tracking what events are on)
CREATE TABLE event_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subaccount_id UUID REFERENCES twilio_subaccounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'com.twilio.messaging.message.sent'
    schema_version INTEGER DEFAULT 1
);

-- 4. Events Table (The 'Firehose' Data)
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subaccount_id UUID REFERENCES twilio_subaccounts(id) ON DELETE CASCADE,
    event_sid TEXT UNIQUE, -- Twilio's unique ID for the event
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL, -- The raw JSON from Twilio
    received_at TIMESTAMP DEFAULT NOW()
);

-- 5. Notification Preferences Table (Per-Subaccount Alert Configuration)
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subaccount_id UUID UNIQUE REFERENCES twilio_subaccounts(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT false NOT NULL,
    sms_enabled BOOLEAN DEFAULT false NOT NULL,
    email_address TEXT,
    phone_number TEXT,
    frequency TEXT DEFAULT 'daily' NOT NULL, -- 'realtime' | 'daily' | 'both'
    event_type_filters JSONB, -- Array of event types to notify about, null = all events
    daily_summary_time TEXT DEFAULT '09:00', -- HH:mm format (UTC)
    last_notification_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexing for performance in "Strict Separation" views
CREATE INDEX idx_logs_subaccount ON event_logs(subaccount_id);
CREATE INDEX idx_logs_received_at ON event_logs(received_at DESC);
CREATE INDEX idx_notification_prefs_subaccount ON notification_preferences(subaccount_id);

5. Security Considerations
Encryption: The twilio_auth_token_encrypted (API Key) must be encrypted at the application level using a master key (AES-256) before being stored in Postgres.

Webhook Validation: The ingestion endpoint should validate that the webhook_token in the URL matches the subaccount_sid to prevent cross-account spoofing.

Rate Limiting: Twilio can send a massive burst of events. The ingestion logic must use a Queue (Redis) to protect the database from crashing during peak traffic.

Notification Security:
- Email/SMS credentials stored in environment variables (never in code or database)
- Notification failures are logged but never block event processing
- Subaccount isolation enforced - users only receive notifications for their own subaccounts
- All notification API endpoints require authentication and ownership verification

6. Success Metrics
Latency: Time from Twilio Webhook Request → Web Socket Push to UI < 500ms.

Reliability: 99.9% ingestion success rate (handling Twilio's 4-hour retry window).

Ease of Use: User can see their first live event within 60 seconds of adding credentials.

Notification Performance:
- Real-time notification delivery: < 2 seconds from event receipt to email/SMS sent
- Daily summary delivery: 100% on-time delivery at scheduled time
- Notification success rate: > 98% (excluding invalid email/phone numbers)
- Zero impact: Notification failures never block event ingestion or processing

User Engagement:
- Notification adoption: Track % of users who enable notifications
- Channel preferences: Monitor email vs SMS usage patterns
- Filter usage: Track which event types are most commonly monitored

7. Configuration Requirements

7.1 Email Notification Setup
Users can choose between two email providers:

**Option A: SMTP (Gmail, Outlook, etc.)**
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

**Option B: SendGrid**
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
```

7.2 SMS Notification Setup
Twilio account credentials (separate from monitored subaccounts):
```
TWILIO_NOTIFICATION_ACCOUNT_SID=ACxxxxx
TWILIO_NOTIFICATION_AUTH_TOKEN=your-auth-token
TWILIO_NOTIFICATION_FROM_PHONE=+1234567890
```

7.3 Daily Summary Schedule
Configurable cron expression for daily summary timing (UTC):
```
DAILY_SUMMARY_CRON=0 9 * * *  # Default: 9 AM UTC daily
```

7.4 Worker Processes
The application requires three concurrent processes:
1. **Main API Server**: `npm run dev` (port 3001)
2. **Event Processor Worker**: `npm run worker` (processes webhooks + sends real-time notifications)
3. **Daily Summary Worker**: `npm run worker:summary` (scheduled digest sender)

8. User Flows

8.1 Configuring Notifications
1. User navigates to Dashboard → Notifications (🔔)
2. Toggle email and/or SMS notifications on
3. Enter contact information (email address and/or phone number)
4. Select frequency: Real-time, Daily, or Both
5. (Optional) Filter specific event types to monitor
6. (Optional) Set daily summary time
7. Click "Send Test Email/SMS" to verify configuration
8. Click "Save Preferences"

8.2 Receiving Real-time Notifications
1. Event arrives at webhook endpoint
2. Event processor validates and stores event
3. System checks notification preferences for subaccount
4. If real-time enabled + event matches filters → send notification
5. Email/SMS delivered within 2 seconds
6. User receives formatted notification with event details

8.3 Receiving Daily Summaries
1. Cron scheduler triggers at configured time (default: 9 AM UTC)
2. System queries all subaccounts with daily summaries enabled
3. For each subaccount: aggregate last 24 hours of events
4. Generate summary with event counts and breakdowns
5. Send via email and/or SMS based on preferences
6. Track delivery status and last notification timestamp

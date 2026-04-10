# Changelog

All notable changes to StreamLine will be documented in this file.

## [Unreleased]

### Added
- **Intelligent Notifications & Summaries** (2026-04-10)
  - Multi-channel notifications via Email and SMS
  - Three frequency modes: Real-time, Daily Summary, or Both
  - Per-subaccount notification preferences
  - Event type filtering - choose which events trigger notifications
  - Daily summary cron scheduler (default: 9 AM UTC)
  - Test notification functionality to verify setup
  - Notification settings UI with toggle controls
  - Support for SMTP (Gmail, Outlook) and SendGrid for email
  - Twilio Messages API integration for SMS
  - Background notification workers (asynchronous processing)
  - Rich HTML email formatting with event details
  - Database schema: `notification_preferences` table
  - API endpoints: GET/PUT preferences, POST test notifications
  - New worker: `npm run worker:summary` for daily digests

- **Google OAuth Sign-In** (2026-04-06)
  - Users can now sign up and log in using their existing Google account
  - "Sign in with Google" button on login and register pages
  - Automatic account linking if email already exists
  - Database schema updated to support OAuth providers
  - New fields: `provider`, `providerId`, `displayName`, `avatarUrl`
  - Password now optional for OAuth users
  - Graceful error handling for mixed auth methods
  - Complete setup guide: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

- **Enhanced Startup Script** (2026-04-06)
  - One-command startup with `./start.sh`
  - Automatically clears ports 3000 and 3001 before starting
  - Comprehensive health checks for all prerequisites
  - Color-coded output for better readability
  - Intelligent service startup (PostgreSQL, Redis, migrations)

- **Admin Subaccount Management Script** (2026-04-06)
  - List all subaccounts across users
  - Delete subaccounts by Twilio SID
  - View user-specific subaccounts
  - Usage: `npm run script:subaccounts [list|delete|user]`

- **Improved Error Messages for Duplicate Subaccount Linking** (2026-04-06)
  - When attempting to link a Twilio account that's already linked to another user, the error now displays which user has it linked
  - Error message: "⚠️ This Twilio account is already linked to user@example.com. Please contact user@example.com if you need access."
  - Enhanced frontend error display with prominent visual styling (icon, border, shadow)
  - Security note: User email is revealed in error message for better UX (can be disabled for high-security environments by removing the user join)

- **Dual Twilio Authentication Support** (2026-03-31)
  - Support for both Auth Token and API Key authentication methods
  - Radio button toggle in Add Subaccount modal
  - Dynamic form fields based on selected authentication method
  - Database schema updated with `apiKeySid` field
  - All TwilioService methods now accept optional `apiKeySid` parameter

- **Product-Grouped Event Subscriptions UI** (2026-03-31)
  - Events organized by Twilio product categories (Messaging, Voice, Studio, etc.)
  - Collapsible category sections with chevron indicators
  - Category-level "Select All/Deselect All" buttons
  - Selection counters per category (e.g., "3/12 selected")
  - Global "Expand All/Collapse All" controls
  - Search functionality across all event types
  - "Active" badges for currently subscribed events
  - Improved event display with breadcrumb-style formatting

### Fixed
- **Google OAuth Configuration** (2026-04-06)
  - Fixed "Unknown authentication strategy 'google'" error when credentials not configured
  - OAuth routes now conditionally register based on environment variables
  - Added graceful fallback to email/password when OAuth is unconfigured
  - Frontend checks OAuth availability before initiating flow
  - Better error messages with setup instructions

- **Authentication Hydration Issue** (2026-03-31)
  - Fixed infinite login redirect loop
  - Added `_hasHydrated` flag to Zustand auth store
  - Dashboard layout now waits for store rehydration before checking auth
  - Added loading state during hydration

- **Form Validation Issues** (2026-03-31)
  - Fixed Account SID validation regex to accept all alphanumeric characters
  - Made `twilioSid` field optional with proper conditional validation

### Changed
- **Documentation Consolidation - Phase 2** (2026-04-10)
  - Moved DEPLOYMENT.md and TESTING.md to `docs/` folder
  - Final root structure: README, CLAUDE, PRD, CHANGELOG + docs/
  - Updated docs/README.md with deployment and testing guide descriptions
  - Cleaner root directory with only 4 core markdown files

- **Documentation Consolidation - Phase 1** (2026-04-10)
  - Merged QUICK_REFERENCE.md, START.md, and FEATURES.md into README.md
  - Created `docs/` folder for specialized guides
  - Moved SETUP.md, API_KEY_GUIDE.md, and GOOGLE_OAUTH_SETUP.md to `docs/`
  - Removed obsolete files: prd_oauth.md, OAUTH_FIX.md, DEPLOYMENT_SUMMARY.md
  - Removed hard link duplicate: prd.md (kept PRD.md)
  - Updated PRD.md to version 1.3 with notification feature documentation
  - Added docs/README.md to organize specialized guides
  - Reduced from 15 markdown files to cleaner structure
  - Improved navigation and reduced duplicate content
  - Improved error messages for credential validation

- **Search Functionality** (2026-03-31)
  - Fixed event type filtering by moving filter logic before handler definitions
  - Search now properly filters across all event types

- **Next.js Build Issues** (2026-03-31)
  - Removed problematic `createJSONStorage` import causing webpack errors
  - Added proper cache clearing instructions for build issues

### Documentation
- **New Documentation Files** (2026-04-06)
  - Added DEPLOYMENT.md - Complete production deployment guide
  - Added DEPLOYMENT_SUMMARY.md - Visual deployment overview
  - Added QUICK_REFERENCE.md - One-page command cheat sheet
  - Updated README.md with one-command setup instructions
  
- Updated CLAUDE.md with:
  - Dual authentication implementation details
  - Zustand hydration pattern documentation
  - Development environment setup instructions
  - Common issues and solutions section
  - Updated implementation status for all phases
  
- Updated README.md with:
  - Dual authentication feature documentation
  - Product-grouped UI description
  - ngrok setup instructions for webhook testing
  - Updated prerequisites and quick start guide
  - One-command startup with `./start.sh`

## [0.1.0] - 2026-03-31

### Initial Implementation

#### Phase 1: Core Authentication & Subaccount Management ✅
- User registration/login with JWT authentication
- Email/password authentication
- Zustand state management for auth and subaccounts
- Add/list/delete Twilio subaccounts
- Twilio credential validation
- AES-256-GCM encrypted credential storage
- Subaccount ownership verification middleware

#### Phase 2: Webhook Infrastructure ✅
- Unique webhook URL generation (UUID per subaccount)
- Automated Twilio Sink creation via API
- Webhook ingestion endpoint at `/v1/ingest/:webhook_token`
- BullMQ job queue for event processing
- Background worker process for event ingestion
- Redis pub/sub for worker-to-WebSocket communication
- PostgreSQL storage for events

#### Phase 3: Event Subscription Management ✅
- Fetch available event types from Twilio Events API
- Create/update Twilio Subscription resources
- Per-subaccount subscription configuration
- Event subscription UI with checkboxes
- Select all/deselect all functionality
- Subscription persistence in PostgreSQL

#### Phase 4: Real-time Event Feed ✅
- Socket.IO WebSocket server
- Room-based isolation (one room per subaccount)
- Real-time event broadcasting to connected clients
- Event list component with live updates
- JSON payload viewer
- Event pagination and filtering
- Color-coded event cards by type

### Security
- JWT-based API authentication
- AES-256-GCM encryption for Twilio credentials
- Subaccount ownership verification on all protected routes
- CORS configuration
- Helmet.js security headers
- Rate limiting on webhook endpoints
- WebSocket authentication

### Infrastructure
- PostgreSQL database with Drizzle ORM
- Redis for job queue and pub/sub
- BullMQ for background job processing
- Next.js 14 frontend with App Router
- Express.js backend API
- Monorepo structure with npm workspaces

---

## Version History

- **0.1.0** (2026-03-31) - Initial release with core features
- **Unreleased** - Ongoing improvements and bug fixes

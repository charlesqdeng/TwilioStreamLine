# StreamLine

A multi-tenant monitoring dashboard for Twilio subaccount owners to manage and monitor real-time Event Streams.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 6+
- ngrok (for webhook testing with Twilio)

### One-Command Setup (Recommended)

The easiest way to get started:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example backend/.env
# Edit backend/.env with your settings (see SETUP.md)

# 3. Start everything
./start.sh
```

The `start.sh` script will:
- ✓ Check all prerequisites
- ✓ Start PostgreSQL & Redis (if needed)
- ✓ Create database (if needed)
- ✓ Run migrations
- ✓ Start all services (Backend, Worker, Frontend)

**Access the app:** http://localhost:3000

### Manual Setup

If you prefer step-by-step control:

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your database credentials

# Frontend (optional - uses defaults if not set)
cp frontend/.env.local.example frontend/.env.local

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to MASTER_ENCRYPTION_KEY in backend/.env
```

3. **Set up database:**
```bash
# Start PostgreSQL
brew services start postgresql@14

# Create database
createdb streamline

# Run migrations
cd backend
npm run db:migrate
npm run db:seed  # Optional: creates test user
```

4. **Start Redis:**
```bash
brew services start redis
```

5. **Start all services:**
```bash
# Option A: All at once (Backend + Worker + Frontend)
npm run dev:all

# Option B: Separately (3 terminals)
npm run dev:backend   # Terminal 1
npm run dev:worker    # Terminal 2
npm run dev:frontend  # Terminal 3
```

6. **Setup webhook tunnel (separate terminal):**
```bash
ngrok http 3001
# Copy HTTPS URL and update WEBHOOK_BASE_URL in backend/.env
```

## 📁 Project Structure

```
streamline/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/         # Database, Redis configuration
│   │   ├── db/             # Database schema and migrations
│   │   ├── middleware/     # Auth, ownership verification
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (Twilio, encryption)
│   │   ├── socket/         # WebSocket configuration
│   │   └── workers/        # Background job processors
│   └── package.json
├── frontend/                # Next.js React app
│   ├── src/
│   │   ├── app/            # Next.js app router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # API client, socket client
│   │   └── store/          # Zustand state management
│   └── package.json
├── docs/                   # Setup guides and documentation
├── PRD.md                  # Product requirements
├── CHANGELOG.md            # Version history
├── README.md               # This file
└── package.json            # Root workspace config
```

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (React)
- Zustand (State management)
- Socket.IO Client (Real-time)
- Tailwind CSS (Styling)

**Backend:**
- Node.js + Express
- PostgreSQL + Drizzle ORM
- Socket.IO (WebSocket)
- BullMQ + Redis (Job queue)
- Twilio SDK

## 📚 Key Features

- ✅ **Flexible user authentication:**
  - Email/password registration and login
  - Google OAuth ("Sign in with Google")
  - Automatic account linking
- ✅ **Dual Twilio authentication support**
  - Auth Token (Account SID + Auth Token)
  - API Key (Account SID + API Key SID + API Key Secret)
- ✅ Multi-subaccount management
- ✅ Automated Twilio Sink provisioning
- ✅ Real-time event streaming via WebSocket
- ✅ Strict workspace isolation (one active subaccount)
- ✅ **Product-grouped event subscription UI**
  - Events organized by Twilio product (Messaging, Voice, Studio, etc.)
  - Collapsible categories with bulk selection
  - Search across all event types
  - Active subscription badges
- ✅ **Intelligent notifications & summaries**
  - Real-time event notifications (Email/SMS)
  - Daily summary digests
  - Per-subaccount configuration
  - Event type filtering
  - Test notification functionality
- ✅ Encrypted credential storage (AES-256-GCM)

## 🔐 Security & Authentication

- **Dual authentication methods:**
  - Email/password with bcrypt hashing
  - Google OAuth 2.0 ("Sign in with Google")
- AES-256-GCM encryption for Twilio credentials
- JWT-based session management
- Subaccount ownership verification on all routes
- Rate-limited webhook endpoints
- WebSocket authentication
- Automatic account linking for matching emails

## 📖 Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## 🔧 Quick Reference

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |
| ngrok Dashboard | http://localhost:4040 (when running) |

### Essential Commands

```bash
# Database
cd backend
npm run db:generate   # Generate migration from schema
npm run db:migrate    # Apply migrations
npm run db:seed       # Create test user (test@example.com / password123)

# Redis
brew services start redis
redis-cli ping        # Check connection
redis-cli FLUSHALL    # Clear all queues

# Workers (run from backend directory)
cd backend
npm run worker         # Event processor (handles real-time webhooks & notifications)
npm run worker:summary # Daily summary scheduler (sends digest emails/SMS)

# Troubleshooting
lsof -ti:3000 | xargs kill -9   # Kill frontend port
lsof -ti:3001 | xargs kill -9   # Kill backend port
brew services list              # Check service status
```

### Common Workflows

**Add a Twilio Subaccount:**
1. Login to http://localhost:3000
2. Click "+" in sidebar
3. Choose Auth Token or API Key authentication
4. Enter credentials
5. App automatically creates Sink and webhook URL

**Configure Event Subscriptions:**
1. Navigate to "Subscriptions" page
2. Expand product categories (Messaging, Voice, etc.)
3. Select desired event types
4. Click "Save Changes"

**Setup Notifications:**
1. Navigate to "Notifications" page (🔔)
2. Enable Email and/or SMS
3. Enter contact information
4. Choose frequency (Real-time, Daily, or Both)
5. Optionally filter event types
6. Send test notification to verify setup

**Test Webhook Events:**
1. Ensure ngrok is running (`ngrok http 3001`)
2. Update `WEBHOOK_BASE_URL` in backend/.env
3. Restart backend
4. Add subaccount and configure subscriptions
5. Send test SMS/call from Twilio Console
6. Watch events appear in "Live Events" page

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[PRD.md](./PRD.md)** | Product requirements & specifications |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history & updates |
| **[docs/](./docs/)** | Setup guides, deployment, testing, and more |

### Webhook Testing with ngrok

For Twilio to send events to your local environment, you need a public URL:

1. **Get ngrok domain:**
   - Free: `ngrok http 3001` (generates random URL each time)
   - Paid: `ngrok http --domain=yourdomain.ngrok.io 3001` (consistent domain)

2. **Update backend/.env:**
   ```bash
   WEBHOOK_BASE_URL=https://yourdomain.ngrok.io/v1/ingest
   ```

3. **Restart backend** to pick up the new URL

4. When you add a subaccount, StreamLine will automatically register the webhook with Twilio

## 📝 Implementation Status

**✅ Phase 1: Authentication & Subaccount Management**
- ✅ User registration/login with JWT
- ✅ Zustand state persistence with hydration pattern
- ✅ Add/list/delete subaccounts
- ✅ **Dual Twilio authentication support**
  - Radio button toggle for Auth Token vs API Key
  - Dynamic form validation based on auth method
  - Support for both authentication methods in all Twilio API calls
- ✅ Twilio credential validation before onboarding
- ✅ Encrypted credential storage (AES-256-GCM)
- ✅ Subaccount ownership verification middleware

**✅ Phase 2: Webhook Infrastructure**
- ✅ Automated Sink creation via Twilio API
- ✅ Unique webhook URL generation
- ✅ Webhook ingestion with BullMQ queue
- ✅ Event processing worker
- ✅ Rate limiting on webhook endpoint

**✅ Phase 3: Event Subscriptions**
- ✅ Fetch available event types from Twilio
- ✅ Create/update Subscription resources
- ✅ Per-subaccount subscription management
- ✅ **Product-grouped subscription UI**
  - Events organized by category (Messaging, Voice, Studio, TaskRouter, etc.)
  - Collapsible categories with chevron indicators
  - Category-level selection counters (e.g., "3/12 selected")
  - Bulk select/deselect per category
  - Global expand/collapse controls
  - Search filtering across all categories
  - "Active" badges for current subscriptions

**✅ Phase 4: Real-time Event Feed**
- ✅ WebSocket server with room-based isolation
- ✅ Event storage in PostgreSQL
- ✅ Event retrieval API with pagination
- ✅ Live event list component with real-time updates
- ✅ JSON payload viewer component
- ✅ Human-readable event summaries
- ✅ Event cards with color coding by type

**✅ Phase 5: Intelligent Notifications**
- ✅ Multi-channel notifications (Email + SMS)
- ✅ Real-time event notifications
- ✅ Daily summary digests with cron scheduling
- ✅ Per-subaccount notification preferences
- ✅ Event type filtering
- ✅ Notification service (Nodemailer + Twilio)
- ✅ Test notification functionality
- ✅ Frontend notification settings UI

**⏳ Phase 6: OAuth Integration (Future)**
- ⏳ Twilio OAuth flow
- ⏳ Parent account discovery
- ⏳ Identity linking

## 📄 License

Private project - All rights reserved

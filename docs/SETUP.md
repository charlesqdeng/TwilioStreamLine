# StreamLine - Complete Setup Guide

Follow these steps to get StreamLine running locally.

## Prerequisites

- **Node.js** 18+ and **npm** 9+
- **PostgreSQL** 14+
- **Redis** 6+

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for both backend and frontend (monorepo workspaces).

### 2. Set Up Environment Variables

#### Backend Environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your settings:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/streamline

# Redis
REDIS_URL=redis://localhost:6379

# Generate a 32-byte encryption key (see below)
MASTER_ENCRYPTION_KEY=your_64_char_hex_string_here

# Generate a JWT secret
JWT_SECRET=your_random_secret_here
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Webhook base URL (use ngrok for local testing)
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io/v1/ingest

# Event retention
MAX_EVENTS_PER_SUBACCOUNT=1000
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generate JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

#### Frontend Environment

```bash
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 3. Start Database and Redis

**PostgreSQL:**
```bash
# Start PostgreSQL (if not running)
# macOS with Homebrew:
brew services start postgresql

# Create database
createdb streamline

# Or use psql:
psql postgres
CREATE DATABASE streamline;
\q
```

**Redis:**
```bash
# Start Redis
# macOS with Homebrew:
brew services start redis

# Or run in foreground:
redis-server
```

### 4. Run Database Migrations

```bash
cd backend

# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. (Optional) Seed Database

Create a test user and subaccount:

```bash
cd backend
npm run db:seed
```

**Test credentials:**
- Email: `test@example.com`
- Password: `password123`

### 6. Start the Development Servers

**Option A: Start Everything (Recommended)**

From the project root:
```bash
npm run dev
```

This starts both frontend (port 3000) and backend (port 3001).

**Option B: Start Separately**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Worker:
```bash
cd backend
npm run worker
```

Terminal 3 - Frontend:
```bash
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

### 8. (For Twilio Webhooks) Set Up ngrok

Twilio needs a public URL to send webhooks. Use ngrok for local development:

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and update `WEBHOOK_BASE_URL` in `backend/.env`:

```env
WEBHOOK_BASE_URL=https://abc123.ngrok.io/v1/ingest
```

Restart the backend server.

## Testing the Application

### 1. Register a New User

1. Go to http://localhost:3000
2. Click "Get Started" or "Register"
3. Create an account with email/password

### 2. Add a Twilio Subaccount

1. After login, you'll see the dashboard
2. Click "Add Subaccount" (+ icon in sidebar)
3. Fill in:
   - **Friendly Name:** e.g., "My Test Account"
   - **Twilio Account SID:** Your AC... SID from Twilio Console
   - **API Key:** Your API Key from Twilio Console → Account → API Keys

The app will:
- Validate your credentials
- Create a unique webhook URL
- Create a Sink in your Twilio account
- Store encrypted credentials

### 3. Configure Event Subscriptions

1. Go to "Subscriptions" page
2. Select event types you want to monitor
3. Click "Save"

The app will create a Subscription in Twilio linking your Sink to the selected events.

### 4. Monitor Events

1. Go to "Live Events" page
2. Events will appear in real-time as Twilio sends them to your webhook

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep streamline

# Test connection
psql postgresql://user:password@localhost:5432/streamline
```

### Redis Connection Errors

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check Redis connection
redis-cli
> INFO server
```

### Webhook Not Receiving Events

1. **Check ngrok is running:**
   ```bash
   curl https://your-ngrok-url.ngrok.io/v1/ingest/health
   ```

2. **Check Twilio Sink configuration:**
   - Go to Twilio Console → Events → Sinks
   - Verify your Sink URL matches ngrok URL

3. **Check backend logs:**
   - Look for "Event queued" messages

4. **Check worker is running:**
   ```bash
   cd backend
   npm run worker
   ```

### Frontend Can't Connect to Backend

1. **Check backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check CORS settings:**
   - Verify `FRONTEND_URL` in backend/.env matches your frontend URL

3. **Check browser console:**
   - Look for CORS or network errors

## Development Scripts

```bash
# Root workspace
npm run dev              # Start both frontend and backend
npm run build            # Build both apps
npm run lint             # Lint both apps

# Backend only
cd backend
npm run dev              # Start backend dev server
npm run worker           # Start event processor worker
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data
npm run build            # Build for production
npm run start            # Start production server

# Frontend only
cd frontend
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## Next Steps

Once everything is running:

1. ✅ Add multiple subaccounts
2. ✅ Configure different event types per subaccount
3. ✅ Test workspace switching (strict isolation)
4. ✅ Monitor real-time events
5. ✅ Explore the JSON payload inspector

## Production Deployment

For production deployment, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) (to be created)
- Update environment variables for production
- Use a proper secrets manager (AWS Secrets Manager, Vault, etc.)
- Set up SSL certificates
- Configure production database with connection pooling
- Set up monitoring and logging (Sentry, LogRocket, etc.)

## Getting Help

- Check [CLAUDE.md](./CLAUDE.md) for architecture details
- Check [README.md](./README.md) for project overview
- Create an issue if something isn't working

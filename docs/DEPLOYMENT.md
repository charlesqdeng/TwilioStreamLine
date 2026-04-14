# StreamLine - Deployment Guide

Complete guide for deploying StreamLine in various environments.

## Table of Contents

- [Quick Start (Development)](#quick-start-development)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Service Architecture](#service-architecture)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Development)

### One-Command Startup (Recommended)

```bash
./start.sh
```

This script will:
- ✓ Check Node.js version (18+)
- ✓ Start PostgreSQL (if not running)
- ✓ Start Redis (if not running)
- ✓ Create database (if not exists)
- ✓ Run migrations (if needed)
- ✓ Check port availability
- ✓ Start all services (Backend, Worker, Frontend)

### Manual Startup

If you prefer to start services individually:

**1. Check Prerequisites:**
```bash
# PostgreSQL
brew services start postgresql@14
psql -c "SELECT version();"

# Redis
brew services start redis
redis-cli ping

# Create database
createdb streamline
```

**2. Install Dependencies:**
```bash
npm install
```

**3. Configure Environment:**
```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your settings

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to MASTER_ENCRYPTION_KEY in backend/.env
```

**4. Run Migrations:**
```bash
cd backend
npm run db:migrate
npm run db:seed  # Optional: creates test user
```

**5. Start All Services:**
```bash
# Option A: All at once (Backend + Worker + Frontend)
npm run dev:all

# Option B: Separately (3 terminals)
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:worker

# Terminal 3
npm run dev:frontend
```

**6. Setup Webhook Tunnel:**
```bash
# Terminal 4
ngrok http 3001
# Copy HTTPS URL and update WEBHOOK_BASE_URL in backend/.env
```

### Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Webhooks:** https://your-ngrok-url.ngrok.io/v1/ingest

---

## Production Deployment

### Infrastructure Requirements

**Compute:**
- Node.js 18+ runtime
- 2+ CPU cores recommended
- 2GB+ RAM recommended

**Database:**
- PostgreSQL 14+ (managed service recommended)
- Connection pooling enabled
- Minimum 10 connections

**Cache/Queue:**
- Redis 6+ (managed service recommended)
- Persistence enabled (AOF or RDB)
- Minimum 512MB memory

**Network:**
- SSL/TLS certificates for HTTPS
- Public domain for webhook ingestion
- Firewall rules for ports 80/443

### Deployment Platforms

#### Option 1: Docker Compose (VPS/Self-Hosted)

**1. Create Docker Compose file:**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: streamline
      POSTGRES_USER: streamline
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      DATABASE_URL: postgresql://streamline:${DB_PASSWORD}@postgres:5432/streamline
      REDIS_URL: redis://redis:6379
      MASTER_ENCRYPTION_KEY: ${MASTER_ENCRYPTION_KEY}
      JWT_SECRET: ${JWT_SECRET}
      WEBHOOK_BASE_URL: https://${DOMAIN}/v1/ingest
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: npm run worker
    environment:
      DATABASE_URL: postgresql://streamline:${DB_PASSWORD}@postgres:5432/streamline
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      NEXT_PUBLIC_API_URL: https://${DOMAIN}
      NEXT_PUBLIC_WS_URL: https://${DOMAIN}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**2. Create Dockerfiles:**

```dockerfile
# backend/Dockerfile.prod
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**3. Deploy:**

```bash
# Set environment variables
export DB_PASSWORD=your_secure_password
export MASTER_ENCRYPTION_KEY=$(openssl rand -hex 32)
export JWT_SECRET=$(openssl rand -base64 64)
export DOMAIN=streamline.yourdomain.com

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend npm run db:migrate
```

#### Option 2: Platform as a Service (Heroku/Railway/Render)

**Heroku:**

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create streamline-api

# Add addons
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MASTER_ENCRYPTION_KEY=$(openssl rand -hex 32)
heroku config:set JWT_SECRET=$(openssl rand -base64 64)
heroku config:set WEBHOOK_BASE_URL=https://streamline-api.herokuapp.com/v1/ingest

# Deploy backend
git subtree push --prefix backend heroku main

# Run migrations
heroku run npm run db:migrate

# Scale worker
heroku ps:scale worker=1
```

**Procfile (for Heroku):**
```
web: npm start
worker: npm run worker
```

#### Option 3: Cloud Providers (AWS/GCP/Azure)

**AWS Elastic Beanstalk Example:**

1. **Install EB CLI:**
```bash
pip install awsebcli
```

2. **Initialize:**
```bash
cd backend
eb init -p node.js-18 streamline-backend
```

3. **Create Environment:**
```bash
eb create streamline-prod \
  --instance-type t3.small \
  --envvars DATABASE_URL=$DATABASE_URL,REDIS_URL=$REDIS_URL,...
```

4. **Deploy:**
```bash
eb deploy
```

---

## Environment Variables

### Backend (.env)

```bash
# Database (use managed service URL in production)
DATABASE_URL=postgresql://user:password@host:5432/streamline

# Redis (use managed service URL in production)
REDIS_URL=redis://host:6379

# Encryption (MUST be 64-character hex string)
MASTER_ENCRYPTION_KEY=your_64_char_hex_key_here

# JWT (use strong random string)
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production

# CORS (your frontend domain)
FRONTEND_URL=https://streamline.yourdomain.com

# Webhooks (your public domain)
WEBHOOK_BASE_URL=https://api.streamline.yourdomain.com/v1/ingest

# Limits
MAX_EVENTS_PER_SUBACCOUNT=1000

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn_here
```

### Frontend (.env.local)

```bash
# Backend API endpoint
NEXT_PUBLIC_API_URL=https://api.streamline.yourdomain.com

# WebSocket endpoint (same as API)
NEXT_PUBLIC_WS_URL=https://api.streamline.yourdomain.com
```

### Security Best Practices

**Never commit secrets to git:**
```bash
# .gitignore already includes:
.env
.env.local
.env.production
```

**Use secrets management in production:**
- AWS: AWS Secrets Manager
- GCP: Google Secret Manager
- Azure: Azure Key Vault
- Heroku: Config Vars
- Docker: Docker Secrets

**Generate strong keys:**
```bash
# Encryption key (32 bytes = 64 hex chars)
openssl rand -hex 32

# JWT secret (64 bytes base64)
openssl rand -base64 64
```

---

## Database Setup

### Development

```bash
# Create database
createdb streamline

# Run migrations
cd backend
npm run db:migrate

# Seed test data
npm run db:seed
```

### Production

**Using managed PostgreSQL (recommended):**

1. **Provision database:**
   - AWS RDS PostgreSQL
   - Google Cloud SQL
   - Azure Database for PostgreSQL
   - Heroku Postgres
   - Railway PostgreSQL

2. **Configure connection:**
```bash
# Use connection pooling
DATABASE_URL=postgresql://user:pass@host:5432/streamline?pool_timeout=10&connect_timeout=10

# SSL mode for production
DATABASE_URL=postgresql://user:pass@host:5432/streamline?sslmode=require
```

3. **Run migrations:**
```bash
# SSH into server or use deployment script
npm run db:migrate
```

4. **Backup strategy:**
```bash
# Automated daily backups (example for AWS RDS)
aws rds create-db-snapshot \
  --db-instance-identifier streamline-prod \
  --db-snapshot-identifier streamline-backup-$(date +%Y%m%d)
```

### Migrations

**Creating new migrations:**
```bash
# 1. Update schema in backend/src/db/schema.ts
# 2. Generate migration
npm run db:generate

# 3. Review generated SQL in drizzle/ folder
# 4. Run migration
npm run db:migrate
```

**Rolling back migrations:**
```bash
# Drizzle doesn't have automatic rollback
# You'll need to write manual down migrations
# Or restore from backup
```

---

## Service Architecture

### Production Topology

```
                                  ┌─────────────┐
                                  │   Twilio    │
                                  │   Events    │
                                  └──────┬──────┘
                                         │
                                         ▼
┌─────────┐      ┌──────────────────────────────────────┐
│ Users   │      │         Load Balancer/CDN            │
└────┬────┘      └──────────────────────────────────────┘
     │                        │              │
     │                        ▼              ▼
     │            ┌────────────────┐  ┌─────────────────┐
     └───────────▶│   Frontend     │  │  Backend API    │
                  │   (Next.js)    │  │  (Express)      │
                  └────────────────┘  └────────┬────────┘
                                               │
                  ┌────────────────────────────┼─────────┐
                  │                            │         │
                  ▼                            ▼         ▼
          ┌───────────────┐          ┌─────────────┐   ┌────────────┐
          │  PostgreSQL   │          │    Redis    │   │   Worker   │
          │   Database    │          │ Queue/Cache │   │  Process   │
          └───────────────┘          └─────────────┘   └────────────┘
```

### Process Management

**Using PM2 (recommended for VPS):**

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Auto-start on reboot
pm2 startup
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'streamline-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'streamline-worker',
      cwd: './backend',
      script: 'dist/workers/event-processor.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'streamline-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

### Scaling Considerations

**Horizontal Scaling:**
- Backend API: Scale to N instances behind load balancer
- Worker: Scale to N instances (BullMQ handles distribution)
- Frontend: Scale to N instances (stateless)

**Vertical Scaling:**
- Database: Increase CPU/RAM as needed
- Redis: Increase memory for larger queues

**Auto-scaling triggers:**
- CPU usage > 70% for 5 minutes
- Memory usage > 80%
- Queue length > 1000 jobs
- Response time > 2 seconds

---

## Monitoring & Observability

### Health Checks

**Backend:**
```bash
curl https://api.streamline.com/health
# Response: {"status":"ok","timestamp":"2026-04-06T12:00:00Z"}
```

**Frontend:**
```bash
curl https://streamline.com/
# Should return 200 OK
```

**Database:**
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

**Redis:**
```bash
redis-cli -u $REDIS_URL ping
```

### Logging

**Development:**
- Console logs (stdout/stderr)
- Pretty formatting

**Production:**
- JSON structured logs
- Send to aggregation service (Datadog, New Relic, Papertrail)

**Example integration (Sentry):**
```javascript
// backend/src/index.ts
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1
  });
}
```

### Metrics to Monitor

**Application:**
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (5xx responses)
- WebSocket connections (active count)

**Queue:**
- Job processing rate
- Queue depth
- Job failures
- Processing time

**Infrastructure:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O

### Alerting Rules

```yaml
# Example Prometheus alerts
groups:
  - name: streamline
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: QueueBacklog
        expr: bullmq_queue_jobs_waiting > 1000
        for: 5m
        annotations:
          summary: "Queue backlog exceeds 1000 jobs"
      
      - alert: DatabaseConnectionPoolExhausted
        expr: postgres_connections_active >= postgres_connections_max * 0.9
        for: 2m
        annotations:
          summary: "Database connection pool nearly exhausted"
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

**Note:** The `./start.sh` script automatically clears ports 3000 and 3001 at startup.

For manual troubleshooting:
```bash
# Find process using port
lsof -i:3001

# Kill specific processes
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
```

#### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool settings
psql $DATABASE_URL -c "SHOW max_connections;"
```

#### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Check memory usage
redis-cli info memory

# Clear Redis (use with caution)
redis-cli FLUSHALL
```

#### Worker Not Processing Jobs

```bash
# Check worker is running
ps aux | grep event-processor

# Check Redis queue
redis-cli
> KEYS bull:*
> LLEN bull:event-queue:wait

# Check worker logs
pm2 logs streamline-worker
```

#### Webhook Events Not Arriving

1. **Check ngrok/tunnel:**
```bash
curl https://your-domain.com/v1/ingest/health
```

2. **Check Twilio Sink configuration:**
   - Go to Twilio Console → Events → Sinks
   - Verify Sink URL matches your domain

3. **Check backend logs:**
```bash
# Look for "Event queued" or errors
pm2 logs streamline-backend
```

4. **Check firewall:**
```bash
# Ensure port 443 is open for HTTPS
sudo iptables -L -n | grep 443
```

### Performance Issues

#### Slow Database Queries

```sql
-- Enable query logging
ALTER DATABASE streamline SET log_min_duration_statement = 1000;

-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_event_logs_subaccount_created 
ON event_logs(subaccount_id, created_at DESC);
```

#### High Memory Usage

```bash
# Check Node.js heap usage
NODE_OPTIONS=--max-old-space-size=2048 npm start

# Profile memory leaks
node --inspect dist/index.js
```

#### Queue Backlog

```bash
# Add more worker instances
pm2 scale streamline-worker +2

# Or increase concurrency in worker code
# backend/src/workers/event-processor.ts
const worker = new Worker('event-queue', processor, {
  concurrency: 10  // Increase from 5
});
```

---

## Rollback Strategy

### Application Rollback

**Using PM2:**
```bash
# Save current version
pm2 save

# Deploy new version
git pull
npm install
npm run build
pm2 restart all

# If issues, rollback
git checkout <previous-commit>
npm install
npm run build
pm2 restart all
```

**Using Docker:**
```bash
# Tag images before deploying
docker tag streamline-backend:latest streamline-backend:v1.2.3

# Rollback to previous version
docker-compose down
docker-compose up -d streamline-backend:v1.2.2
```

### Database Rollback

```bash
# Restore from backup
pg_restore -d streamline backup.dump

# Or use point-in-time recovery (AWS RDS)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier streamline-prod \
  --target-db-instance-identifier streamline-restored \
  --restore-time 2026-04-06T10:00:00Z
```

---

## Checklist: Pre-Deployment

- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates valid
- [ ] Domain DNS records configured
- [ ] Firewall rules configured
- [ ] Backups configured
- [ ] Monitoring/alerting configured
- [ ] Load testing completed
- [ ] Security scan completed
- [ ] Documentation updated

## Checklist: Post-Deployment

- [ ] Health checks passing
- [ ] Logs streaming correctly
- [ ] Metrics collecting
- [ ] Test user can login
- [ ] Test subaccount can be added
- [ ] Test webhook events received
- [ ] SSL certificate valid
- [ ] Domain resolves correctly
- [ ] Performance within targets

---

## Support

For issues or questions:
- Check [CLAUDE.md](./CLAUDE.md) for architecture
- Check [README.md](./README.md) for features
- Check [SETUP.md](./SETUP.md) for local development
- Create an issue on GitHub

#!/bin/bash

# StreamLine - All-in-One Startup Script
# This script checks all prerequisites and starts all services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   StreamLine - Starting All Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Clear ports 3000 and 3001 if they're in use
echo -e "${YELLOW}Checking for processes on ports 3000 and 3001...${NC}"
if lsof -ti:3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚡ Killing process on port 3000...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi
if lsof -ti:3001 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚡ Killing process on port 3001...${NC}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 1
fi
echo -e "${GREEN}✓ Ports 3000 and 3001 are now available${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running
service_running() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services list | grep "$1" | grep "started" >/dev/null 2>&1
    else
        systemctl is-active --quiet "$1" 2>/dev/null
    fi
}

# Function to check if a port is in use
port_in_use() {
    lsof -i:"$1" >/dev/null 2>&1
}

echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher (current: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check PostgreSQL
echo ""
echo -e "${YELLOW}[2/7] Checking PostgreSQL...${NC}"
if ! command_exists psql; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Install with: brew install postgresql@14"
    exit 1
fi

# Start PostgreSQL if not running
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! service_running "postgresql"; then
        echo -e "${YELLOW}⚡ Starting PostgreSQL...${NC}"
        brew services start postgresql@14 || brew services start postgresql
        sleep 2
    fi
fi

# Check if database exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw streamline; then
    echo -e "${YELLOW}⚡ Database 'streamline' not found. Creating...${NC}"
    createdb streamline || {
        echo -e "${RED}❌ Failed to create database. Please create manually: createdb streamline${NC}"
        exit 1
    }
fi
echo -e "${GREEN}✓ PostgreSQL is running (database: streamline)${NC}"

# Check Redis
echo ""
echo -e "${YELLOW}[3/7] Checking Redis...${NC}"
if ! command_exists redis-cli; then
    echo -e "${RED}❌ Redis is not installed${NC}"
    echo "Install with: brew install redis"
    exit 1
fi

# Start Redis if not running
if ! redis-cli ping >/dev/null 2>&1; then
    echo -e "${YELLOW}⚡ Starting Redis...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
    else
        redis-server --daemonize yes
    fi
    sleep 2
fi

if redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}❌ Failed to start Redis${NC}"
    exit 1
fi

# Check environment files
echo ""
echo -e "${YELLOW}[4/7] Checking environment files...${NC}"
if [ ! -f backend/.env ]; then
    echo -e "${RED}❌ backend/.env not found${NC}"
    echo "Please create it: cp .env.example backend/.env"
    echo "Then edit it with your configuration"
    exit 1
fi
echo -e "${GREEN}✓ backend/.env exists${NC}"

# Check if dependencies are installed
echo ""
echo -e "${YELLOW}[5/7] Checking dependencies...${NC}"
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}⚡ Installing dependencies...${NC}"
    npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check if migrations have been run
echo ""
echo -e "${YELLOW}[6/7] Checking database migrations...${NC}"
if ! psql streamline -c "SELECT 1 FROM users LIMIT 1" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚡ Running database migrations...${NC}"
    cd backend
    npm run db:migrate || {
        echo -e "${RED}❌ Failed to run migrations${NC}"
        exit 1
    }
    cd ..
fi
echo -e "${GREEN}✓ Database is migrated${NC}"

# Verify ports are available
echo ""
echo -e "${YELLOW}[7/7] Verifying ports are available...${NC}"
if port_in_use 3000; then
    echo -e "${RED}❌ Port 3000 is still in use (Frontend)${NC}"
    echo "Something went wrong clearing the port. Please manually kill the process:"
    echo "lsof -ti:3000 | xargs kill -9"
    exit 1
fi
if port_in_use 3001; then
    echo -e "${RED}❌ Port 3001 is still in use (Backend)${NC}"
    echo "Something went wrong clearing the port. Please manually kill the process:"
    echo "lsof -ti:3001 | xargs kill -9"
    exit 1
fi
echo -e "${GREEN}✓ Ports 3000 and 3001 are available${NC}"

# All checks passed
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✓ All prerequisites are ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Display startup information
echo -e "${BLUE}Starting services...${NC}"
echo ""
echo -e "${BLUE}Services will be available at:${NC}"
echo -e "  Frontend:    ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend API: ${GREEN}http://localhost:3001${NC}"
echo -e "  Health:      ${GREEN}http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}Note: You'll need to start ngrok separately for webhook testing:${NC}"
echo -e "  ${BLUE}ngrok http 3001${NC}"
echo -e "  Then update ${BLUE}WEBHOOK_BASE_URL${NC} in ${BLUE}backend/.env${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# Start all services using npm
npm run dev:all

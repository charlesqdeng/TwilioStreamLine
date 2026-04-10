import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import passport from 'passport';

import { authRouter } from './routes/auth.routes';
import { subaccountsRouter } from './routes/subaccounts.routes';
import { eventsRouter } from './routes/events.routes';
import { ingestRouter } from './routes/ingest.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { errorHandler } from './middleware/error.middleware';
import { setupSocketIO } from './socket/socket.config';
import { configureOAuth } from './services/oauth.service';

dotenv.config();

// Configure OAuth strategies
configureOAuth();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'StreamLine API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      subaccounts: '/api/subaccounts',
      events: '/api/events',
      notifications: '/api/notifications',
      webhooks: '/v1/ingest',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/subaccounts', subaccountsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/subaccounts', notificationsRouter); // Nested under /api/subaccounts/:id/notifications
app.use('/v1/ingest', ingestRouter); // Webhook endpoint

// Socket.IO setup
setupSocketIO(io);

// Redis subscriber for worker-to-socket communication
const redisSubscriber = new Redis(process.env.REDIS_URL!);
redisSubscriber.subscribe('new-event', (err) => {
  if (err) {
    console.error('❌ Failed to subscribe to Redis channel:', err);
  } else {
    console.log('✅ Subscribed to Redis new-event channel');
  }
});

redisSubscriber.on('message', (channel, message) => {
  if (channel === 'new-event') {
    try {
      const { subaccountId, event } = JSON.parse(message);
      // Emit to specific subaccount room
      io.to(subaccountId).emit('new-event', event);
      console.log(`📡 Broadcasted event to room: ${subaccountId}`);
    } catch (error) {
      console.error('❌ Error processing Redis message:', error);
    }
  }
});

// Error handling
app.use(errorHandler);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 StreamLine backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io };

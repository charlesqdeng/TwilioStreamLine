import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { db } from '../config/database';
import { twilioSubaccounts } from '../db/schema';
import { eq } from 'drizzle-orm';

export const ingestRouter = Router();

// Create BullMQ queue for webhook events
const webhookQueue = new Queue('webhook-events', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per IP
  message: 'Too many webhook requests',
});

ingestRouter.use(webhookLimiter);

// POST /v1/ingest/:webhook_token - Webhook endpoint for Twilio events
ingestRouter.post('/:webhook_token', async (req, res) => {
  const { webhook_token } = req.params;
  const payload = req.body;

  try {
    // Validate webhook token and get subaccount
    const subaccount = await db.query.twilioSubaccounts.findFirst({
      where: eq(twilioSubaccounts.webhookToken, webhook_token),
    });

    if (!subaccount) {
      console.warn(`⚠️ Invalid webhook token: ${webhook_token}`);
      return res.status(404).json({ error: 'Invalid webhook token' });
    }

    // Extract event data from Twilio payload
    const eventSid = payload.event_sid || payload.EventSid || null;
    const eventType = payload.event_type || payload.EventType || 'unknown';

    // Add event to processing queue
    await webhookQueue.add(
      'process-event',
      {
        subaccountId: subaccount.id,
        eventSid,
        eventType,
        payload,
      },
      {
        jobId: eventSid || `${subaccount.id}-${Date.now()}`,
      }
    );

    console.log(`✅ Event queued: ${eventType} for subaccount ${subaccount.friendlyName}`);

    // Respond immediately to Twilio (acknowledge receipt)
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook ingestion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /v1/ingest/health - Health check for webhook endpoint
ingestRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

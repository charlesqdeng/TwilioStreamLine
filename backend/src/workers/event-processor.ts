import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { redis } from '../config/redis';
import { db } from '../config/database';
import { eventLogs, notificationPreferences, twilioSubaccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { notificationService } from '../services/notification.service';

// Create a separate Redis publisher for WebSocket events
const redisPublisher = new Redis(process.env.REDIS_URL!);

interface EventPayload {
  subaccountId: string;
  eventSid: string;
  eventType: string;
  payload: Record<string, any>;
}

/**
 * Send real-time notification if configured
 */
async function sendRealtimeNotification(
  event: typeof eventLogs.$inferInsert & { id: string; receivedAt: Date },
  subaccountId: string
) {
  try {
    // Fetch notification preferences for this subaccount
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.subaccountId, subaccountId))
      .limit(1);

    // Skip if no preferences or realtime notifications not enabled
    if (!prefs || (prefs.frequency !== 'realtime' && prefs.frequency !== 'both')) {
      return;
    }

    // Skip if neither email nor SMS is enabled
    if (!prefs.emailEnabled && !prefs.smsEnabled) {
      return;
    }

    // Check event type filters (if configured)
    if (prefs.eventTypeFilters && Array.isArray(prefs.eventTypeFilters)) {
      const filters = prefs.eventTypeFilters as string[];
      if (filters.length > 0 && !filters.includes(event.eventType)) {
        // Event type not in filter list, skip notification
        return;
      }
    }

    // Fetch subaccount details for friendly name
    const [subaccount] = await db
      .select()
      .from(twilioSubaccounts)
      .where(eq(twilioSubaccounts.id, subaccountId))
      .limit(1);

    if (!subaccount) {
      console.error(`❌ Subaccount ${subaccountId} not found for notification`);
      return;
    }

    // Format notification
    const notification = notificationService.formatEventNotification(
      {
        id: event.id,
        eventType: event.eventType,
        payload: event.payload,
        receivedAt: event.receivedAt,
      },
      subaccount.friendlyName
    );

    // Send via enabled channels
    if (prefs.emailEnabled && prefs.emailAddress) {
      await notificationService.sendEmail({
        ...notification,
        email: prefs.emailAddress,
      });
    }

    if (prefs.smsEnabled && prefs.phoneNumber) {
      await notificationService.sendSMS({
        ...notification,
        phone: prefs.phoneNumber,
      });
    }

    // Update last notification sent timestamp
    await db
      .update(notificationPreferences)
      .set({ lastNotificationSentAt: new Date() })
      .where(eq(notificationPreferences.id, prefs.id));

    console.log(`📧 Sent real-time notification for event ${event.id}`);
  } catch (error) {
    console.error('❌ Error sending real-time notification:', error);
    // Don't throw - notification failures shouldn't break event processing
  }
}

// Worker to process webhook events from the queue
export const eventWorker = new Worker(
  'webhook-events',
  async (job: Job<EventPayload>) => {
    const { subaccountId, eventSid, eventType, payload } = job.data;

    try {
      // Insert event into database
      const [insertedEvent] = await db
        .insert(eventLogs)
        .values({
          subaccountId,
          eventSid,
          eventType,
          payload,
        })
        .returning();

      // Publish event to Redis for WebSocket broadcast
      await redisPublisher.publish(
        'new-event',
        JSON.stringify({
          subaccountId,
          event: {
            id: insertedEvent.id,
            eventType: insertedEvent.eventType,
            payload: insertedEvent.payload,
            receivedAt: insertedEvent.receivedAt,
          },
        })
      );

      console.log(`✅ Processed event ${eventSid} for subaccount ${subaccountId}`);

      // Check for notification preferences and send real-time notifications
      await sendRealtimeNotification(insertedEvent, subaccountId);

      // TODO: Implement event retention cleanup (keep last 1000 per subaccount)
    } catch (error) {
      console.error(`❌ Failed to process event ${eventSid}:`, error);
      throw error; // Will trigger retry
    }
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000, // 100 jobs per second
    },
  }
);

eventWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

eventWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

console.log('🚀 Event worker started');

import dotenv from 'dotenv';
dotenv.config();

import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { db } from '../config/database';
import { notificationPreferences, twilioSubaccounts, eventLogs } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { notificationService } from '../services/notification.service';

interface DailySummaryJob {
  subaccountId: string;
}

// Create a queue for daily summary jobs
export const dailySummaryQueue = new Queue('daily-summary', {
  connection: redis,
});

/**
 * Process a single subaccount's daily summary
 */
async function processDailySummary(subaccountId: string) {
  try {
    // Fetch notification preferences
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.subaccountId, subaccountId))
      .limit(1);

    if (!prefs || (prefs.frequency !== 'daily' && prefs.frequency !== 'both')) {
      console.log(`⏭️ Skipping daily summary for ${subaccountId} - not configured`);
      return;
    }

    if (!prefs.emailEnabled && !prefs.smsEnabled) {
      console.log(`⏭️ Skipping daily summary for ${subaccountId} - no channels enabled`);
      return;
    }

    // Fetch subaccount details
    const [subaccount] = await db
      .select()
      .from(twilioSubaccounts)
      .where(eq(twilioSubaccounts.id, subaccountId))
      .limit(1);

    if (!subaccount) {
      console.error(`❌ Subaccount ${subaccountId} not found`);
      return;
    }

    // Calculate time range (last 24 hours)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    // Fetch events from the last 24 hours
    let eventsQuery = db
      .select()
      .from(eventLogs)
      .where(
        and(
          eq(eventLogs.subaccountId, subaccountId),
          gte(eventLogs.receivedAt, startDate)
        )
      );

    // Apply event type filters if configured
    if (prefs.eventTypeFilters && Array.isArray(prefs.eventTypeFilters)) {
      const filters = prefs.eventTypeFilters as string[];
      if (filters.length > 0) {
        eventsQuery = eventsQuery.where(
          sql`${eventLogs.eventType} = ANY(${filters})`
        );
      }
    }

    const events = await eventsQuery;

    // Skip if no events
    if (events.length === 0) {
      console.log(`⏭️ No events for ${subaccount.friendlyName} in the last 24 hours`);
      return;
    }

    // Format summary notification
    const notification = notificationService.formatDailySummary(
      events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payload,
        receivedAt: e.receivedAt,
      })),
      subaccount.friendlyName,
      startDate,
      endDate
    );

    // Send via enabled channels
    if (prefs.emailEnabled && prefs.emailAddress) {
      await notificationService.sendEmail({
        ...notification,
        email: prefs.emailAddress,
      });
    }

    if (prefs.smsEnabled && prefs.phoneNumber) {
      // For SMS, use a shorter message
      const smsMessage = `StreamLine Daily Summary for ${subaccount.friendlyName}: ${events.length} events in the last 24 hours. View details at ${process.env.FRONTEND_URL}/dashboard/events`;
      await notificationService.sendSMS({
        subject: notification.subject,
        message: smsMessage,
        phone: prefs.phoneNumber,
      });
    }

    // Update last notification sent timestamp
    await db
      .update(notificationPreferences)
      .set({ lastNotificationSentAt: new Date() })
      .where(eq(notificationPreferences.id, prefs.id));

    console.log(`📊 Sent daily summary for ${subaccount.friendlyName} (${events.length} events)`);
  } catch (error) {
    console.error(`❌ Error processing daily summary for ${subaccountId}:`, error);
    throw error; // Trigger retry
  }
}

/**
 * Find all subaccounts that need daily summaries and queue jobs
 */
async function queueDailySummaries() {
  try {
    console.log('🔍 Searching for subaccounts with daily summaries enabled...');

    // Find all subaccounts with daily or both frequency
    const prefsWithDailySummary = await db
      .select({
        subaccountId: notificationPreferences.subaccountId,
      })
      .from(notificationPreferences)
      .where(
        and(
          sql`${notificationPreferences.frequency} IN ('daily', 'both')`,
          sql`(${notificationPreferences.emailEnabled} = true OR ${notificationPreferences.smsEnabled} = true)`
        )
      );

    console.log(`📋 Found ${prefsWithDailySummary.length} subaccount(s) for daily summaries`);

    // Queue a job for each subaccount
    for (const pref of prefsWithDailySummary) {
      await dailySummaryQueue.add(
        'process-summary',
        { subaccountId: pref.subaccountId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );
    }

    console.log(`✅ Queued ${prefsWithDailySummary.length} daily summary job(s)`);
  } catch (error) {
    console.error('❌ Error queuing daily summaries:', error);
    throw error;
  }
}

// Worker to process individual summary jobs
export const dailySummaryWorker = new Worker(
  'daily-summary',
  async (job: Job<DailySummaryJob>) => {
    await processDailySummary(job.data.subaccountId);
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

dailySummaryWorker.on('completed', (job) => {
  console.log(`✅ Daily summary job ${job.id} completed`);
});

dailySummaryWorker.on('failed', (job, err) => {
  console.error(`❌ Daily summary job ${job?.id} failed:`, err);
});

// Schedule the daily summary dispatcher
// Runs every day at the configured time (default: 9:00 AM UTC)
async function scheduleDailySummaries() {
  const cronTime = process.env.DAILY_SUMMARY_CRON || '0 9 * * *'; // Default: 9 AM UTC daily

  // Remove any existing repeatable jobs
  const repeatableJobs = await dailySummaryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await dailySummaryQueue.removeRepeatableByKey(job.key);
  }

  // Add new repeatable job
  await dailySummaryQueue.add(
    'queue-summaries',
    {},
    {
      repeat: {
        pattern: cronTime,
      },
      jobId: 'daily-summary-dispatcher',
    }
  );

  console.log(`🕐 Daily summary scheduled: ${cronTime}`);
}

// Worker to handle the dispatcher job
const dispatcherWorker = new Worker(
  'daily-summary',
  async (job: Job) => {
    if (job.name === 'queue-summaries') {
      await queueDailySummaries();
    }
  },
  {
    connection: redis,
  }
);

dispatcherWorker.on('completed', (job) => {
  if (job.name === 'queue-summaries') {
    console.log('✅ Daily summary dispatcher completed');
  }
});

// Initialize the scheduler
(async () => {
  try {
    await scheduleDailySummaries();
    console.log('🚀 Daily summary worker started');
  } catch (error) {
    console.error('❌ Failed to start daily summary worker:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down daily summary worker...');
  await dailySummaryWorker.close();
  await dispatcherWorker.close();
  process.exit(0);
});

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { verifySubaccountOwnership } from '../middleware/subaccount-ownership.middleware';
import { db } from '../config/database';
import { eventLogs } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../middleware/error.middleware';

export const eventsRouter = Router();

// All routes require authentication
eventsRouter.use(authenticate);

// GET /api/events/:subaccount_id - Get events for a specific subaccount
eventsRouter.get('/:subaccount_id', verifySubaccountOwnership, async (req: AuthRequest, res, next) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100 per request
    const offsetNum = parseInt(offset as string, 10);

    const events = await db.query.eventLogs.findMany({
      where: eq(eventLogs.subaccountId, req.params.subaccount_id),
      limit: limitNum,
      offset: offsetNum,
      orderBy: [desc(eventLogs.receivedAt)],
      columns: {
        id: true,
        eventSid: true,
        eventType: true,
        payload: true,
        receivedAt: true,
      },
    });

    // Get total count for pagination
    const totalResult = await db
      .select({ count: eventLogs.id })
      .from(eventLogs)
      .where(eq(eventLogs.subaccountId, req.params.subaccount_id));

    res.json({
      events,
      pagination: {
        total: totalResult.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: totalResult.length > offsetNum + limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:subaccount_id/:event_id - Get specific event details
eventsRouter.get('/:subaccount_id/:event_id', verifySubaccountOwnership, async (req: AuthRequest, res, next) => {
  try {
    const event = await db.query.eventLogs.findFirst({
      where: and(
        eq(eventLogs.id, req.params.event_id),
        eq(eventLogs.subaccountId, req.params.subaccount_id)
      ),
    });

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    res.json({ event });
  } catch (error) {
    next(error);
  }
});

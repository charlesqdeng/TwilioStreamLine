import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { verifySubaccountOwnership } from '../middleware/subaccount-ownership.middleware';
import { db } from '../config/database';
import { twilioSubaccounts, eventSubscriptions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/error.middleware';
import { EncryptionService } from '../services/encryption.service';
import { TwilioService } from '../services/twilio.service';

export const subaccountsRouter = Router();

// All routes require authentication
subaccountsRouter.use(authenticate);

// Validation schemas
const addSubaccountSchema = z.object({
  friendlyName: z.string().min(1, 'Friendly name is required'),
  authType: z.enum(['authToken', 'apiKey']),
  accountSid: z.string()
    .transform((val) => val.trim())
    .refine(
      (val) => /^AC[a-zA-Z0-9]{32}$/i.test(val),
      'Account SID must be 34 characters starting with "AC"'
    ),
  twilioSid: z.string()
    .transform((val) => val.trim())
    .refine(
      (val) => /^(AC|SK)[a-zA-Z0-9]{32}$/i.test(val),
      'Must be 34 characters starting with "AC" or "SK"'
    ),
  twilioAuthToken: z.string().min(32, 'Must be at least 32 characters'),
});

const updateSubscriptionsSchema = z.object({
  eventTypes: z.array(z.string()).min(1, 'At least one event type required'),
});

// GET /api/subaccounts - List all subaccounts for the authenticated user
subaccountsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userSubaccounts = await db.query.twilioSubaccounts.findMany({
      where: eq(twilioSubaccounts.userId, req.userId!),
      columns: {
        id: true,
        friendlyName: true,
        twilioSid: true,
        sinkSid: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: (subaccounts, { desc }) => [desc(subaccounts.createdAt)],
    });

    res.json({ subaccounts: userSubaccounts });
  } catch (error) {
    next(error);
  }
});

// POST /api/subaccounts - Add a new subaccount
subaccountsRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    // Validate input
    const { friendlyName, authType, accountSid, twilioSid, twilioAuthToken } = addSubaccountSchema.parse(req.body);

    // Check if subaccount already exists (check by accountSid)
    // Note: We reveal the linked user's email for better UX.
    // In high-security environments, consider removing this to prevent user enumeration.
    const existing = await db.query.twilioSubaccounts.findFirst({
      where: eq(twilioSubaccounts.twilioSid, accountSid),
      with: {
        user: {
          columns: {
            email: true,
          },
        },
      },
    });

    if (existing) {
      // Check if it's linked to the current user or a different user
      if (existing.userId === req.userId) {
        throw new AppError(400, 'This Twilio account is already linked to your account');
      } else {
        const linkedUserEmail = existing.user?.email || 'another user';
        throw new AppError(
          400,
          `⚠️ This Twilio account is already linked to ${linkedUserEmail}. Each Twilio account can only be linked once. Please contact ${linkedUserEmail} if you need access to this account.`
        );
      }
    }

    // Validate Twilio credentials
    const isValid = await TwilioService.validateCredentials(
      twilioSid,
      twilioAuthToken,
      authType === 'apiKey' ? accountSid : undefined
    );

    if (!isValid) {
      const authMethod = authType === 'apiKey' ? 'API Key SID and Secret' : 'Account SID and Auth Token';
      throw new AppError(400, `Invalid Twilio credentials. Please check your ${authMethod}.`);
    }

    // Encrypt auth credentials (either auth token or API key secret)
    const encryptedToken = EncryptionService.encrypt(twilioAuthToken);

    // Create subaccount record
    const [newSubaccount] = await db
      .insert(twilioSubaccounts)
      .values({
        userId: req.userId!,
        friendlyName,
        twilioSid: accountSid, // Always store the Account SID (AC...)
        twilioAuthTokenEncrypted: encryptedToken,
        apiKeySid: authType === 'apiKey' ? twilioSid : null, // Store API Key SID if using API Key auth
        isActive: true,
      })
      .returning({
        id: twilioSubaccounts.id,
        friendlyName: twilioSubaccounts.friendlyName,
        twilioSid: twilioSubaccounts.twilioSid,
        webhookToken: twilioSubaccounts.webhookToken,
        createdAt: twilioSubaccounts.createdAt,
      });

    // Generate webhook URL
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://api.streamline.app/v1/ingest'}/${newSubaccount.webhookToken}`;

    // Create Sink in Twilio
    const sinkSid = await TwilioService.createSink(
      accountSid,
      twilioAuthToken,
      webhookUrl,
      `StreamLine - ${friendlyName}`,
      authType === 'apiKey' ? twilioSid : null
    );

    if (sinkSid) {
      // Update subaccount with sinkSid
      await db
        .update(twilioSubaccounts)
        .set({ sinkSid })
        .where(eq(twilioSubaccounts.id, newSubaccount.id));
    }

    res.status(201).json({
      message: 'Subaccount added successfully',
      subaccount: {
        ...newSubaccount,
        sinkSid,
        webhookUrl: sinkSid ? webhookUrl : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// GET /api/subaccounts/:subaccount_id - Get specific subaccount details
subaccountsRouter.get('/:subaccount_id', verifySubaccountOwnership, async (req: AuthRequest, res, next) => {
  try {
    const subaccount = await db.query.twilioSubaccounts.findFirst({
      where: eq(twilioSubaccounts.id, req.params.subaccount_id),
      columns: {
        id: true,
        friendlyName: true,
        twilioSid: true,
        sinkSid: true,
        webhookToken: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!subaccount) {
      throw new AppError(404, 'Subaccount not found');
    }

    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://api.streamline.app/v1/ingest'}/${subaccount.webhookToken}`;

    res.json({
      subaccount: {
        ...subaccount,
        webhookUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/subaccounts/:subaccount_id - Remove a subaccount
subaccountsRouter.delete('/:subaccount_id', verifySubaccountOwnership, async (req: AuthRequest, res, next) => {
  try {
    // Get subaccount details
    const subaccount = await db.query.twilioSubaccounts.findFirst({
      where: eq(twilioSubaccounts.id, req.params.subaccount_id),
    });

    if (!subaccount) {
      throw new AppError(404, 'Subaccount not found');
    }

    const decryptedToken = EncryptionService.decrypt(subaccount.twilioAuthTokenEncrypted);

    // Get existing subscription to delete from Twilio
    const existingSubscription = await db.query.eventSubscriptions.findFirst({
      where: eq(eventSubscriptions.subaccountId, req.params.subaccount_id),
    });

    // 1. Delete Subscription in Twilio (if exists)
    if (existingSubscription?.subscriptionSid) {
      console.log(`Deleting Twilio subscription ${existingSubscription.subscriptionSid} for subaccount ${subaccount.friendlyName}`);
      await TwilioService.deleteSubscription(
        subaccount.twilioSid,
        decryptedToken,
        existingSubscription.subscriptionSid,
        subaccount.apiKeySid
      );
    }

    // 2. Delete Sink in Twilio (if exists)
    if (subaccount.sinkSid) {
      console.log(`Deleting Twilio sink ${subaccount.sinkSid} for subaccount ${subaccount.friendlyName}`);
      await TwilioService.deleteSink(
        subaccount.twilioSid,
        decryptedToken,
        subaccount.sinkSid,
        subaccount.apiKeySid
      );
    }

    // 3. Delete subaccount from database (cascade will delete subscriptions and events)
    await db
      .delete(twilioSubaccounts)
      .where(eq(twilioSubaccounts.id, req.params.subaccount_id));

    console.log(`Subaccount ${subaccount.friendlyName} (${subaccount.twilioSid}) deleted successfully`);
    res.json({ message: 'Subaccount disconnected successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/subaccounts/:subaccount_id/subscriptions - Get event subscriptions
subaccountsRouter.get('/:subaccount_id/subscriptions', verifySubaccountOwnership, async (req: AuthRequest, res, next) => {
  try {
    const subscriptions = await db.query.eventSubscriptions.findMany({
      where: eq(eventSubscriptions.subaccountId, req.params.subaccount_id),
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

// GET /api/subaccounts/:subaccount_id/event-types - Get available event types from Twilio
subaccountsRouter.get('/:subaccount_id/event-types', verifySubaccountOwnership, async (req: AuthRequest, res, next) => {
  try {
    const subaccount = await db.query.twilioSubaccounts.findFirst({
      where: eq(twilioSubaccounts.id, req.params.subaccount_id),
    });

    if (!subaccount) {
      throw new AppError(404, 'Subaccount not found');
    }

    const decryptedToken = EncryptionService.decrypt(subaccount.twilioAuthTokenEncrypted);
    const eventTypes = await TwilioService.fetchEventTypes(
      subaccount.twilioSid,
      decryptedToken,
      subaccount.apiKeySid
    );

    res.json({ eventTypes });
  } catch (error) {
    next(error);
  }
});

// PUT /api/subaccounts/:subaccount_id/subscriptions - Update event subscriptions
subaccountsRouter.put('/:subaccount_id/subscriptions', verifySubaccountOwnership, async (req: AuthRequest, res, next) => {
  try {
    // Validate input
    const { eventTypes } = updateSubscriptionsSchema.parse(req.body);

    const subaccount = await db.query.twilioSubaccounts.findFirst({
      where: eq(twilioSubaccounts.id, req.params.subaccount_id),
    });

    if (!subaccount) {
      throw new AppError(404, 'Subaccount not found');
    }

    if (!subaccount.sinkSid) {
      throw new AppError(400, 'Sink not configured for this subaccount');
    }

    const decryptedToken = EncryptionService.decrypt(subaccount.twilioAuthTokenEncrypted);

    // Get existing subscription
    const existingSubscription = await db.query.eventSubscriptions.findFirst({
      where: eq(eventSubscriptions.subaccountId, req.params.subaccount_id),
    });

    let subscriptionSid: string | null = null;

    if (existingSubscription?.subscriptionSid) {
      // Update existing subscription
      const success = await TwilioService.updateSubscription(
        subaccount.twilioSid,
        decryptedToken,
        existingSubscription.subscriptionSid,
        eventTypes,
        subaccount.apiKeySid
      );

      if (!success) {
        throw new AppError(500, 'Failed to update Twilio subscription');
      }

      subscriptionSid = existingSubscription.subscriptionSid;
    } else {
      // Create new subscription
      subscriptionSid = await TwilioService.createSubscription(
        subaccount.twilioSid,
        decryptedToken,
        subaccount.sinkSid,
        eventTypes,
        subaccount.apiKeySid
      );

      if (!subscriptionSid) {
        throw new AppError(500, 'Failed to create Twilio subscription');
      }
    }

    // Delete existing subscriptions for this subaccount
    await db
      .delete(eventSubscriptions)
      .where(eq(eventSubscriptions.subaccountId, req.params.subaccount_id));

    // Insert new subscriptions
    const subscriptionRecords = eventTypes.map((eventType) => ({
      subaccountId: req.params.subaccount_id,
      eventType,
      subscriptionSid,
    }));

    await db.insert(eventSubscriptions).values(subscriptionRecords);

    res.json({
      message: 'Subscriptions updated successfully',
      eventTypes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

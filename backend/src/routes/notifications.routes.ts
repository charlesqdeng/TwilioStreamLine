import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { verifySubaccountOwnership } from '../middleware/subaccount-ownership.middleware';
import { db } from '../config/database';
import { notificationPreferences, twilioSubaccounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/error.middleware';
import { notificationService } from '../services/notification.service';

export const notificationsRouter = Router();

// All routes require authentication
notificationsRouter.use(authenticate);

// Validation schema
const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  emailAddress: z.string().email().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  frequency: z.enum(['realtime', 'daily', 'both']).optional(),
  eventTypeFilters: z.array(z.string()).optional().nullable(),
  dailySummaryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:mm format
});

const testNotificationSchema = z.object({
  channel: z.enum(['email', 'sms']),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});

// GET /api/subaccounts/:subaccount_id/notifications
// Get notification preferences for a subaccount
notificationsRouter.get(
  '/:subaccount_id/notifications',
  verifySubaccountOwnership,
  async (req: AuthRequest, res, next) => {
    try {
      const { subaccount_id } = req.params;

      // Get notification preferences
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.subaccountId, subaccount_id))
        .limit(1);

      // Return default preferences if none exist
      if (!prefs) {
        return res.json({
          emailEnabled: false,
          smsEnabled: false,
          emailAddress: null,
          phoneNumber: null,
          frequency: 'daily',
          eventTypeFilters: null,
          dailySummaryTime: '09:00',
          lastNotificationSentAt: null,
        });
      }

      res.json({
        emailEnabled: prefs.emailEnabled,
        smsEnabled: prefs.smsEnabled,
        emailAddress: prefs.emailAddress,
        phoneNumber: prefs.phoneNumber,
        frequency: prefs.frequency,
        eventTypeFilters: prefs.eventTypeFilters,
        dailySummaryTime: prefs.dailySummaryTime,
        lastNotificationSentAt: prefs.lastNotificationSentAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/subaccounts/:subaccount_id/notifications
// Update notification preferences
notificationsRouter.put(
  '/:subaccount_id/notifications',
  verifySubaccountOwnership,
  async (req: AuthRequest, res, next) => {
    try {
      const { subaccount_id } = req.params;

      // Validate request body
      const validatedData = notificationPreferencesSchema.parse(req.body);

      // Validation: If email is enabled, email address must be provided
      if (validatedData.emailEnabled && !validatedData.emailAddress) {
        throw new AppError(400, 'Email address is required when email notifications are enabled');
      }

      // Validation: If SMS is enabled, phone number must be provided
      if (validatedData.smsEnabled && !validatedData.phoneNumber) {
        throw new AppError(400, 'Phone number is required when SMS notifications are enabled');
      }

      // Check if preferences exist
      const [existingPrefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.subaccountId, subaccount_id))
        .limit(1);

      let updatedPrefs;

      if (existingPrefs) {
        // Update existing preferences
        [updatedPrefs] = await db
          .update(notificationPreferences)
          .set({
            ...validatedData,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.id, existingPrefs.id))
          .returning();
      } else {
        // Create new preferences
        [updatedPrefs] = await db
          .insert(notificationPreferences)
          .values({
            subaccountId: subaccount_id,
            emailEnabled: validatedData.emailEnabled ?? false,
            smsEnabled: validatedData.smsEnabled ?? false,
            emailAddress: validatedData.emailAddress,
            phoneNumber: validatedData.phoneNumber,
            frequency: validatedData.frequency ?? 'daily',
            eventTypeFilters: validatedData.eventTypeFilters,
            dailySummaryTime: validatedData.dailySummaryTime ?? '09:00',
          })
          .returning();
      }

      res.json({
        message: 'Notification preferences updated successfully',
        preferences: {
          emailEnabled: updatedPrefs.emailEnabled,
          smsEnabled: updatedPrefs.smsEnabled,
          emailAddress: updatedPrefs.emailAddress,
          phoneNumber: updatedPrefs.phoneNumber,
          frequency: updatedPrefs.frequency,
          eventTypeFilters: updatedPrefs.eventTypeFilters,
          dailySummaryTime: updatedPrefs.dailySummaryTime,
          lastNotificationSentAt: updatedPrefs.lastNotificationSentAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, error.errors[0].message));
      }
      next(error);
    }
  }
);

// POST /api/subaccounts/:subaccount_id/notifications/test
// Send a test notification
notificationsRouter.post(
  '/:subaccount_id/notifications/test',
  verifySubaccountOwnership,
  async (req: AuthRequest, res, next) => {
    try {
      const { subaccount_id } = req.params;

      // Validate request body
      const { channel, email, phone } = testNotificationSchema.parse(req.body);

      // Get subaccount for friendly name
      const [subaccount] = await db
        .select()
        .from(twilioSubaccounts)
        .where(eq(twilioSubaccounts.id, subaccount_id))
        .limit(1);

      if (!subaccount) {
        throw new AppError(404, 'Subaccount not found');
      }

      // Get notification preferences (optional - for fallback)
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.subaccountId, subaccount_id))
        .limit(1);

      // Determine which email/phone to use (provided in request takes precedence)
      // Handle null/undefined/empty string
      const emailToUse = (email && email.trim()) || prefs?.emailAddress || null;
      const phoneToUse = (phone && phone.trim()) || prefs?.phoneNumber || null;

      // Prepare test notification
      const subject = '[StreamLine] Test Notification';
      const message = `This is a test notification for ${subaccount.friendlyName}. If you received this, your notifications are working correctly!`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">StreamLine Test Notification</h2>
          <p>This is a test notification for <strong>${subaccount.friendlyName}</strong>.</p>
          <p>If you received this, your notifications are working correctly! ✅</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is a test message. No actual events were triggered.
          </p>
        </div>
      `;

      let success = false;
      let errorMessage = '';

      // Send via requested channel
      if (channel === 'email') {
        if (!emailToUse) {
          throw new AppError(400, 'Email address is required. Please provide an email address or save your preferences first.');
        }

        success = await notificationService.sendEmail({
          subject,
          message,
          html,
          email: emailToUse,
        });

        if (!success) {
          errorMessage = 'Failed to send email. Please check your email configuration.';
        }
      } else if (channel === 'sms') {
        if (!phoneToUse) {
          throw new AppError(400, 'Phone number is required. Please provide a phone number or save your preferences first.');
        }

        success = await notificationService.sendSMS({
          subject,
          message,
          phone: phoneToUse,
        });

        if (!success) {
          errorMessage = 'Failed to send SMS. Please check your SMS configuration.';
        }
      }

      if (success) {
        res.json({
          message: `Test ${channel} notification sent successfully`,
          success: true,
        });
      } else {
        throw new AppError(500, errorMessage || 'Failed to send test notification');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, error.errors[0].message));
      }
      next(error);
    }
  }
);

// GET /api/notifications/status - Removed (doesn't fit nested structure)
// To check status, use the health endpoint or check logs

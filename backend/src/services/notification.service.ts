import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import Twilio from 'twilio';

interface EventData {
  id: string;
  eventType: string;
  payload: Record<string, any>;
  receivedAt: Date;
}

interface NotificationOptions {
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  html?: string;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: Twilio.Twilio | null = null;

  constructor() {
    this.initializeEmailTransporter();
    this.initializeTwilioClient();
  }

  /**
   * Initialize email transporter (supports SMTP or SendGrid)
   */
  private initializeEmailTransporter() {
    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

    try {
      if (emailProvider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
        // SendGrid configuration
        this.emailTransporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
      } else if (emailProvider === 'smtp') {
        // Generic SMTP configuration
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }

      if (this.emailTransporter) {
        console.log('✅ Email transporter initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
    }
  }

  /**
   * Initialize Twilio client for SMS
   */
  private initializeTwilioClient() {
    const accountSid = process.env.TWILIO_NOTIFICATION_ACCOUNT_SID;
    const authToken = process.env.TWILIO_NOTIFICATION_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_NOTIFICATION_FROM_PHONE;

    if (accountSid && authToken && fromPhone) {
      try {
        this.twilioClient = Twilio(accountSid, authToken);
        console.log('✅ Twilio SMS client initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Twilio client:', error);
      }
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(options: NotificationOptions): Promise<boolean> {
    if (!this.emailTransporter || !options.email) {
      console.warn('⚠️ Email transporter not configured or email not provided');
      return false;
    }

    try {
      const info = await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'StreamLine <noreply@streamline.app>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message,
      });

      console.log(`✅ Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send SMS notification via Twilio
   */
  async sendSMS(options: NotificationOptions): Promise<boolean> {
    if (!this.twilioClient || !options.phone) {
      console.warn('⚠️ Twilio client not configured or phone not provided');
      return false;
    }

    const fromPhone = process.env.TWILIO_NOTIFICATION_FROM_PHONE;
    if (!fromPhone) {
      console.error('❌ TWILIO_NOTIFICATION_FROM_PHONE not configured');
      return false;
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: fromPhone,
        to: options.phone,
      });

      console.log(`✅ SMS sent: ${message.sid}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      return false;
    }
  }

  /**
   * Send notification via all enabled channels
   */
  async sendNotification(options: NotificationOptions): Promise<void> {
    const promises: Promise<boolean>[] = [];

    if (options.email) {
      promises.push(this.sendEmail(options));
    }

    if (options.phone) {
      promises.push(this.sendSMS(options));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Format event for real-time notification
   */
  formatEventNotification(event: EventData, subaccountName: string): NotificationOptions {
    const eventTypePretty = event.eventType.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    const subject = `[StreamLine] ${eventTypePretty}`;
    const message = `New event received for ${subaccountName}:\n\nEvent Type: ${event.eventType}\nReceived At: ${event.receivedAt.toISOString()}\n\nView details in your StreamLine dashboard.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">StreamLine Event Notification</h2>
        <p>New event received for <strong>${subaccountName}</strong></p>

        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Event Type:</strong> ${event.eventType}</p>
          <p><strong>Received At:</strong> ${event.receivedAt.toLocaleString()}</p>
          <p><strong>Event ID:</strong> ${event.id}</p>
        </div>

        <p>View full details in your <a href="${process.env.FRONTEND_URL}/dashboard/events" style="color: #6366f1;">StreamLine dashboard</a>.</p>
      </div>
    `;

    return { subject, message, html };
  }

  /**
   * Format daily summary notification
   */
  formatDailySummary(
    events: EventData[],
    subaccountName: string,
    startDate: Date,
    endDate: Date
  ): NotificationOptions {
    const subject = `[StreamLine] Daily Summary for ${subaccountName}`;

    // Group events by type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventTypeList = Object.entries(eventsByType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `  • ${type}: ${count}`)
      .join('\n');

    const message = `Daily Event Summary for ${subaccountName}\n\nPeriod: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n\nTotal Events: ${events.length}\n\nBreakdown by type:\n${eventTypeList}\n\nView details in your StreamLine dashboard.`;

    const eventTypeHtml = Object.entries(eventsByType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `<li><strong>${type}:</strong> ${count} events</li>`)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">StreamLine Daily Summary</h2>
        <p>Event summary for <strong>${subaccountName}</strong></p>

        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Period:</strong> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
          <p><strong>Total Events:</strong> ${events.length}</p>
        </div>

        <h3 style="color: #374151;">Breakdown by Event Type</h3>
        <ul style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          ${eventTypeHtml}
        </ul>

        <p>View full details in your <a href="${process.env.FRONTEND_URL}/dashboard/events" style="color: #6366f1;">StreamLine dashboard</a>.</p>
      </div>
    `;

    return { subject, message, html };
  }

  /**
   * Check if email transporter is configured
   */
  isEmailConfigured(): boolean {
    return this.emailTransporter !== null;
  }

  /**
   * Check if SMS is configured
   */
  isSMSConfigured(): boolean {
    return this.twilioClient !== null;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

# Notification Setup Guide

Complete guide to configure email and SMS notifications for StreamLine.

## 📧 Email Notifications

You can choose between Gmail (SMTP) or SendGrid. Gmail is easier for testing, SendGrid is better for production.

---

### Option 1: Gmail Setup (Recommended for Testing)

**Pros:**
- ✅ Free and easy to set up
- ✅ Good for development and testing
- ✅ No account creation needed (use existing Gmail)

**Cons:**
- ❌ Daily sending limits (500 emails/day)
- ❌ May be flagged as spam if sending to non-Gmail addresses
- ❌ Less reliable for production use

#### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Find "How you sign in to Google" section
3. Click "2-Step Verification"
4. Follow the prompts to enable it (requires phone)
5. ✅ You should see "2-Step Verification: On"

#### Step 2: Create App-Specific Password

1. Go back to https://myaccount.google.com/security
2. Find "2-Step Verification" section
3. Scroll to the bottom and click **"App passwords"**
4. You may need to sign in again
5. Select app: **"Mail"**
6. Select device: **"Other (Custom name)"**
7. Type: `StreamLine Notifications`
8. Click **"Generate"**
9. **Copy the 16-character password** (format: `abcd efgh ijkl mnop`)
10. ⚠️ Save it - you won't see it again!

#### Step 3: Update backend/.env

Edit `/backend/.env`:

```bash
# Keep these settings
EMAIL_PROVIDER=smtp
EMAIL_FROM=StreamLine <noreply@streamline.app>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Update these with your credentials
SMTP_USER=youractual@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # The 16-char password from Step 2
```

#### Step 4: Test Your Configuration

```bash
cd backend
npm run test:email
```

You should receive a test email at your Gmail address! 🎉

**Troubleshooting:**
- ❌ "Invalid credentials" → Check you used app-specific password, not your Gmail password
- ❌ "Authentication failed" → Make sure 2FA is enabled
- ❌ No email received → Check your spam folder

---

### Option 2: SendGrid Setup (Recommended for Production)

**Pros:**
- ✅ More reliable delivery
- ✅ Better spam reputation
- ✅ Higher sending limits (100/day free, unlimited paid)
- ✅ Email analytics and tracking
- ✅ Professional setup

**Cons:**
- ❌ Requires account creation
- ❌ Must verify sender email
- ❌ Slightly more setup steps

#### Step 1: Create SendGrid Account

1. Go to https://signup.sendgrid.com/
2. Sign up for free account
3. Verify your email address
4. Complete the getting started form

#### Step 2: Create API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
   - Direct link: https://app.sendgrid.com/settings/api_keys
2. Click **"Create API Key"**
3. Name: `StreamLine Notifications`
4. Permission: Choose **"Full Access"** (or minimum "Mail Send")
5. Click **"Create & View"**
6. **Copy the API key** (starts with `SG.`)
7. ⚠️ Save it immediately - you can't retrieve it later!

#### Step 3: Verify Sender Email

SendGrid requires sender verification:

1. Go to **Settings** → **Sender Authentication**
   - Direct link: https://app.sendgrid.com/settings/sender_auth
2. Choose **"Single Sender Verification"** (easiest)
3. Fill in the form:
   - **From Name**: `StreamLine`
   - **From Email**: Your email (can be Gmail, business email, etc.)
   - **Reply To**: Same email or different
   - Other fields as appropriate
4. Click **"Create"**
5. Check your email inbox
6. Click the verification link
7. Wait for status to show "Verified" ✅

#### Step 4: Update backend/.env

Edit `/backend/.env`:

```bash
# Change provider to SendGrid
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=StreamLine <your-verified-email@example.com>  # MUST match verified email

# Comment out SMTP settings
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-specific-password

# Add your SendGrid API key
SENDGRID_API_KEY=SG.your-actual-api-key-here
```

#### Step 5: Test Your Configuration

```bash
cd backend
npm run test:email
```

You should receive a test email! 🎉

**Troubleshooting:**
- ❌ "Sender not verified" → Make sure you clicked the verification link in your email
- ❌ "Invalid API key" → Check you copied the entire key starting with `SG.`
- ❌ No email received → Check SendGrid Activity Feed for errors

---

## 📱 SMS Notifications (Optional)

SMS notifications use Twilio Messages API.

**Cost:** ~$0.0075 per SMS in the US (varies by country)

### Step 1: Get Twilio Credentials

You need a Twilio account **separate from the subaccounts you're monitoring**.

1. Log in to Twilio Console: https://console.twilio.com/
2. From the dashboard, find:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "Show" to reveal)

### Step 2: Get a Twilio Phone Number

You need a Twilio phone number to send SMS from:

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
   - Direct link: https://console.twilio.com/us1/develop/phone-numbers/manage/search
2. Choose your country
3. Check "SMS" capability
4. Click "Search"
5. Pick a number and click "Buy"
6. Copy the phone number (format: `+12345678900`)

**Or use existing number:**
- Go to **Phone Numbers** → **Manage** → **Active numbers**
- Copy any SMS-enabled number you already have

### Step 3: Update backend/.env

Edit `/backend/.env`:

```bash
# Update with your actual Twilio credentials
TWILIO_NOTIFICATION_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_NOTIFICATION_AUTH_TOKEN=your-32-character-auth-token
TWILIO_NOTIFICATION_FROM_PHONE=+12345678900  # Your Twilio number
```

### Step 4: Test Your Configuration

```bash
cd backend
npm run test:sms +12345678900  # Your personal phone number
```

You should receive a test SMS! 🎉

**Troubleshooting:**
- ❌ "Invalid credentials" → Check Account SID and Auth Token
- ❌ "Invalid From number" → Must use a Twilio number you own
- ❌ "Invalid To number" → Must include country code (e.g., `+1` for US)
- ❌ "Trial account" → Verify recipient's phone number in Twilio Console first
- ❌ "Insufficient funds" → Add credit to your Twilio account

---

## 🚀 Start Notification Workers

After configuring email and/or SMS, start the notification workers:

```bash
# Terminal 1: Event processor (handles real-time notifications)
cd backend
npm run worker

# Terminal 2: Daily summary scheduler
cd backend
npm run worker:summary

# Terminal 3: Main backend (if not already running)
cd backend
npm run dev
```

## ✅ Verify Everything Works

### 1. Check Service Status

```bash
curl http://localhost:3001/api/notifications/status
```

Should return:
```json
{
  "emailConfigured": true,
  "smsConfigured": true  // or false if you skipped SMS
}
```

### 2. Configure Notifications in UI

1. Open http://localhost:3000
2. Login to your account
3. Go to **Dashboard** → **Notifications** (🔔 in sidebar)
4. Toggle email/SMS on
5. Enter your contact information
6. Choose frequency (Real-time, Daily, or Both)
7. Click **"Send Test Email"** or **"Send Test SMS"**
8. Check you receive the test notification
9. Click **"Save Preferences"**

### 3. Test Real-time Notifications

1. Make sure you have:
   - Backend running (`npm run dev`)
   - Event worker running (`npm run worker`)
   - Notification preferences saved
   - Real-time frequency enabled
2. Trigger a Twilio event (send SMS, make call, etc.)
3. You should receive a notification within 2 seconds!

### 4. Test Daily Summary

Daily summaries run on a schedule (default: 9 AM UTC).

**Test immediately:**
```bash
cd backend
# Temporarily change cron to run every minute for testing
# Edit src/workers/daily-summary.ts line: const cronTime = '* * * * *';
npm run worker:summary
```

Wait 1 minute, and you should receive a summary email!

**Restore normal schedule:**
```bash
# Change back to: const cronTime = process.env.DAILY_SUMMARY_CRON || '0 9 * * *';
```

---

## 📊 Notification Examples

### Real-time Email Example

**Subject:** `[StreamLine] Messaging Message Sent`

**Body:**
```
New event received for My Subaccount

Event Type: messaging.message.sent
Received At: 2026-04-10 10:15:23 AM
Event ID: EV1234567890

View full details in your StreamLine dashboard.
```

### Daily Summary Email Example

**Subject:** `[StreamLine] Daily Summary for My Subaccount`

**Body:**
```
Daily Event Summary for My Subaccount
Period: Apr 9, 2026 - Apr 10, 2026

Total Events: 47

Breakdown by type:
• messaging.message.sent: 25 events
• messaging.message.delivered: 20 events
• call.started: 2 events

View details in your StreamLine dashboard.
```

### SMS Example

```
[StreamLine] New event: messaging.message.sent for My Subaccount. 
View at http://localhost:3000/dashboard/events
```

---

## 🔧 Advanced Configuration

### Change Daily Summary Time

Edit `backend/.env`:
```bash
# Run at 6 PM UTC instead of 9 AM
DAILY_SUMMARY_CRON=0 18 * * *

# Run twice daily at 9 AM and 6 PM
DAILY_SUMMARY_CRON=0 9,18 * * *

# Run weekdays only at 9 AM
DAILY_SUMMARY_CRON=0 9 * * 1-5
```

Restart the summary worker to apply changes.

### Email Rate Limiting

**Gmail:** 500 emails/day limit
**SendGrid Free:** 100 emails/day limit
**SendGrid Paid:** Unlimited

If you hit limits, consider:
- Using daily summaries instead of real-time
- Filtering events more strictly
- Upgrading to SendGrid paid plan

### SMS Cost Optimization

SMS costs add up quickly:
- 100 SMS/day = ~$22.50/month
- Use email for high-volume notifications
- Use SMS only for critical events
- Use daily summaries to reduce SMS count

---

## 🆘 Common Issues

### "Email transporter not configured"
- ✅ Check you updated `.env` file
- ✅ Restart backend worker
- ✅ Run `npm run test:email` to verify

### "Twilio client not configured"
- ✅ Check all three Twilio SMS variables are set
- ✅ Restart backend worker
- ✅ Run `npm run test:sms` to verify

### "Notification sent but not received"
- ✅ Check spam/junk folder
- ✅ Verify email address is correct
- ✅ For SendGrid: check Activity Feed in dashboard
- ✅ For SMS: check Twilio Console → Logs → Messages

### "Test works but real notifications don't"
- ✅ Make sure event worker is running (`npm run worker`)
- ✅ Check console logs for errors
- ✅ Verify notification preferences are saved in UI
- ✅ Check event type filters aren't blocking all events

---

## 📚 Next Steps

After setup is complete:
1. ✅ Configure your notification preferences in the dashboard
2. ✅ Test with real Twilio events
3. ✅ Adjust event filters as needed
4. ✅ Monitor notification costs (especially SMS)
5. ✅ Consider upgrading to SendGrid paid for production

**Questions?** Check the [main README](../README.md) or [TESTING guide](../TESTING.md).

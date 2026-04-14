# StreamLine - Testing Guide

Complete guide to test all features of StreamLine.

## Prerequisites

Make sure you have:
- ✅ Backend and frontend running (`npm run dev`)
- ✅ Worker process running (`cd backend && npm run worker`)
- ✅ PostgreSQL and Redis running
- ✅ ngrok tunnel active (for webhook testing)

## Test Scenarios

### 1. User Authentication Flow

#### Test Registration

1. Navigate to http://localhost:3000
2. Click "Get Started" or "Register"
3. Fill in the registration form:
   - Email: `test@streamline.app`
   - Password: `Password123!`
   - Confirm Password: `Password123!`
4. Click "Sign Up"

**Expected:**
- ✅ User is created
- ✅ JWT token is returned
- ✅ Automatically redirected to `/dashboard`
- ✅ User email shown in header

#### Test Login/Logout

1. Click "Logout" in the header
2. Verify redirect to `/login`
3. Login with:
   - Email: `test@streamline.app`
   - Password: `Password123!`
4. Click "Sign In"

**Expected:**
- ✅ Successful login
- ✅ Redirected to `/dashboard`
- ✅ Session persists on page refresh

### 2. Subaccount Management

#### Add Subaccount

1. From the dashboard, click the "+" icon in the sidebar (or "Add Subaccount" button)
2. Fill in the modal:
   - **Friendly Name:** `My Test Account`
   - **Twilio Account SID:** Your actual Twilio SID (starts with `AC`)
   - **API Key:** Your actual Twilio API key
3. Click "Add Subaccount"

**Expected:**
- ✅ Credentials validated via Twilio API
- ✅ Auth token encrypted and stored
- ✅ Unique webhook URL generated (e.g., `/v1/ingest/abc-123-def`)
- ✅ Twilio Sink automatically created
- ✅ Subaccount appears in sidebar
- ✅ Automatically selected as active

**Backend Logs to Check:**
```
✅ Created test user: test@streamline.app
✅ Sink created: DGxxxxxxx
```

**Verify in Twilio Console:**
1. Go to Twilio Console → Monitor → Events → Sinks
2. You should see a new Sink with name "StreamLine - My Test Account"
3. Webhook URL should match your ngrok URL

#### Switch Between Subaccounts

1. Add a second subaccount (different SID)
2. Click on different subaccounts in the sidebar

**Expected:**
- ✅ Active subaccount changes (highlighted in blue)
- ✅ Dashboard updates with correct SID
- ✅ URL updates (if applicable)
- ✅ Events page only shows events for active subaccount

#### Delete Subaccount

1. (Note: Delete functionality needs to be added to UI - currently backend-only)
2. Test via API:
   ```bash
   curl -X DELETE http://localhost:3001/api/subaccounts/{subaccount_id} \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

**Expected:**
- ✅ Subaccount removed from database
- ✅ Twilio Sink deleted
- ✅ All events and subscriptions cascade deleted

### 3. Event Subscriptions

#### View Available Event Types

1. Select a subaccount from sidebar
2. Click "Subscriptions" in the navigation
3. Wait for event types to load

**Expected:**
- ✅ List of Twilio event types displayed
- ✅ Events grouped by namespace (e.g., `com.twilio.messaging`)
- ✅ Search bar functional
- ✅ "Select All" / "Deselect All" buttons work

#### Configure Subscriptions

1. On the Subscriptions page, select event types:
   - `com.twilio.messaging.message.sent`
   - `com.twilio.messaging.message.delivered`
   - `com.twilio.voice.call.initiated`
2. Click "Save Changes"

**Expected:**
- ✅ "Saving..." indicator appears
- ✅ Success message: "Subscriptions updated successfully!"
- ✅ Selected events marked as "Active"
- ✅ Twilio Subscription resource created/updated

**Backend Logs:**
```
✅ Subscription created: SUxxxxxxx
✅ Event types updated: 3 types
```

**Verify in Twilio Console:**
1. Go to Twilio Console → Monitor → Events → Subscriptions
2. You should see a new Subscription linked to your Sink
3. Event types should match your selection

#### Test Search Functionality

1. Type "message" in the search box

**Expected:**
- ✅ Only messaging-related events shown
- ✅ Count updates (e.g., "3 of 50 event types selected")

### 4. Live Event Monitoring

#### Trigger Test Events

**Option A: Send a Test SMS (Easiest)**

1. Use Twilio Console → Messaging → Try it out
2. Send an SMS from your Twilio number to any phone
3. Or use Twilio CLI:
   ```bash
   twilio api:core:messages:create \
     --from "+1234567890" \
     --to "+0987654321" \
     --body "Test message from StreamLine"
   ```

**Option B: Make a Test Call**

1. Use Twilio Console → Voice → Try it out
2. Make a test call
3. Or use Twilio CLI:
   ```bash
   twilio api:core:calls:create \
     --from "+1234567890" \
     --to "+0987654321" \
     --url "http://demo.twilio.com/docs/voice.xml"
   ```

#### Monitor Events in Real-Time

1. Navigate to `/dashboard/events`
2. Trigger events using methods above

**Expected:**
- ✅ Connection status shows "Connected" (green dot, pulsing)
- ✅ New events appear immediately (< 1.5 seconds)
- ✅ Event cards show:
  - Event type (color-coded)
  - Preview (From/To/Status/Body)
  - Timestamp ("3s ago", "2m ago")
- ✅ Events sorted by newest first

**Backend Flow (Check Logs):**
```
✅ Event queued: com.twilio.messaging.message.sent for subaccount My Test Account
✅ Job 12345 completed
✅ Processed event EV123... for subaccount abc-123-def
```

**Frontend (Check Browser Console):**
```
✅ WebSocket connected
📡 Joined room: abc-123-def
🔔 New event received: {id: "...", eventType: "..."}
```

#### View Event Details

1. Click on any event card in the live feed

**Expected:**
- ✅ Modal opens with event details
- ✅ Metadata displayed (Event ID, SID, Type, Timestamp)
- ✅ JSON payload shown with syntax highlighting
- ✅ "Copy JSON" button works
- ✅ Human-readable summary shows (e.g., "Message sent from +123 to +456: 'Hello'")

#### Test Event Filtering by Subaccount

1. Add two subaccounts
2. Configure subscriptions for both
3. Trigger events for Subaccount A
4. Go to `/dashboard/events` (should show Subaccount A events)
5. Switch to Subaccount B via sidebar
6. Verify events list clears and shows only Subaccount B events

**Expected:**
- ✅ **Strict isolation:** Events never leak between subaccounts
- ✅ WebSocket leaves old room, joins new room
- ✅ Event list updates

### 5. WebSocket Connection Testing

#### Test Auto-Reconnect

1. Stop the backend server
2. Check connection status on `/dashboard/events`

**Expected:**
- ✅ Status changes to "Disconnected" (red dot)

3. Restart backend server

**Expected:**
- ✅ Auto-reconnect after a few seconds
- ✅ Status changes to "Connected"
- ✅ Automatically rejoins active subaccount room

#### Test Room Switching

1. Open browser DevTools → Network → WS tab
2. Switch between subaccounts
3. Observe WebSocket messages

**Expected:**
- ✅ `leave-subaccount` event sent for old room
- ✅ `join-subaccount` event sent for new room
- ✅ `room-joined` acknowledgment received

### 6. Error Handling & Edge Cases

#### Invalid Twilio Credentials

1. Try to add a subaccount with:
   - Invalid SID format (e.g., `XYZ123`)
   - Incorrect API key

**Expected:**
- ✅ Validation error: "Invalid Twilio Account SID format"
- ✅ API validation error: "Invalid Twilio credentials"

#### Duplicate Subaccount

1. Try to add the same Twilio SID twice

**Expected:**
- ✅ Error: "This subaccount is already linked"

#### No Subscriptions Selected

1. Go to Subscriptions page
2. Deselect all event types
3. Try to save

**Expected:**
- ✅ Error: "Please select at least one event type"

#### No Active Subaccount

1. Logout and login (clears active subaccount if DB empty)
2. Navigate to `/dashboard/events`

**Expected:**
- ✅ Placeholder message: "No Subaccount Selected"
- ✅ Instruction to select from sidebar

### 7. Performance Testing

#### High-Volume Events

1. Trigger 10+ events rapidly (use a script or Twilio's bulk API)
2. Monitor `/dashboard/events`

**Expected:**
- ✅ Events appear in real-time without lag
- ✅ No duplicate events
- ✅ UI remains responsive
- ✅ Worker processes events without backlog

**Check Redis Queue:**
```bash
redis-cli
> LLEN bull:webhook-events:wait
```

Should be 0 or very low (worker is keeping up).

#### Multiple Browser Tabs

1. Open `/dashboard/events` in two tabs
2. Trigger an event

**Expected:**
- ✅ Both tabs receive the event
- ✅ No conflicts or duplicates

### 8. Security Testing

#### API Key Protection

1. Check database:
   ```sql
   SELECT twilio_auth_token_encrypted FROM twilio_subaccounts LIMIT 1;
   ```

**Expected:**
- ✅ Token is encrypted (looks like: `abc123:def456:789...`)
- ✅ NOT plaintext

#### Ownership Verification

1. Get JWT token for User A
2. Get subaccount ID for User B
3. Try to access User B's subaccount as User A:
   ```bash
   curl http://localhost:3001/api/events/{user_b_subaccount_id} \
     -H "Authorization: Bearer USER_A_TOKEN"
   ```

**Expected:**
- ✅ 403 Forbidden: "Access denied: You do not own this subaccount"

#### Invalid Webhook Token

1. Send a POST to a random webhook URL:
   ```bash
   curl -X POST http://localhost:3001/v1/ingest/invalid-token-123 \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

**Expected:**
- ✅ 404 Not Found: "Invalid webhook token"
- ✅ Event NOT processed

## Troubleshooting Tests

### Events Not Appearing

**Check 1: Webhook URL**
```bash
# Get webhook URL from API
curl http://localhost:3001/api/subaccounts/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return webhook URL with ngrok domain
```

**Check 2: ngrok Status**
```bash
curl https://your-ngrok-url.ngrok.io/v1/ingest/health
# Should return: {"status":"ok"}
```

**Check 3: Twilio Sink Configuration**
- Go to Twilio Console → Events → Sinks
- Click on your Sink
- Verify "Destination" matches ngrok URL

**Check 4: Worker Running**
```bash
# Should see worker logs
cd backend && npm run worker
```

### WebSocket Not Connecting

**Check 1: Backend Running**
```bash
curl http://localhost:3001/health
```

**Check 2: Browser Console**
- Should see: `✅ Connected to WebSocket`
- If seeing `connect_error`, check CORS settings

**Check 3: Token Valid**
```bash
# Decode JWT
jwt decode YOUR_TOKEN
# Verify userId exists
```

## Success Criteria

All tests pass if:
- ✅ Users can register, login, and manage sessions
- ✅ Subaccounts can be added with automatic Sink creation
- ✅ Subscriptions can be configured and saved to Twilio
- ✅ Events appear in real-time (< 1.5s latency)
- ✅ Strict workspace isolation (no data leakage)
- ✅ WebSocket auto-reconnects
- ✅ UI is responsive and error-free

## Next Steps After Testing

- Deploy to production (see DEPLOYMENT.md)
- Set up monitoring (Sentry, LogRocket)
- Configure backups for PostgreSQL
- Set up SSL certificates
- Implement user profile management
- Add event filtering/search in UI
- Implement event export (CSV/JSON)

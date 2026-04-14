# Google OAuth Setup Guide

This guide walks you through setting up "Sign in with Google" for StreamLine.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" dropdown at the top
3. Click "New Project"
4. Enter project name: "StreamLine" (or your preferred name)
5. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for public use) or **Internal** (for organization only)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: StreamLine
   - **User support email**: Your email
   - **App logo**: (optional) Upload your logo
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes"
   - Add: `./auth/userinfo.email`
   - Add: `./auth/userinfo.profile`
   - Click "Update" then "Save and Continue"
7. **Test users** (if External): Add test emails during development
8. Click "Save and Continue" then "Back to Dashboard"

## Step 4: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Select **Application type**: Web application
4. **Name**: StreamLine Web Client
5. **Authorized JavaScript origins**:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
6. **Authorized redirect URIs**:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.yourdomain.com/api/auth/google/callback`
7. Click "Create"
8. **IMPORTANT**: Copy your **Client ID** and **Client Secret**

## Step 5: Add Credentials to Environment Variables

### Backend (.env)

Add the following to `backend/.env`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
BACKEND_URL=http://localhost:3001
```

**For production**, update `BACKEND_URL`:
```bash
BACKEND_URL=https://api.yourdomain.com
```

### Frontend (.env.local)

The frontend should already have:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Step 6: Restart Your Services

```bash
# If using start.sh
./start.sh

# Or manually restart
cd backend && npm run dev
cd frontend && npm run dev
```

You should see in the backend logs:
```
✅ Google OAuth configured
```

## Step 7: Test the Integration

1. Go to http://localhost:3000/login
2. Click "Sign in with Google"
3. Select your Google account
4. Grant permissions (email and profile)
5. You should be redirected back to StreamLine and logged in!

## Production Deployment

### Update Authorized URIs in Google Console

When deploying to production, add your production URLs:

**Authorized JavaScript origins:**
- `https://streamline.yourdomain.com`

**Authorized redirect URIs:**
- `https://api.streamline.yourdomain.com/api/auth/google/callback`

### Update Environment Variables

**Backend production .env:**
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
BACKEND_URL=https://api.streamline.yourdomain.com
FRONTEND_URL=https://streamline.yourdomain.com
```

**Frontend production .env:**
```bash
NEXT_PUBLIC_API_URL=https://api.streamline.yourdomain.com
```

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI doesn't match what's configured in Google Console.

**Fix**:
1. Check the exact URL in the error message
2. Add it to "Authorized redirect URIs" in Google Console
3. Make sure `BACKEND_URL` in backend/.env matches

### Error: "Access blocked: Authorization Error"

**Cause**: OAuth consent screen not published or user not in test users list.

**Fix**:
- If using **External** app type and still in testing:
  - Go to OAuth consent screen
  - Add user emails to "Test users"
- Or publish your app:
  - Go to OAuth consent screen
  - Click "Publish App"

### Google login button doesn't appear

**Cause**: Google OAuth not configured in backend.

**Check**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `backend/.env`
2. Check backend logs for: `✅ Google OAuth configured`
3. If you see `⚠️  Google OAuth not configured`, check your environment variables

### User gets "This account was created using google" error

**Cause**: User previously signed up with Google, now trying to use email/password.

**Fix**: Tell the user to use "Sign in with Google" instead.

### OAuth works locally but not in production

**Common issues**:
1. **Missing production URLs** in Google Console authorized URIs
2. **Wrong BACKEND_URL** environment variable in production
3. **HTTPS required** - Google OAuth requires HTTPS in production
4. **Cookie/CORS issues** - Ensure CORS is configured correctly

## Security Notes

### Protecting Client Secrets

**Development**:
- Store in `backend/.env` (gitignored)
- Never commit secrets to git

**Production**:
- Use environment variables (Heroku Config Vars, AWS Secrets Manager, etc.)
- Never hardcode secrets in code
- Rotate secrets periodically

### OAuth Scope Minimal Principle

We only request:
- `profile` - User's name and picture
- `email` - User's email address

Never request more permissions than needed.

### Account Linking

When a user signs up with email/password and later uses Google OAuth (or vice versa):
- If the emails match, the accounts are automatically linked
- The user can then use either method to log in

## Advanced: Custom Domain for OAuth

If you want cleaner OAuth URLs:

1. **Use a custom domain**: `auth.streamline.com`
2. **Update authorized URIs**:
   - `https://auth.streamline.com/api/auth/google/callback`
3. **Point domain to backend** in DNS

## FAQ

### Q: Can users have multiple OAuth providers?

A: Currently, StreamLine supports Google OAuth and email/password. Each user is identified by email address, so the same email can use different auth methods.

### Q: What happens if a user signs up with email/password, then uses Google OAuth?

A: If the emails match, the accounts are automatically linked. The user can then use either method to log in.

### Q: Can I disable email/password login?

A: Yes, you can modify the frontend to hide the email/password form and only show Google OAuth. However, you'll need to handle admin access separately.

### Q: Do I need to store Google access tokens?

A: No. StreamLine uses Google OAuth only for authentication, not for accessing Google APIs. We generate our own JWT tokens for session management.

### Q: How do I test OAuth without publishing my app?

A: Use the **Test users** feature in Google OAuth consent screen. Add test email addresses who can authenticate even when the app is in "Testing" mode.

## Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen Configuration](https://support.google.com/cloud/answer/10311615)
- [Passport.js Google OAuth Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)

## Support

If you encounter issues:
1. Check backend logs for OAuth-related errors
2. Verify all environment variables are set correctly
3. Ensure authorized URIs match exactly (including http vs https)
4. Check Google Cloud Console audit logs for rejected requests

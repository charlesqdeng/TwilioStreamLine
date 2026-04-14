# How to Get Your Twilio API Key

API Keys are more secure than Auth Tokens and are the recommended way to authenticate with Twilio.

## 🔑 Create a New API Key

### Step 1: Log into Twilio Console
Go to https://console.twilio.com

### Step 2: Navigate to API Keys
1. Click on **Account** in the left sidebar
2. Click on **API keys & tokens**
3. Or go directly to: https://console.twilio.com/us1/account/keys-credentials/api-keys

### Step 3: Create API Key
1. Click the **"Create API Key"** button (blue button on the right)
2. Fill in the form:
   - **Friendly Name:** e.g., "StreamLine App"
   - **Key Type:** Select **"Standard"**
3. Click **"Create API Key"**

### Step 4: Save Your Credentials
⚠️ **IMPORTANT:** You'll only see the API Key Secret once!

**Copy both values:**
- **SID:** Starts with `SK...` (you can see this anytime)
- **Secret:** Long random string (you can ONLY see this once!)

**For StreamLine, you need:**
- **Account SID:** Your main account SID (starts with `AC...`)
- **API Key Secret:** The secret you just copied

### Step 5: Add to StreamLine
When adding a subaccount in StreamLine:
1. **Twilio Account SID:** Your `AC...` SID (find in Console → Account)
2. **API Key:** Paste the **API Key Secret** (the long random string)

---

## 🆚 API Key vs Auth Token

| Feature | API Key (Recommended) | Auth Token |
|---------|----------------------|------------|
| Security | ✅ More secure | ⚠️ Less secure |
| Rotation | ✅ Easy to rotate | ⚠️ Difficult |
| Revocation | ✅ Revoke without affecting other integrations | ❌ Affects all integrations |
| Permissions | ✅ Can be scoped | ❌ Full account access |
| Best Practice | ✅ **Use this!** | ❌ Avoid for production |

---

## 📍 Where to Find Your Account SID

Your Account SID is displayed at the top of your Twilio Console:
- https://console.twilio.com
- Look for **"Account SID"** in the main dashboard
- It starts with `AC...`

---

## 🔒 Security Tips

1. **Never commit API Keys to Git** - they're secrets!
2. **Create separate API Keys** for each application
3. **Rotate API Keys regularly** (every 90 days recommended)
4. **Delete unused API Keys** to reduce attack surface
5. **Use Standard keys** for most applications (not Master keys)

---

## ❓ Troubleshooting

### "Invalid API Key" error
- Make sure you copied the **Secret** (not the SID)
- The secret is only shown once when you create the key
- If you lost it, create a new API Key

### Can't find API Keys section
- Go to: https://console.twilio.com/us1/account/keys-credentials/api-keys
- Make sure you're logged into the correct Twilio account

### Need to create another key?
- You can have multiple API Keys
- Each can have a different name
- Recommended: one key per application

---

## 📚 More Info

- [Twilio API Keys Documentation](https://www.twilio.com/docs/iam/keys/api-key)
- [Twilio Security Best Practices](https://www.twilio.com/docs/usage/security)

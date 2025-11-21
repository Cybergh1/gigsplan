# 🔥 Firebase Service Account Setup Guide

## 📝 What You Need

To use Firebase Admin SDK in Vercel, you need a **Service Account JSON** file from Firebase.

---

## 🔑 Step 1: Get Your Service Account JSON

### 1.1 Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Select your project: **user-dashboard-8432d**

### 1.2 Navigate to Service Accounts
1. Click the **⚙️ Settings** icon (top left)
2. Select **Project settings**
3. Click the **Service accounts** tab

### 1.3 Generate New Private Key
1. Scroll down to **Firebase Admin SDK**
2. Click **Generate new private key**
3. Click **Generate key** in the confirmation dialog
4. A JSON file will download automatically (e.g., `user-dashboard-8432d-firebase-adminsdk-xxxxx.json`)

**⚠️ IMPORTANT:** Keep this file secure! It contains private keys.

---

## 📋 Step 2: Prepare the JSON for Vercel

The JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "user-dashboard-8432d",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@user-dashboard-8432d.iam.gserviceaccount.com",
  "client_id": "1234567890...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Option 1: Use JSON.stringify() (Recommended)

1. Open the downloaded JSON file in a text editor
2. Copy the entire content
3. Open your browser console (F12)
4. Run this command:
```javascript
JSON.stringify(YOUR_JSON_HERE)
```
5. Copy the result (it will be a single-line string with escaped characters)

### Option 2: Minify Manually

1. Remove all newlines and extra spaces
2. Make sure the `\n` in the private_key stays as `\n` (don't remove those!)
3. Wrap in single quotes

**Example of prepared JSON (single line):**
```
'{"type":"service_account","project_id":"user-dashboard-8432d","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@...","client_id":"123...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

---

## ☁️ Step 3: Add to Vercel

### 3.1 Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Select your project: **api-snowy-eight**

### 3.2 Add Environment Variable
1. Go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Fill in:

**Name:**
```
FIREBASE_SERVICE_ACCOUNT
```

**Value:**
```
{"type":"service_account","project_id":"user-dashboard-8432d",...}
```
Paste your stringified JSON here (the entire JSON as one line)

**Environments:**
- ✅ Production
- ✅ Preview
- ✅ Development

4. Click **Save**

### 3.3 Verify Other Variables

Make sure you also have these two variables:

**BULK_SMS_API_KEY**
```
Your Bulk SMS Ghana API key
```

**BULK_SMS_SENDER_ID**
```
Your approved sender ID
```

---

## 🚀 Step 4: Redeploy

After adding the environment variable, redeploy your project:

```bash
cd "c:\Users\lenovo\Pictures\PHP KTECH"
vercel --prod
```

---

## ✅ Step 5: Test It

### Test the API manually:

```bash
curl -X POST https://api-snowy-eight.vercel.app/api/send-2fa-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"233241234567","userId":"test123"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expiresIn": 300
}
```

If you get an error about Firebase, check:
- ✅ Service account JSON is valid
- ✅ It's properly stringified (single line)
- ✅ No extra quotes or characters
- ✅ Redeployed after adding the variable

---

## 🔒 Firestore Collection Created

The API will automatically create a collection named:
```
2fa_verifications
```

### Document Structure:
```javascript
{
  code: "123456",                    // 6-digit code
  phoneNumber: "233241234567",       // Normalized phone
  createdAt: 1234567890,             // Timestamp
  expiresAt: 1234567890 + 300000,    // 5 min expiry
  attempts: 0,                       // Failed attempts
  verified: false                    // Verification status
}
```

### Document Lifecycle:
1. **Created** when code is sent
2. **Updated** when user attempts verification
3. **Deleted** automatically:
   - After 10 seconds of successful verification
   - When expired
   - After 3 failed attempts

---

## 🧹 Automatic Cleanup

Expired codes are cleaned up automatically:
- After successful verification (10 seconds)
- When expired and user tries again
- Via cleanup endpoint: `GET /api/cleanup-expired-codes`

You can manually trigger cleanup:
```
https://api-snowy-eight.vercel.app/api/cleanup-expired-codes
```

---

## 🛡️ Security Rules

Update your Firestore rules to protect the 2fa_verifications collection:

```javascript
// In firestore.rules
match /2fa_verifications/{userId} {
  // Only server-side via Admin SDK can access this collection
  allow read, write: if false;
}
```

This ensures only your Vercel API (using Admin SDK) can access verification codes.

---

## 🐛 Troubleshooting

### Error: "Firebase Admin initialization failed"
**Solution:**
- Check that FIREBASE_SERVICE_ACCOUNT is set correctly
- Verify the JSON is properly stringified
- Make sure there are no syntax errors in the JSON

### Error: "Permission denied"
**Solution:**
- Download a fresh service account key
- Make sure you selected the correct Firebase project

### Error: "Invalid private key"
**Solution:**
- Ensure the `\n` characters in private_key are preserved
- Don't manually edit the private_key value

---

## 📚 Resources

- **Firebase Console:** https://console.firebase.google.com/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Admin SDK Docs:** https://firebase.google.com/docs/admin/setup

---

## ✨ Done!

Your Firebase Admin SDK is now configured and your 2FA codes will be stored securely in Firestore! 🎉

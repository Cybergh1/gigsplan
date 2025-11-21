# 🔐 Two-Factor Authentication (2FA) Setup Guide

This guide will help you deploy and configure the custom 2FA system using Bulk SMS Ghana.

## 📋 Overview

Your 2FA system consists of:
1. **Vercel Serverless Backend** - Sends and verifies SMS codes
2. **Profile Page UI** - Toggle to enable/disable 2FA
3. **Login Flow** - Automatic 2FA verification during login

## 🚀 Step 1: Deploy to Vercel

### 1.1 Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 1.2 Login to Vercel
```bash
vercel login
```

### 1.3 Deploy Your Project
```bash
cd "c:\Users\lenovo\Pictures\PHP KTECH"
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** Y
- **Which scope?** Select your account
- **Link to existing project?** N (for first deployment)
- **Project name?** gigsplan (or your preferred name)
- **Directory?** ./ (current directory)
- **Override settings?** N

### 1.4 Note Your Deployment URL
After deployment, you'll get a URL like:
```
https://gigsplan.vercel.app
```
**IMPORTANT:** Copy this URL - you'll need it in Step 3!

## 🔑 Step 2: Configure Environment Variables in Vercel

### 2.1 Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Select your project (e.g., `gigsplan`)
3. Go to **Settings** → **Environment Variables**

### 2.2 Add Your Bulk SMS Credentials

Add these two environment variables:

**Variable 1:**
- **Name:** `BULK_SMS_API_KEY`
- **Value:** Your Bulk SMS Ghana API key
- **Environments:** Production, Preview, Development

**Variable 2:**
- **Name:** `BULK_SMS_SENDER_ID`
- **Value:** Your approved sender ID
- **Environments:** Production, Preview, Development

### 2.3 Redeploy After Adding Variables
```bash
vercel --prod
```

## 📝 Step 3: Update API URLs in Your Code

You need to update the API_BASE_URL in two files:

### 3.1 Update script.js
**File:** `script.js`
**Line:** ~5069

✅ **Already Updated!**
```javascript
API_BASE_URL: 'https://api-snowy-eight.vercel.app',
```

### 3.2 Update auth.html
**File:** `auth.html`
**Line:** ~848

✅ **Already Updated!**
```javascript
API_BASE_URL: 'https://api-snowy-eight.vercel.app',
```

## 🔥 Step 4: Update Firebase Security Rules

Add 2FA fields to your Firestore security rules:

```javascript
// In your firestore.rules file
match /users/{userId} {
  allow read: if isOwner(userId);
  allow update: if isOwner(userId) &&
    isValidDataSize(request.resource.data) &&
    // Allow 2FA fields
    (!request.resource.data.keys().hasAny(['twoFAEnabled', 'twoFAPhone']) ||
     (request.resource.data.twoFAEnabled is bool &&
      request.resource.data.twoFAPhone is string));
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## ✅ Step 5: Test the 2FA System

### 5.1 Test Enrollment
1. Login to your app
2. Go to **Profile** page
3. Find the "Two-Factor Authentication" section
4. Toggle the switch ON
5. Enter your phone number (Ghana format: 233XXXXXXXXX or 0XXXXXXXXX)
   - Example: `233241234567` or `0241234567`
6. Click "Send Code"
7. Check your phone for the SMS
8. Enter the 6-digit code
9. Click "Verify & Enable"
10. You should see "2FA Enabled" message

### 5.2 Test Login with 2FA
1. Logout from your account
2. Login again with your email/password
3. You should see the 2FA verification modal
4. Check your phone for the SMS code
5. Enter the code
6. Click "Verify"
7. You should be logged in successfully

### 5.3 Test Disable 2FA
1. Go to Profile page
2. Toggle the 2FA switch OFF
3. Confirm the action
4. You should see "2FA Disabled" message

## 🐛 Troubleshooting

### Problem: "Failed to send code"
**Solution:**
- Check your Bulk SMS API key is correct
- Verify you have SMS credits
- Ensure phone number is in correct format (233XXXXXXXXX or 0XXXXXXXXX)
- Check Vercel logs: `vercel logs`

### Problem: "API_BASE_URL not found"
**Solution:**
- Make sure you updated both `script.js` and `auth.html`
- Redeploy to Vercel after making changes
- Clear browser cache and refresh

### Problem: "Invalid code" even with correct code
**Solution:**
- Codes expire after 5 minutes
- You have max 3 attempts per code
- Request a new code if needed

### Problem: 2FA modal doesn't show
**Solution:**
- Open browser console (F12)
- Check for JavaScript errors
- Verify DOM elements exist
- Check that user has `twoFAEnabled: true` in Firestore

## 📊 Monitoring

### View API Logs
```bash
vercel logs --follow
```

### Check Firestore Data
1. Go to Firebase Console
2. Select your project
3. Go to Firestore Database
4. Find a user document
5. Check for:
   - `twoFAEnabled`: true/false
   - `twoFAPhone`: "+233XXXXXXXXX"
   - `twoFAEnabledAt`: timestamp

## 🔒 Security Best Practices

1. **Never commit** your `.env` file with API keys
2. **Always use** environment variables in Vercel
3. **Monitor** your SMS usage to avoid abuse
4. **Rate limit** login attempts (already implemented)
5. **Rotate** your API keys periodically

## 📱 SMS Message Format

Users will receive:
```
Your gigsplan verification code is: 123456. Valid for 5 minutes. Do not share this code.
```

## 💰 Cost Considerations

- Bulk SMS Ghana charges per SMS
- Each 2FA login requires 1 SMS
- Monitor your usage in Bulk SMS dashboard
- Consider implementing rate limiting per user

## 🎯 Next Steps

1. ✅ Deploy backend to Vercel
2. ✅ Add environment variables
3. ✅ Update API URLs in code
4. ✅ Test enrollment flow
5. ✅ Test login flow
6. ✅ Monitor SMS delivery
7. ✅ Check Firestore data
8. ✅ Deploy to production

## 📞 Support

- **Bulk SMS Ghana:** Contact their support for SMS issues
- **Vercel:** Check https://vercel.com/docs for deployment help
- **Firebase:** See https://firebase.google.com/docs for Firestore help

---

## 🎉 That's it!

Your 2FA system is now fully functional! Users can enable it from their profile page, and it will automatically protect their account during login.

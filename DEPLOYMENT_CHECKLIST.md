# Paystack Server-Side Deployment - Quick Checklist ✅

## Prerequisites

- [ ] Vercel account created
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Paystack account with secret key
- [ ] Firebase project with Admin SDK credentials

---

## Deployment Steps (5 Minutes)

### 1️⃣ Deploy to Vercel

```bash
cd "c:\Users\lenovo\Pictures\PHP KTECH"
vercel login
vercel --prod
```

**Note the deployment URL** (e.g., `https://data4less-abc123.vercel.app`)

---

### 2️⃣ Set Environment Variables

#### Option A: Using Vercel CLI

```bash
# Paystack Secret Key (from Paystack Dashboard → Settings → API Keys & Webhooks)
vercel secrets add paystack-secret-key sk_live_YOUR_KEY_HERE

# Callback URL (where users return after payment)
vercel secrets add paystack-callback-url https://data4less.site/dashboard

# Firebase Service Account (get from Firebase Console → Project Settings → Service Accounts)
vercel secrets add firebase-service-account '{"type":"service_account","project_id":"...",...}'
```

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add three variables:

| Name | Value | Notes |
|------|-------|-------|
| `PAYSTACK_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Get from Paystack Dashboard |
| `PAYSTACK_CALLBACK_URL` | `https://data4less.site/dashboard` | Where users return after payment |
| `FIREBASE_SERVICE_ACCOUNT` | `{"type":"service_account",...}` | Entire JSON from Firebase |

---

### 3️⃣ Configure Paystack Webhook

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL:
   ```
   https://api-snowy-eight.vercel.app/api/paystack-webhook
   ```
4. Click **Save**
5. Click **Test Webhook** to verify it works

---

### 4️⃣ Verify Deployment

Test the endpoints:

**Initialize Endpoint:**
```bash
curl -X POST https://api-snowy-eight.vercel.app/api/initialize-paystack \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 50,
    "reference": "TEST-12345"
  }'
```

**Expected Response:**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "reference": "TEST-12345"
  }
}
```

---

## Quick Reference

### API Endpoints

| Endpoint | URL | Method |
|----------|-----|--------|
| Initialize | `https://api-snowy-eight.vercel.app/api/initialize-paystack` | POST |
| Verify | `https://api-snowy-eight.vercel.app/api/verify-paystack?reference=XXX` | GET |
| Webhook | `https://api-snowy-eight.vercel.app/api/paystack-webhook` | POST |

### Frontend Configuration

**Already configured in [script.js:66](script.js#L66):**
```javascript
const VERCEL_API_URL = 'https://api-snowy-eight.vercel.app/api';
```

**No changes needed!** ✅

---

## Testing

### Test Top-Up Flow:

1. **Login to your site**
   - Navigate to https://data4less.site
   - Login with your account

2. **Click "Top Up" button**
   - Verify only "Instant Top-Up (Paystack)" is visible
   - No manual option shown ✅

3. **Enter amount**
   - Try GH₵ 25 → Should show error (minimum GH₵ 30) ✅
   - Enter GH₵ 50 → Should proceed ✅

4. **Click "Proceed with Instant Top-Up"**
   - Redirects to Paystack checkout ✅
   - Amount shows GH₵ 50.00 ✅

5. **Make test payment**
   - **Test Card:** 4084 0840 8408 4081
   - **Expiry:** Any future date
   - **CVV:** 408
   - Click "Pay GH₵ 50.00"

6. **Verify success**
   - Redirects back to dashboard ✅
   - Shows success message ✅
   - Balance updates automatically (wait 2-3 seconds) ✅
   - Top-up appears in history ✅

---

## Troubleshooting

### ❌ "Server configuration error"

**Problem:** Environment variables not set

**Fix:**
```bash
vercel secrets add paystack-secret-key YOUR_KEY
vercel secrets add paystack-callback-url https://data4less.site/dashboard
vercel secrets add firebase-service-account '{"type":"service_account",...}'
```

Then redeploy:
```bash
vercel --prod
```

---

### ❌ Webhook not working

**Problem:** Balance not updating after payment

**Checklist:**
- [ ] Webhook URL set in Paystack Dashboard
- [ ] URL is exactly: `https://data4less.site/api/paystack-webhook`
- [ ] Test webhook from Paystack Dashboard shows success
- [ ] Check Vercel logs for errors: `vercel logs --follow`

---

### ❌ Payment succeeds but balance not updated

**Problem:** Webhook received but failed to credit

**Fix:**
1. Check Vercel logs:
   ```bash
   vercel logs YOUR_PROJECT_NAME --follow
   ```
2. Look for webhook errors
3. Verify Firebase Service Account JSON is correct
4. Ensure user email in Paystack matches Firebase user email

---

## Environment Variables Summary

Copy and paste these for quick setup:

```bash
# 1. Paystack Secret Key
PAYSTACK_SECRET_KEY=sk_live_YOUR_KEY_HERE

# 2. Callback URL
PAYSTACK_CALLBACK_URL=https://data4less.site/dashboard

# 3. Firebase Service Account (get from Firebase Console)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"YOUR_PROJECT_ID",...}
```

---

## Success Checklist

After deployment, verify:

- [ ] Vercel deployment successful
- [ ] Environment variables set (3 total)
- [ ] Paystack webhook configured
- [ ] Frontend uses correct API URL (`https://data4less.site/api`)
- [ ] Test payment works end-to-end
- [ ] Balance updates automatically
- [ ] Top-up appears in history
- [ ] Dashboard chart shows data

---

## Support

If you encounter issues:

1. Check Vercel logs: `vercel logs --follow`
2. Check Paystack Dashboard → Transactions
3. Check Firebase Console → Firestore for balance updates
4. Review [PAYSTACK_SERVER_SIDE_SETUP.md](PAYSTACK_SERVER_SIDE_SETUP.md) for detailed guide

---

**Deployment Complete!** 🎉

Your Paystack server-side integration is now live with:
- ✅ Secure API keys (hidden from frontend)
- ✅ Automatic balance crediting via webhook
- ✅ Instant top-up (GH₵ 30 minimum)
- ✅ Dashboard chart fixed

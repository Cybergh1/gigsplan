# Auto-Processing with Vercel Environment Variable - Setup Guide

## 🎯 Changes Made

### ✅ What's New:

1. **Auto-processing controlled by Vercel environment variable** (not Firestore)
2. **Phone number format fixed** - Uses `0XXXXXXXXX` format (not `233XXXXXXXXX`)
3. **Frontend fetches status from Vercel API** - No more relying on Firestore settings
4. **Cleaner architecture** - Toggle is server-side only

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Deploy to Vercel

```bash
cd "c:\Users\lenovo\Pictures\PHP KTECH"
vercel --prod
```

### Step 2: Set Environment Variables

```bash
# Set DatafyHub API Token
vercel secrets add datafyhub-api-token YOUR_BEARER_TOKEN_HERE

# Set Auto-Processing to TRUE (to enable)
vercel secrets add auto-processing-enabled true

# Redeploy
vercel --prod
```

Or via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select project: `api-snowy-eight`
3. Settings → Environment Variables
4. Add two variables:
   - Name: `DATAFYHUB_API_TOKEN`
   - Value: `your_bearer_token_here`
   - Name: `AUTO_PROCESSING_ENABLED`
   - Value: `true` (to enable) or `false` (to disable)
5. Redeploy the project

### Step 3: Test

1. Refresh your dashboard (hard refresh: Ctrl+Shift+R)
2. Open browser console (F12)
3. Look for: `🔧 Auto-processing mode (from Vercel): ENABLED ✅`
4. Place a test order
5. Check console logs and order status

---

## 🔧 How It Works

### Architecture:

```
User Dashboard → Fetch Auto-Processing Status from Vercel API
                 ↓
              (if enabled)
                 ↓
User Places Order → Firestore (pending) → Vercel API → DatafyHub API → Update Status (processing)
```

### Phone Number Format:

**Frontend sends:** `233591178627` (or `0591178627`)

**Vercel API converts to:** `0591178627`

**DatafyHub receives:** `0591178627`

---

## 📡 New API Endpoint

### Get Auto-Processing Status:
```
GET https://api-snowy-eight.vercel.app/api/get-auto-processing-status
```

**Response:**
```json
{
  "success": true,
  "autoProcessingEnabled": true,
  "apiTokenConfigured": true
}
```

---

## 🎛️ Toggle Auto-Processing

### Enable Auto-Processing:

```bash
vercel secrets add auto-processing-enabled true
vercel --prod
```

### Disable Auto-Processing:

```bash
vercel secrets add auto-processing-enabled false
vercel --prod
```

**OR** via Vercel Dashboard:
1. Go to project → Settings → Environment Variables
2. Edit `AUTO_PROCESSING_ENABLED`
3. Change value to `true` or `false`
4. Redeploy

---

## 🧪 Testing

### Test 1: Check Status

1. Open dashboard
2. Press F12 (Console)
3. Look for:
   ```
   🔧 Auto-processing mode (from Vercel): ENABLED ✅
   📊 Auto-processing status: { autoProcessingEnabled: true, apiTokenConfigured: true }
   ```

### Test 2: Place Order with Auto-Processing ON

1. Ensure `AUTO_PROCESSING_ENABLED=true` in Vercel
2. Refresh dashboard
3. Place a data order
4. Console should show:
   ```
   ✅ Auto-processing ENABLED - sending order to external API...
   📦 Order data being sent: { network: 'mtn', reference: '123456', recipient: '0591178627', capacity: '...' }
   Order successfully sent to external API
   ```
5. Order status changes: `pending` → `processing`

### Test 3: Place Order with Auto-Processing OFF

1. Set `AUTO_PROCESSING_ENABLED=false` in Vercel
2. Redeploy: `vercel --prod`
3. Refresh dashboard
4. Place a data order
5. Console should show:
   ```
   🔧 Auto-processing mode (from Vercel): DISABLED ❌
   ⚠️ Auto-processing DISABLED - order will stay as PENDING for manual processing
   ```
6. Order status stays: `pending`

---

## 📋 Environment Variables Summary

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATAFYHUB_API_TOKEN` | `your_bearer_token` | DatafyHub API authentication |
| `AUTO_PROCESSING_ENABLED` | `true` or `false` | Enable/disable auto-processing |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` | Paystack payments |
| `PAYSTACK_CALLBACK_URL` | `https://data4less.site/dashboard` | Paystack redirect |
| `FIREBASE_SERVICE_ACCOUNT` | `{...}` | Firebase Admin SDK |

---

## 🔍 Debugging

### If Console Shows "DISABLED ❌" but You Want It Enabled:

1. Check Vercel environment variable:
   ```bash
   vercel env ls
   ```
2. Ensure `AUTO_PROCESSING_ENABLED` is set to `true`
3. Redeploy: `vercel --prod`
4. Hard refresh dashboard: Ctrl+Shift+R

### If Orders Stay "Pending" Even When Enabled:

1. Check console for error messages
2. Verify bearer token is correct:
   ```bash
   vercel env ls
   ```
3. Check Vercel logs:
   ```bash
   vercel logs api-snowy-eight --follow
   ```

### If Phone Number Format is Wrong:

The Vercel API now automatically converts:
- `233591178627` → `0591178627`
- `0591178627` → `0591178627` (no change)

Check console log: `📦 Order data being sent: { recipient: '0591178627' }`

---

## ✅ Verification Checklist

- [ ] Deployed to Vercel: `vercel --prod`
- [ ] Set `DATAFYHUB_API_TOKEN` in Vercel
- [ ] Set `AUTO_PROCESSING_ENABLED=true` in Vercel
- [ ] Console shows: "Auto-processing mode (from Vercel): ENABLED ✅"
- [ ] Test order placed successfully
- [ ] Console shows: "sending order to external API..."
- [ ] Order status changes from `pending` to `processing`
- [ ] Phone number format is `0XXXXXXXXX` in console log

---

## 🔄 Switching Between Modes

### To Enable:
```bash
vercel secrets add auto-processing-enabled true
vercel --prod
```

### To Disable:
```bash
vercel secrets add auto-processing-enabled false
vercel --prod
```

**Important:** You must redeploy (`vercel --prod`) after changing environment variables for the changes to take effect.

---

## 📚 API Endpoints

| Endpoint | URL | Method | Purpose |
|----------|-----|--------|---------|
| Get Status | `https://api-snowy-eight.vercel.app/api/get-auto-processing-status` | GET | Check if auto-processing is enabled |
| Place Order | `https://api-snowy-eight.vercel.app/api/place-order-external` | POST | Send order to DatafyHub |
| Check Status | `https://api-snowy-eight.vercel.app/api/check-order-status-external?reference=XXX` | GET | Check single order status |
| Update Orders | `https://api-snowy-eight.vercel.app/api/check-and-update-orders` | GET/POST | Update all processing orders |

---

## 🎉 Summary

**Before:**
- Auto-processing toggle in admin panel (Firestore)
- Phone numbers sent as `233XXXXXXXXX`
- Manual toggle required

**After:**
- Auto-processing controlled by Vercel environment variable
- Phone numbers sent as `0XXXXXXXXX`
- Server-side toggle only
- Cleaner, more secure architecture

**To Enable:**  `vercel secrets add auto-processing-enabled true && vercel --prod`

**To Disable:** `vercel secrets add auto-processing-enabled false && vercel --prod`

**Setup Complete!** 🚀

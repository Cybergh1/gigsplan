# Auto-Processing with External API - Complete Setup Guide

## Overview

This system integrates your Data4Less platform with DatafyHub's external API for automatic order processing. When enabled, data orders are sent automatically to the external API. When disabled, orders remain in "pending" status for manual processing.

---

## Features

### ✅ What's Implemented:

1. **Toggle-Based Processing** - Admin can enable/disable auto-processing from admin panel
2. **Secure API Integration** - Bearer token stored in Vercel environment variables
3. **Automatic Order Placement** - Orders sent to external API when auto-processing is ON
4. **Status Synchronization** - Background job checks and updates order status
5. **Fallback to Manual** - If API fails, order stays pending for manual processing
6. **Admin Control Panel** - Easy toggle and API balance monitoring

---

## Architecture

### When Auto-Processing is ENABLED:

```
User Places Order → Frontend → Firestore (pending) → External API → Update Status (processing) → Background Job → Update Status (completed/failed)
```

### When Auto-Processing is DISABLED:

```
User Places Order → Frontend → Firestore (pending) → Manual Processing
```

---

## File Structure

```
PHP KTECH/
├── api/
│   ├── place-order-external.js         # Send orders to external API
│   ├── check-order-status-external.js  # Check single order status
│   └── check-and-update-orders.js      # Background job to update all processing orders
├── vercel.json                          # Added DATAFYHUB_API_TOKEN environment variable
├── script.js                            # Updated order placement logic
└── paneladmin.html                      # Admin toggle already exists
```

---

## API Endpoints

### Your Vercel Serverless Functions:

| Endpoint | URL | Method | Purpose |
|----------|-----|--------|---------|
| Place Order | `https://api-snowy-eight.vercel.app/api/place-order-external` | POST | Send order to DatafyHub |
| Check Status | `https://api-snowy-eight.vercel.app/api/check-order-status-external?reference=XXX` | GET | Check single order status |
| Update Orders | `https://api-snowy-eight.vercel.app/api/check-and-update-orders` | GET/POST | Check and update all processing orders |

### External API (DatafyHub):

| Endpoint | URL | Method | Purpose |
|----------|-----|--------|---------|
| Place Order | `https://api.datafyhub.com/api/v1/placeOrder` | POST | External API to place order |
| Check Status | `https://api.datafyhub.com/api/v1/checkOrderStatus/:reference` | GET | External API to check status |

---

## Environment Variables

### Required in Vercel:

```bash
DATAFYHUB_API_TOKEN=your_bearer_token_here
```

### How to Set:

#### Option A: Vercel CLI
```bash
vercel secrets add datafyhub-api-token YOUR_BEARER_TOKEN_HERE
vercel --prod  # Redeploy
```

#### Option B: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project: `api-snowy-eight`
3. Go to Settings → Environment Variables
4. Add:
   - Name: `DATAFYHUB_API_TOKEN`
   - Value: `your_bearer_token_here`
4. Redeploy the project

---

## Admin Configuration

### Enable/Disable Auto-Processing:

1. **Login to Admin Panel**
   - Navigate to: `https://yourdomain.com/paneladmin.html`
   - Login with admin credentials

2. **Go to "Site & Service Controls" Tab**

3. **API & Integration Section**
   - Toggle: **"Enable Auto Processing via API"**
     - **ON** = Orders are sent to external API automatically
     - **OFF** = Orders stay as "pending" for manual processing

4. **Set Bearer Token**
   - Enter your DatafyHub Bearer Token
   - Click "Save Token"
   - Token is stored in Vercel environment variables

5. **Check API Balance**
   - View your DatafyHub API wallet balance
   - Click refresh button to update

6. **Save Settings**
   - Click "Save All Settings" button
   - Settings are saved to Firestore: `siteSettings/config`

---

## How It Works

### 1. Order Placement Flow (Auto-Processing ON)

**User places an order:**
```javascript
User clicks "Buy Now" → Package selected → Phone number entered → Confirm purchase
```

**Frontend (script.js):**
```javascript
1. Deduct user balance
2. Create order in Firestore with status: 'pending'
3. Check if auto-processing is enabled (siteSettings.processingModeEnabled)
4. If enabled, call Vercel API: /place-order-external
5. If API succeeds, update order status to 'processing'
6. If API fails, order stays 'pending' for manual processing
```

**Vercel Function (place-order-external.js):**
```javascript
1. Receive order data from frontend
2. Get bearer token from environment
3. Call DatafyHub API: POST /api/v1/placeOrder
4. Return success/failure to frontend
```

**External API (DatafyHub):**
```javascript
1. Receive order
2. Process data bundle
3. Return response
```

### 2. Status Checking Flow

**Background Job (check-and-update-orders.js):**
```javascript
1. Find all orders with status: 'processing'
2. For each order, check status from external API
3. If status is 'completed', update order to 'completed'
4. If status is 'failed', update order to 'failed'
5. If still processing, keep checking
```

**How to Trigger Background Job:**

#### Option A: Manual Trigger
```bash
curl https://api-snowy-eight.vercel.app/api/check-and-update-orders
```

#### Option B: Scheduled (Vercel Cron)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/check-and-update-orders",
      "schedule": "*/5 * * * *"  // Run every 5 minutes
    }
  ]
}
```

#### Option C: Frontend Timer
Add to `script.js`:
```javascript
// Check order status every 30 seconds
setInterval(async () => {
    if (currentUser) {
        await fetch(`${VERCEL_API_URL}/check-and-update-orders`);
    }
}, 30000);
```

---

## Testing

### Test 1: Place Order with Auto-Processing ON

1. **Enable Auto-Processing:**
   - Go to Admin Panel
   - Toggle "Enable Auto Processing via API" to ON
   - Save settings

2. **Place Test Order:**
   - Login as regular user
   - Navigate to "Buy Data"
   - Select a package (e.g., MTN 1GB)
   - Enter phone number: `0591178627`
   - Click "Buy Now"

3. **Verify Order Flow:**
   - Check browser console for: "Auto-processing enabled, sending order to external API..."
   - Check Firestore: Order status should change from `pending` → `processing`
   - Check order history: Status shows "Processing"

4. **Check External API:**
   - Call status check:
   ```bash
   curl "https://api-snowy-eight.vercel.app/api/check-order-status-external?reference=ORDER_ID"
   ```

5. **Trigger Background Job:**
   ```bash
   curl https://api-snowy-eight.vercel.app/api/check-and-update-orders
   ```

6. **Verify Completion:**
   - Order status updates to `completed`
   - User sees "Completed" in order history

### Test 2: Place Order with Auto-Processing OFF

1. **Disable Auto-Processing:**
   - Go to Admin Panel
   - Toggle "Enable Auto Processing via API" to OFF
   - Save settings

2. **Place Test Order:**
   - Same steps as above

3. **Verify Order Flow:**
   - Order stays in `pending` status
   - No external API call made
   - Order awaits manual processing

---

## Order Data Format

### Request to External API:

```json
{
  "network": "mtn",           // Network: mtn, telecel, at
  "reference": "123456",      // Order ID (displayOrderId)
  "recipient": "233591178627", // Phone number in 233XXXXXXXXX format
  "capacity": "package_id"    // Package ID or data size
}
```

### Response from External API:

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    // External API response data
  }
}
```

### Status Check Response:

```json
{
  "success": true,
  "status": "completed",  // completed, processing, failed
  "data": {
    // Order details
  }
}
```

---

## Firestore Schema Updates

### Orders Collection (`orders/{orderId}`):

**New Fields Added:**

```javascript
{
  // Existing fields...
  status: 'pending' | 'processing' | 'completed' | 'failed',

  // Auto-processing fields
  externalApiResponse: { /* API response data */ },
  externalApiSentAt: Timestamp,
  externalApiError: string,
  externalApiAttemptedAt: Timestamp,
  externalApiStatusResponse: { /* Status check response */ },
  lastStatusCheckAt: Timestamp,
  completedAt: Timestamp,
  failedAt: Timestamp
}
```

### Site Settings (`siteSettings/config`):

```javascript
{
  // Existing fields...
  processingModeEnabled: boolean,  // true = auto-processing ON
  bearerToken: string              // DatafyHub bearer token (also in Vercel)
}
```

---

## Troubleshooting

### Issue 1: Orders Stay in "Pending" Status

**Possible Causes:**
- Auto-processing is disabled
- API token not set in Vercel
- External API is down

**Fix:**
```bash
# Check if auto-processing is enabled
# Go to Admin Panel → Check toggle

# Check if token is set
vercel env ls

# Add token if missing
vercel secrets add datafyhub-api-token YOUR_TOKEN
vercel --prod
```

### Issue 2: Orders Move to "Processing" but Never Complete

**Possible Causes:**
- Background job not running
- External API not returning status

**Fix:**
```bash
# Manually trigger background job
curl https://api-snowy-eight.vercel.app/api/check-and-update-orders

# Check order status directly
curl "https://api-snowy-eight.vercel.app/api/check-order-status-external?reference=ORDER_ID"

# Check Vercel logs
vercel logs api-snowy-eight --follow
```

### Issue 3: "Server configuration error - API token not configured"

**Cause:** Bearer token not set in Vercel

**Fix:**
```bash
vercel secrets add datafyhub-api-token YOUR_TOKEN
vercel --prod
```

---

## Security Features

✅ **Bearer Token Secure** - Stored in Vercel environment variables, not in frontend
✅ **CORS Enabled** - Allows frontend to call serverless functions
✅ **Error Handling** - Fallback to manual processing if API fails
✅ **Timeout Protection** - API calls have 5-second timeout
✅ **Logging** - All API calls logged for debugging

---

## Deployment Checklist

- [ ] Deploy serverless functions to Vercel: `vercel --prod`
- [ ] Set `DATAFYHUB_API_TOKEN` in Vercel environment variables
- [ ] Enter bearer token in Admin Panel
- [ ] Enable auto-processing toggle in Admin Panel
- [ ] Test order placement with auto-processing ON
- [ ] Test order placement with auto-processing OFF
- [ ] Set up background job (cron or manual trigger)
- [ ] Verify orders update from "processing" to "completed"
- [ ] Monitor Vercel logs for errors

---

## API Rate Limits & Best Practices

1. **Batch Status Checks** - Background job checks max 50 orders at a time
2. **Timeout Protection** - 5-second timeout for external API calls
3. **Error Logging** - Failed orders logged with error messages
4. **Retry Logic** - Orders stay in "processing" until status check succeeds
5. **Manual Override** - Admin can manually change order status in Firestore

---

## Monitoring

### Check API Balance:
```javascript
// In Admin Panel → API & Integration section
Click "Refresh Balance" button
```

### View Processing Orders:
```bash
# Firestore query
Collection: orders
Where: status == 'processing'
OrderBy: createdAt DESC
```

### View Failed Orders:
```bash
# Firestore query
Collection: orders
Where: status == 'failed'
OrderBy: createdAt DESC
```

### Check Vercel Logs:
```bash
vercel logs api-snowy-eight --follow
```

---

## Summary

### ✅ What Works:

1. **Auto-Processing Toggle** - Admin can enable/disable from admin panel
2. **Secure Token Storage** - Bearer token stored in Vercel environment
3. **Automatic Order Placement** - Orders sent to external API when enabled
4. **Status Synchronization** - Background job updates order status
5. **Fallback Mechanism** - Failed API calls keep order pending for manual processing
6. **Admin Monitoring** - View API balance and toggle settings

### 📋 Admin Quick Guide:

1. **Set Bearer Token:** Admin Panel → API & Integration → Enter token → Save
2. **Enable Auto-Processing:** Toggle "Enable Auto Processing via API" to ON
3. **Monitor Balance:** Click "Refresh Balance" to check API credits
4. **Disable if Needed:** Toggle OFF to switch to manual processing

### 🚀 User Experience:

- **Auto-Processing ON:** Orders complete automatically within minutes
- **Auto-Processing OFF:** Orders stay "pending" until admin processes manually
- **Seamless Switching:** Admin can toggle at any time without affecting system

---

**Setup Complete!** 🎉

Your auto-processing system is ready to use. Toggle it ON/OFF from the admin panel anytime!

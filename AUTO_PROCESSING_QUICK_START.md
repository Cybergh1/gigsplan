# Auto-Processing Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Deploy to Vercel

```bash
cd "c:\Users\lenovo\Pictures\PHP KTECH"
vercel --prod
```

### Step 2: Set Environment Variable

```bash
vercel secrets add datafyhub-api-token YOUR_BEARER_TOKEN_HERE
vercel --prod  # Redeploy
```

Or via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select project: `api-snowy-eight`
3. Settings → Environment Variables
4. Add: `DATAFYHUB_API_TOKEN` = `your_token`

### Step 3: Configure Admin Panel

1. Login to: `https://yourdomain.com/paneladmin.html`
2. Go to **"Site & Service Controls"** tab
3. In **"API & Integration"** section:
   - Enter your **DatafyHub Bearer Token**
   - Click **"Save Token"**
   - Toggle **"Enable Auto Processing via API"** to **ON**
4. Click **"Save All Settings"**

### Step 4: Test

1. Login as regular user
2. Buy a data package
3. Check order status - should go from `pending` → `processing` → `completed`

---

## 📊 How It Works

### Auto-Processing ON:
```
Order → Firestore (pending) → External API → Status: processing → Background Job → Status: completed
```

### Auto-Processing OFF:
```
Order → Firestore (pending) → Manual Processing
```

---

## 🎛️ Admin Controls

| Setting | Location | Purpose |
|---------|----------|---------|
| **Enable Auto-Processing** | Admin Panel → API & Integration | Toggle automatic order processing |
| **Bearer Token** | Admin Panel → API & Integration | DatafyHub API authentication |
| **API Balance** | Admin Panel → API & Integration | View remaining API credits |

---

## 📡 API Endpoints Created

### Your Vercel Functions:

1. **Place Order:** `https://api-snowy-eight.vercel.app/api/place-order-external`
2. **Check Status:** `https://api-snowy-eight.vercel.app/api/check-order-status-external?reference=XXX`
3. **Update Orders:** `https://api-snowy-eight.vercel.app/api/check-and-update-orders`

### External API (DatafyHub):

1. **Place Order:** `https://api.datafyhub.com/api/v1/placeOrder`
2. **Check Status:** `https://api.datafyhub.com/api/v1/checkOrderStatus/:reference`

---

## 🔍 Testing Commands

### Check order status manually:
```bash
curl "https://api-snowy-eight.vercel.app/api/check-order-status-external?reference=ORDER_ID"
```

### Update all processing orders:
```bash
curl https://api-snowy-eight.vercel.app/api/check-and-update-orders
```

### View Vercel logs:
```bash
vercel logs api-snowy-eight --follow
```

---

## ✅ Verification Checklist

- [ ] Vercel deployment successful
- [ ] Environment variable `DATAFYHUB_API_TOKEN` set
- [ ] Bearer token saved in Admin Panel
- [ ] Auto-processing toggle enabled
- [ ] Test order placed successfully
- [ ] Order status changed to "processing"
- [ ] Background job updates order to "completed"

---

## 🔧 Troubleshooting

### Orders stay "pending"
- Check if auto-processing is enabled in Admin Panel
- Verify token is set: `vercel env ls`

### Orders stay "processing"
- Trigger background job: `curl https://api-snowy-eight.vercel.app/api/check-and-update-orders`

### "Server configuration error"
- Set token: `vercel secrets add datafyhub-api-token YOUR_TOKEN`
- Redeploy: `vercel --prod`

---

## 📚 Full Documentation

See [AUTO_PROCESSING_SETUP.md](AUTO_PROCESSING_SETUP.md) for complete details.

---

**Setup Complete!** 🎉 Toggle auto-processing ON/OFF anytime from the Admin Panel.

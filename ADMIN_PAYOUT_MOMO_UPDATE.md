# Admin Panel - Store Payout MoMo Details Update

## Changes Made

Updated the admin panel's **Store Payouts** tab to display complete Mobile Money (MoMo) account details for all withdrawal requests.

---

## What's New

### 1. Enhanced Payout Table

**Location:** [paneladmin.html:641](paneladmin.html#L641)

**New Columns Added:**
- **MoMo Name** - The account holder's name
- **Phone** - The MoMo phone number
- **Network** - The mobile money provider (MTN, Vodafone, AirtelTigo)

**Old Table:**
```
Request ID | Merchant | Amount | Method | Status | Date | Actions
```

**New Table:**
```
Request ID | Merchant | Amount | MoMo Name | Phone | Network | Status | Date | Actions
```

---

### 2. Updated Payout Details Modal

**Location:** [paneladmin.html:2439-2448](paneladmin.html#L2439-L2448)

**New Information Displayed:**
- Merchant Email
- Merchant Name
- Amount
- **MoMo Account Name** (NEW)
- **MoMo Phone Number** (NEW)
- **MoMo Network** (NEW)
- Status
- Request Date

---

### 3. Fixed Database Collection Reference

**Changes:**
- Collection name: `payout_requests` → `payoutRequests`
- Date field: `createdAt` → `requestedAt`
- User ID field: `userId` → `merchantId`
- Status values: `Pending/Paid/Rejected` → `pending/paid/rejected` (lowercase)

---

## Database Structure

### Firestore Collection: `payoutRequests`

Each payout request document contains:

```javascript
{
  merchantId: "user123",              // User UID
  merchantName: "John Doe",           // Full name
  merchantEmail: "john@example.com",  // Email address
  amount: 50.00,                      // Withdrawal amount (GHS)
  momoName: "John Mensah",            // MoMo account holder name
  momoPhone: "0501234567",            // MoMo phone (10 digits)
  momoNetwork: "MTN",                 // MTN | Vodafone | AirtelTigo
  status: "pending",                  // pending | paid | rejected
  requestedAt: Timestamp,             // When request was made
  paidAt: Timestamp | null,           // When payment was processed
  rejectedAt: Timestamp | null        // When request was rejected (if applicable)
}
```

---

## Admin Workflow

### Viewing Payout Requests

1. Navigate to **Store Payouts** tab in admin panel
2. Table shows all payout requests with MoMo details
3. Filter by status: All / Pending / Paid / Rejected

**Example Table Row:**
```
Request ID: 4A3F2E1D
Merchant: john@example.com
Amount: GHS 50.00
MoMo Name: John Mensah
Phone: 0501234567
Network: MTN
Status: [Pending]
Date: 2025-11-21
[Process Button]
```

---

### Processing a Payout Request

1. Click **Process** button on pending request
2. Modal opens showing complete details:
   ```
   Merchant: john@example.com
   Merchant Name: John Doe
   Amount: GHS 50.00
   MoMo Account Name: John Mensah
   MoMo Phone Number: 0501234567
   MoMo Network: MTN
   Status: Pending
   Requested: Nov 21, 2025 14:30
   ```

3. **Approve** - Marks payout as paid, records timestamp
4. **Reject** - Returns funds to merchant's available balance

---

## Code Changes Summary

### paneladmin.html

**Line 635-637: Updated Filter Values**
```html
<option value="pending">Pending</option>
<option value="paid">Paid</option>
<option value="rejected">Rejected</option>
```

**Line 641: Added MoMo Columns**
```html
<th>MoMo Name</th><th>Phone</th><th>Network</th>
```

**Line 2401-2405: Fixed Collection Query**
```javascript
let payoutsQuery = query(collection(db, "payoutRequests"));
if (statusFilter !== 'all') {
    payoutsQuery = query(payoutsQuery, where("status", "==", statusFilter));
}
payoutsQuery = query(payoutsQuery, orderBy("requestedAt", "desc"));
```

**Line 2418-2420: Display MoMo Details in Table**
```javascript
<td>${payout.momoName || 'N/A'}</td>
<td>${payout.momoPhone || 'N/A'}</td>
<td>${payout.momoNetwork || 'N/A'}</td>
```

**Line 2443-2445: Show MoMo Details in Modal**
```javascript
<div class="info-readonly-group"><strong>MoMo Account Name:</strong><p>${payout.momoName || 'N/A'}</p></div>
<div class="info-readonly-group"><strong>MoMo Phone Number:</strong><p>${payout.momoPhone || 'N/A'}</p></div>
<div class="info-readonly-group"><strong>MoMo Network:</strong><p>${payout.momoNetwork || 'N/A'}</p></div>
```

**Line 2467-2485: Enhanced Approve/Reject Logic**
```javascript
// Approve
await updateDoc(payoutRef, {
    status: 'paid',
    paidAt: serverTimestamp()
});

// Reject - Returns funds to merchant
batch.update(payoutRef, {
    status: 'rejected',
    rejectedAt: serverTimestamp()
});
batch.update(merchantRef, {
    'storeMetrics.availableForPayout': increment(payoutData.amount),
    'storeMetrics.pendingPayouts': increment(-payoutData.amount)
});
```

---

## Testing Instructions

### Test 1: View MoMo Details in Table

1. Login to admin panel
2. Navigate to **Store Payouts** tab
3. Should see table with columns:
   - Request ID
   - Merchant
   - Amount
   - **MoMo Name** ✅
   - **Phone** ✅
   - **Network** ✅
   - Status
   - Date
   - Actions

4. If no payouts exist, should see "No payout requests found" message

### Test 2: Filter by Status

1. Use status dropdown to filter:
   - **All Statuses** - Shows all requests
   - **Pending** - Shows only pending requests
   - **Paid** - Shows only processed payouts
   - **Rejected** - Shows only rejected requests

2. Table updates immediately on selection

### Test 3: Process Payout Request

1. Click **Process** on any pending request
2. Modal opens showing:
   - Merchant email and name
   - Amount
   - **MoMo Account Name** ✅
   - **MoMo Phone Number** ✅
   - **MoMo Network** ✅
   - Status
   - Request date

3. Click **Approve**:
   - Status changes to `paid`
   - `paidAt` timestamp recorded
   - Toast: "Payout marked as Paid!"

4. Click **Reject**:
   - Status changes to `rejected`
   - `rejectedAt` timestamp recorded
   - Funds returned to merchant's `storeMetrics.availableForPayout`
   - Toast: "Payout rejected and funds returned to merchant."

### Test 4: Verify in Firestore

1. Go to Firebase Console → Firestore
2. Navigate to `payoutRequests` collection
3. Check processed request document:
   ```javascript
   {
     merchantId: "...",
     merchantName: "...",
     merchantEmail: "...",
     amount: 50,
     momoName: "John Mensah",     // ✅
     momoPhone: "0501234567",     // ✅
     momoNetwork: "MTN",          // ✅
     status: "paid",              // ✅
     requestedAt: Timestamp,
     paidAt: Timestamp            // ✅ Set when approved
   }
   ```

---

## User Flow (Complete Withdrawal Process)

### Merchant Side (script.js)

1. User navigates to **Payout** page
2. Enters withdrawal amount
3. Clicks **Request Withdrawal**
4. Modal opens asking for:
   - MoMo Account Name
   - Phone Number (0XXXXXXXXX format)
   - Mobile Money Network
5. Submits request
6. Document created in `payoutRequests` collection

### Admin Side (paneladmin.html)

1. Admin sees new request in **Store Payouts** tab
2. Request shows:
   - Merchant details
   - Amount
   - **MoMo account details** (name, phone, network)
   - Status: Pending
3. Admin clicks **Process**
4. Reviews all details in modal
5. **Approves** or **Rejects** request
6. If approved:
   - Admin processes payment to the MoMo account shown
   - Marks as paid in system
7. If rejected:
   - Funds returned to merchant's balance
   - Merchant can submit new request

---

## Important Notes

### Phone Number Format
- Ghana format: `0XXXXXXXXX` (10 digits starting with 0)
- Example: `0501234567`
- Validated on merchant submission

### MoMo Networks
- **MTN** - MTN Mobile Money
- **Vodafone** - Vodafone Cash
- **AirtelTigo** - AirtelTigo Money

### Status Values
All status values are lowercase:
- `pending` - Awaiting admin processing
- `paid` - Payment completed by admin
- `rejected` - Request rejected, funds returned

### Collection Name
- Firestore collection: `payoutRequests` (camelCase)
- NOT `payout_requests` (old format)

---

## Troubleshooting

### Issue: "No payout requests found"

**Check:**
1. Firestore collection exists: `payoutRequests`
2. Collection has documents
3. Console for errors (F12)
4. Firestore security rules allow admin read access

**Firestore Rule:**
```javascript
match /payoutRequests/{requestId} {
  allow read: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
  allow write: if request.auth != null;
}
```

### Issue: Filter not working

**Check:**
1. Status values in database are lowercase (`pending`, not `Pending`)
2. Console for query errors
3. May need Firestore index for status + requestedAt

**Create Index if Needed:**
```json
{
  "collectionGroup": "payoutRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "requestedAt", "order": "DESCENDING" }
  ]
}
```

### Issue: MoMo details showing "N/A"

**Cause:** Old payout requests don't have MoMo fields

**Solution:** Only new requests (after this update) will have:
- `momoName`
- `momoPhone`
- `momoNetwork`

Old requests will show "N/A" - this is expected.

---

## Summary

All payout requests now include complete Mobile Money account details, making it easy for admins to process withdrawals directly to merchants' MoMo accounts.

**Key Benefits:**
- ✅ All payment details in one place
- ✅ No need to contact merchants for account info
- ✅ Faster payout processing
- ✅ Complete audit trail with timestamps
- ✅ Automatic fund return on rejection

**Files Modified:**
- [paneladmin.html:635-637](paneladmin.html#L635-L637) - Filter values
- [paneladmin.html:641](paneladmin.html#L641) - Table headers
- [paneladmin.html:2401-2428](paneladmin.html#L2401-L2428) - Load payouts function
- [paneladmin.html:2432-2452](paneladmin.html#L2432-L2452) - Payout details modal
- [paneladmin.html:2454-2495](paneladmin.html#L2454-L2495) - Process payout function

---

## Next Steps

1. Test admin panel with existing payout requests
2. Create test payout request from merchant account
3. Verify MoMo details appear correctly
4. Test approve/reject functionality
5. Verify Firestore updates correctly
6. Create Firestore index if query fails (see troubleshooting)

---

**Last Updated:** 2025-11-21
**Related Files:**
- [index.html](index.html) - Merchant withdrawal modal
- [script.js:6969-7084](script.js#L6969-L7084) - Merchant withdrawal form
- [paneladmin.html](paneladmin.html) - Admin payout processing

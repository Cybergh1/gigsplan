# Store & Payout Fixes

## ✅ Issues Fixed

### 1. Store "Not Found" Error - FIXED ✅

**Problem:** Store showing "Store Not Found" even though it was created.

**Root Cause:** Query was using compound index on `storeConfig.storeSlug` AND `storeConfig.setupComplete`, which requires a Firestore composite index that wasn't created.

**Fix:** Changed to simple query + in-code filtering ([script.js:1160-1202](script.js#L1160-L1202))

**Before (BROKEN):**
```javascript
// Required Firestore composite index (didn't exist)
const q = query(
    usersRef,
    where('storeConfig.storeSlug', '==', slug),
    where('storeConfig.setupComplete', '==', true)  // ❌ Needs index
);
```

**After (FIXED):**
```javascript
// Simple query (no index needed)
const q = query(
    usersRef,
    where('storeConfig.storeSlug', '==', slug)
);

// Filter in code instead
for (const doc of querySnapshot.docs) {
    const data = doc.data();
    if (data.storeConfig && data.storeConfig.setupComplete === true) {
        merchantDoc = doc; // ✅ Found!
        break;
    }
}
```

**Benefits:**
- ✅ No Firestore index required
- ✅ Works immediately
- ✅ Better error messages (distinguishes between "not found" vs "not ready")

---

### 2. Payout Page "Failed to Load" Error - FIXED ✅

**Problem:** Payout page showing "Failed to load payout data"

**Root Causes:**
1. ❌ Function returned empty if `storeMetrics` didn't exist
2. ❌ Query requires Firestore index that wasn't created
3. ❌ No error handling for index errors

**Fix:** Better initialization and error handling ([script.js:6799-6861](script.js#L6799-L6861))

**Changes:**

#### A. Initialize storeMetrics if Missing
```javascript
// Before:
if (!currentUserData.storeMetrics) {
    return { metrics: {}, history: [] };  // ❌ Returns empty
}

// After:
const metrics = currentUserData.storeMetrics || {
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    availableBalance: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    availableForPayout: 0
};  // ✅ Always has default values
```

#### B. Handle Index Error Gracefully
```javascript
catch (error) {
    // Check if it's an index error
    if (error.message && error.message.includes('index')) {
        console.error('🔥 FIRESTORE INDEX REQUIRED!');
        showToast(
            "Setup Required",
            "Payout history requires database setup. Showing available balance only.",
            5000,
            false
        );

        // Return metrics only (no history due to index error)
        return { metrics, history: [] };  // ✅ Shows balance, no history
    }
}
```

**Benefits:**
- ✅ Page loads even without Firestore index
- ✅ Shows available balance and metrics
- ✅ Friendly error message if index missing
- ✅ Better logging for debugging

---

## 🧪 Testing Instructions

### Test 1: Store Access

1. **Navigate to your store URL:**
   - Format: `yoursite.com?store=YOUR_SLUG`
   - Example: `data4less.site?store=gigsplan`

2. **Check console (F12):**
   ```javascript
   🔍 Store query result: Found 1 matching stores
   ✅ Found store with setupComplete = true
   Store found! Merchant ID: rfelXH...
   ```

3. **Expected Results:**
   - ✅ Store loads successfully
   - ✅ Products visible
   - ✅ No "Store Not Found" error

4. **If Still Not Found:**
   - Open browser console (F12)
   - Look for errors
   - Check Firestore:
     ```
     users/{your_uid}/storeConfig/
     - storeSlug: "yourslug"
     - setupComplete: true  ← Must be true!
     ```

### Test 2: Payout Page

1. **Navigate to Payout page**

2. **Check console (F12):**
   ```javascript
   📊 Fetching payout data for user: rfelXH...
   Current store metrics: {
       totalOrders: 0,
       totalRevenue: 0,
       availableBalance: 0,
       ...
   }
   ```

3. **Expected Results:**

   **If Index Exists:**
   ```javascript
   ✅ Payout history loaded: 0 records
   ```
   - Page shows metrics
   - Withdrawal history shows (empty or with records)

   **If Index Missing:**
   ```javascript
   🔥 FIRESTORE INDEX REQUIRED!
   Create index at: https://console.firebase.google.com/...
   Or see: FIRESTORE_PAYOUT_INDEX.md for instructions
   ```
   - Toast message: "Payout history requires database setup..."
   - Metrics still show (GHS 0.00)
   - History section empty

4. **Create Index (Optional):**
   - See [FIRESTORE_PAYOUT_INDEX.md](FIRESTORE_PAYOUT_INDEX.md)
   - Or use auto-generated link in console error

---

## 🔧 Manual Fixes (If Still Issues)

### Issue 1: Store Still Not Found

**Check storeConfig in Firestore:**

1. Firebase Console → Firestore
2. Navigate to: `users/{your_uid}`
3. Check if `storeConfig` exists:
   ```javascript
   storeConfig: {
       storeSlug: "yourslug",     // Must match URL
       setupComplete: true,        // Must be true!
       brandName: "My Store",
       // ... other fields
   }
   ```

4. **If `setupComplete` is missing or false:**
   - Go to your dashboard
   - Navigate to "Store Setup"
   - Complete all 3 steps
   - Click "Complete Setup" on Step 3

### Issue 2: Payout Page Still Fails

**Check if storeMetrics exists:**

1. Firebase Console → Firestore
2. Navigate to: `users/{your_uid}`
3. If `storeMetrics` doesn't exist, add it:
   ```javascript
   storeMetrics: {
       totalOrders: 0,
       totalRevenue: 0,
       totalProfit: 0,
       availableBalance: 0,
       totalPayouts: 0,
       pendingPayouts: 0,
       availableForPayout: 0
   }
   ```

4. Refresh payout page

**Or create via console:**
```javascript
// In browser console (F12), on payout page:
await updateDoc(doc(db, 'users', currentUser.uid), {
    storeMetrics: {
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        availableBalance: 0,
        totalPayouts: 0,
        pendingPayouts: 0,
        availableForPayout: 0
    }
});
location.reload();
```

---

## 📊 Console Logs Reference

### Successful Store Load:
```javascript
🔍 Store query result: Found 1 matching stores
✅ Found store with setupComplete = true
Store found! Merchant ID: rfelXHTLycQkwtGEJBkf5vEYS6G3
Store config: {
    storeSlug: "gigsplan",
    setupComplete: true,
    brandName: "Gigsplan Store",
    ...
}
```

### Successful Payout Load:
```javascript
📊 Fetching payout data for user: rfelXHTLycQkwtGEJBkf5vEYS6G3
Current store metrics: {
    totalOrders: 0,
    totalRevenue: 0,
    availableBalance: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    availableForPayout: 0
}
✅ Payout history loaded: 0 records
```

### Index Error (Expected if index not created):
```javascript
❌ Error fetching payout data: FirebaseError: ...
🔥 FIRESTORE INDEX REQUIRED!
Create index at: https://console.firebase.google.com/project/_/firestore/indexes
Or see: FIRESTORE_PAYOUT_INDEX.md for instructions
```

---

## ✅ Quick Verification

- [ ] Hard refresh: `Ctrl + Shift + R`
- [ ] Navigate to store URL: `?store=YOURSLUG`
- [ ] Store loads successfully
- [ ] Navigate to Payout page
- [ ] Payout page loads (shows GHS 0.00 if no sales)
- [ ] No "Failed to load" errors
- [ ] Check console for any errors

---

## 🎯 Summary

**Store Issue:**
- **Before:** Required Firestore composite index → Query failed → "Store Not Found"
- **After:** Simple query + in-code filtering → No index needed → Works! ✅

**Payout Issue:**
- **Before:** Returned empty if no `storeMetrics` → "Failed to load"
- **After:** Initializes default metrics → Always shows something ✅
- **Bonus:** Gracefully handles missing index with helpful message

Both issues are now fixed and will work without requiring any Firestore index setup!

**Note:** Payout history still requires index to show withdrawal records, but the page will load and show balances even without it.

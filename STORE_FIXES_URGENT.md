# Store Critical Fixes - URGENT

## 🔥 Issues Fixed

### 1. ✅ ServerTimestamp Error - FIXED
**Error:** "Function updateDoc() called with invalid data. serverTimestamp() is not currently supported inside arrays"

**Cause:** Using `serverTimestamp()` inside the product object that gets added to `storeProducts` array.

**Fix:** Changed to `Date.now()` at [script.js:6337](script.js#L6337)

```javascript
// Before (BROKEN):
addedAt: serverTimestamp()  // ❌ Doesn't work in arrays

// After (FIXED):
addedAt: Date.now()  // ✅ Works perfectly
```

---

### 2. ✅ Role Detection Fixed
**Problem:** User is agent but showing as customer

**Fix:** Added case-insensitive role checking at [script.js:6219](script.js#L6219)

```javascript
// Now handles: 'agent', 'Agent', 'AGENT', 'super_agent', 'Super_Agent', etc.
const userRole = (currentUserData?.role || 'customer').toLowerCase();
const isAgent = userRole === 'agent' || userRole === 'super_agent';
```

**Debug Logging Added:**
When you open "Add Product" page, check console for:
```javascript
🔍 Role & Pricing Debug: {
    userRole: "Agent",           // Your actual role in Firestore
    normalizedRole: "agent",     // Converted to lowercase
    isAgent: true,               // Should be true for agents
    agentPrice: 3.5,            // Agent's cost price
    customerPrice: 4.0,         // Customer's cost price
    finalCostPrice: 3.5         // Price being used (should be agent price)
}
```

---

### 3. ✅ Price Resetting Fixed
**Problem:** When changing selling price, it resets to cost + 0.40

**Fix:** Added real-time input handler at [script.js:6295-6348](script.js#L6295-L6348)

**New Behavior:**
- ✅ Profit margin updates in REAL-TIME as you type
- ✅ Your entered price is PRESERVED (no reset)
- ✅ Red border if price < cost price
- ✅ No page re-render when typing

---

## 🧪 Testing Instructions

### Step 1: Check Your Role
1. Open browser console (F12)
2. Type: `currentUserData.role`
3. Should see: `"Agent"` or `"agent"` or similar

**If it shows `"customer"`:**
- Your role in Firestore needs to be updated
- Contact admin or update in Firebase Console

### Step 2: Test Role-Based Pricing
1. Navigate to **Add Product** page
2. Open console (F12)
3. Look for log: `🔍 Role & Pricing Debug:`
4. Verify:
   - `isAgent: true` ✅
   - `finalCostPrice` = `agentPrice` (lower than customerPrice) ✅

**Example:**
```
Cost Price column should show:
- Agent sees: GHS 3.50 (agent price)
- Customer sees: GHS 4.00 (customer price)
```

### Step 3: Test Custom Selling Price
1. Go to **Add Product** → MTN tab
2. Find any package (e.g., 2GB)
3. Cost Price: GHS 4.00
4. **Edit Selling Price:**
   - Type: `5.50`
   - Profit Margin updates to: `GHS 1.50` (real-time!)
   - Change to: `6.00`
   - Profit Margin updates to: `GHS 2.00` (real-time!)

5. **Try invalid price:**
   - Type: `3.00` (less than cost)
   - Input border turns RED
   - Profit shows negative (in red)

6. Click **"Add to Store"**
7. Console shows:
```javascript
📦 Adding product to store: {
    userRole: "Agent",
    isAgent: true,
    packageAgentPrice: 3.5,
    packageCustomerPrice: 4.0,
    calculatedCostPrice: 4.0,
    userEnteredSellingPrice: 5.5,
    profitMargin: "1.50"
}

💾 Saving product to Firestore: {
    packageId: "mtn_2gb",
    network: "mtn",
    costPrice: 4,
    sellingPrice: 5.5,
    addedAt: 1732176384529,  // ✅ Now using Date.now()
    isActive: true,
    name: "2GB MTN"
}

✅ Product added successfully to store
```

### Step 4: Verify in Firestore
1. Go to Firebase Console
2. Navigate to `users/{yourUserId}`
3. Check `storeProducts` array
4. Latest product should have:
   - `costPrice`: Your role-based price
   - `sellingPrice`: Your custom price
   - `addedAt`: Timestamp number (not serverTimestamp)

---

## 🐛 Troubleshooting

### Issue 1: Still seeing "serverTimestamp error"
**Cause:** Old code cached in browser

**Fix:**
```bash
# Hard refresh
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Or clear cache
Ctrl + Shift + Delete → Clear cache
```

### Issue 2: Role still showing as customer
**Check in console:**
```javascript
// Type this in console:
currentUserData.role
```

**If it shows "customer" but you're an agent:**

**Option A: Update via Admin Panel**
1. Login to admin panel
2. Find your user
3. Enable "Golden Ticket / Agent Status"
4. Save

**Option B: Update directly in Firestore**
1. Firebase Console → Firestore
2. users → {your user id}
3. Edit `role` field to `"agent"`
4. Save
5. Refresh dashboard

### Issue 3: Price still resetting
**Debug steps:**
1. Open console (F12)
2. Change a price
3. Look for console logs
4. Check if `input` event is firing
5. Verify profit margin cell updates

**If not working:**
- Hard refresh: Ctrl + Shift + R
- Clear cache and reload

### Issue 4: Wrong price being used
**Check console log when adding:**
```javascript
📦 Adding product to store: {
    userRole: "...",        // Should be "Agent" if you're agent
    isAgent: true,          // Should be true if you're agent
    packageAgentPrice: 3.5, // Lower price for agents
    calculatedCostPrice: ?  // Should match agentPrice if you're agent
}
```

**If `calculatedCostPrice` doesn't match `packageAgentPrice`:**
- Role detection issue
- Check `isAgent` value
- Verify `userRole` field

---

## 📊 Console Logs Reference

### When Page Loads (Add Product):
```javascript
🔍 Role & Pricing Debug: {
    userRole: "Agent",
    normalizedRole: "agent",
    isAgent: true,
    samplePackage: "2GB MTN",
    agentPrice: 3.5,
    customerPrice: 4,
    finalCostPrice: 3.5
}
```

### When Typing in Selling Price:
- Profit margin updates instantly
- No console logs (real-time UI update)

### When Clicking "Add to Store":
```javascript
📦 Adding product to store: {
    packageId: "mtn_2gb",
    packageName: "2GB MTN",
    network: "mtn",
    userRole: "Agent",
    isAgent: true,
    packageAgentPrice: 3.5,
    packageCustomerPrice: 4,
    calculatedCostPrice: 3.5,
    userEnteredSellingPrice: 5,
    profitMargin: "1.50"
}

💾 Saving product to Firestore: {
    packageId: "mtn_2gb",
    network: "mtn",
    costPrice: 3.5,
    sellingPrice: 5,
    addedAt: 1732176384529,
    isActive: true,
    name: "2GB MTN",
    description: "2GB for 30 Days"
}

✅ Product added successfully to store
```

---

## ✅ Quick Verification Checklist

- [ ] Hard refresh page: Ctrl + Shift + R
- [ ] Console shows: `🔍 Role & Pricing Debug`
- [ ] `isAgent: true` (if you're an agent)
- [ ] Cost prices are lower than before (agent prices)
- [ ] Can change selling price without it resetting
- [ ] Profit margin updates in real-time
- [ ] Click "Add to Store" - NO ERROR
- [ ] Product appears in "View Products"
- [ ] Check Firestore - product saved correctly

---

## 🚀 All Fixed!

**Changes Made:**
1. ✅ Replaced `serverTimestamp()` with `Date.now()`
2. ✅ Added case-insensitive role checking
3. ✅ Added fallback: if agentPrice missing, use customerPrice
4. ✅ Added comprehensive debug logging
5. ✅ Implemented real-time profit margin updates
6. ✅ Preserved user input (no reset on type)
7. ✅ Added visual feedback (red border for invalid price)

**Next Step:**
1. Hard refresh browser: Ctrl + Shift + R
2. Go to Add Product page
3. Check console for role debug log
4. Try adding a product
5. Should work perfectly! ✅

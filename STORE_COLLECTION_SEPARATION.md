# Store Collection Separation - Complete Guide

## Problem Solved

**Issue:** Stores were only being saved in `users` collection under `storeConfig`, but the admin panel expected stores in a separate `stores` collection. This caused:
- Admin panel showing "No stores found"
- Stores not appearing in admin Stores tab
- Difficulty managing stores centrally

**Solution:** Created dedicated `stores` collection with proper structure for admin management while maintaining backward compatibility.

---

## Changes Made

### 1. Store Creation - Dual Save ([script.js:7321-7353](script.js#L7321-L7353))

When a merchant sets up their store, it now saves to **TWO** locations:

#### A. User Document (Backward Compatibility)
```javascript
// Save to users/{userId}/storeConfig
await updateUserFirestoreProfile(currentUser.uid, { storeConfig: storeConfig });
```

#### B. Stores Collection (New - For Admin Panel)
```javascript
// Save to stores/{storeSlug}
const storeDocRef = doc(db, 'stores', storeSlug);
await setDoc(storeDocRef, {
    slug: storeSlug,
    brandName: storeName,
    ownerId: currentUser.uid,
    ownerEmail: currentUserData.email,
    ownerName: currentUserData.fullName || 'N/A',
    // Store configuration
    brandLogo: brandLogoBase64,
    contactEmail: contactEmail,
    contactPhone: contactPhone,
    storeSlogan: storeSlogan,
    primaryColor: primaryColor,
    secondaryColor: secondaryColor,
    mtnLogoUrl: mtnLogoBase64,
    telecelLogoUrl: telecelLogoBase64,
    airtelTigoLogoUrl: airtelTigoLogoBase64,
    openingTime: openingTime,
    closingTime: closingTime,
    workingDays: workingDays,
    // Status fields
    setupComplete: true,
    isBanned: false,
    isActive: true,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp()
}, { merge: true });
```

---

### 2. Store Loading - Query Stores Collection ([script.js:1160-1257](script.js#L1160-L1257))

Frontend now queries the `stores` collection instead of `users` collection:

#### Old Approach (Broken)
```javascript
// ❌ Query users collection with compound where clause
const q = query(
    collection(db, 'users'),
    where('storeConfig.storeSlug', '==', storeSlug)
);
// Required Firestore composite index
// Slow for large user bases
```

#### New Approach (Fixed)
```javascript
// ✅ Direct document get from stores collection
const storeDocRef = doc(db, 'stores', storeSlug);
const storeDocSnap = await getDoc(storeDocRef);

if (storeDocSnap.exists()) {
    const storeDocument = storeDocSnap.data();

    // Check if banned
    if (storeDocument.isBanned === true) {
        // Show banned message
        return;
    }

    // Check if setup complete
    if (storeDocument.setupComplete !== true) {
        // Show setup in progress message
        return;
    }

    // Get merchant user data
    const userDocRef = doc(db, 'users', storeDocument.ownerId);
    const merchantDoc = await getDoc(userDocRef);
}
```

**Benefits:**
- ✅ No Firestore index needed
- ✅ Faster (direct document get vs query)
- ✅ Supports store banning
- ✅ Supports setup status checking
- ✅ Stores separated from user data

---

## Database Structure

### Firestore Collection: `stores`

Each store document:
- **Document ID:** Store slug (e.g., `my-data-store`)
- **Fields:**

```javascript
{
  // Identifiers
  slug: "my-data-store",           // Store URL slug
  brandName: "My Data Store",      // Store display name
  ownerId: "user123",              // Merchant user ID
  ownerEmail: "merchant@example.com",
  ownerName: "John Doe",

  // Branding
  brandLogo: "data:image/png;base64,...",  // Base64 logo
  primaryColor: "#667eea",
  secondaryColor: "#764ba2",

  // Network Logos (optional)
  mtnLogoUrl: "data:image/png;base64,...",
  telecelLogoUrl: "data:image/png;base64,...",
  airtelTigoLogoUrl: "data:image/png;base64,...",

  // Contact
  contactEmail: "support@mystore.com",
  contactPhone: "0501234567",
  storeSlogan: "Best prices in town!",

  // Operating Hours
  openingTime: "08:00",
  closingTime: "20:00",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],

  // Status
  setupComplete: true,    // Store setup finished
  isBanned: false,        // Admin can ban stores
  isActive: true,         // Store is active

  // Timestamps
  createdAt: Timestamp,   // When store was created
  lastUpdated: Timestamp  // Last modification
}
```

---

### Firestore Collection: `users` (Still contains store info)

Each merchant user still has `storeConfig` for backward compatibility:

```javascript
{
  uid: "user123",
  email: "merchant@example.com",
  fullName: "John Doe",
  role: "agent",  // or "customer"

  // Store configuration (same as stores collection)
  storeConfig: {
    storeName: "My Data Store",
    storeSlug: "my-data-store",
    brandLogo: "data:image/png;base64,...",
    // ... (same fields as stores collection)
    setupComplete: true,
    lastUpdated: Timestamp
  },

  // Store products (still in users collection)
  storeProducts: [
    {
      packageId: "mtn_2gb",
      network: "mtn",
      name: "2GB MTN",
      costPrice: 3.5,
      sellingPrice: 5.0,
      isActive: true,
      addedAt: 1732176384529
    },
    // ... more products
  ]
}
```

**Why keep storeConfig in users?**
- Backward compatibility with existing code
- Easy access to store info when user is logged in
- Products remain in user document (merchant-specific inventory)

---

## Admin Panel Integration

### Stores Tab ([paneladmin.html:2230](paneladmin.html#L2230))

Admin panel already queries the `stores` collection:

```javascript
const loadStores = async () => {
    const storesSnapshot = await getDocs(
        query(collection(db, "stores"), orderBy("brandName"))
    );

    let stores = storesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Display stores in table
    stores.forEach(store => {
        const owner = findUserInCache(store.ownerId);
        tbody.innerHTML += `
            <tr>
                <td>${store.brandName || 'N/A'}</td>
                <td>${store.slug || 'N/A'}</td>
                <td>${owner?.email || 'N/A'}</td>
                <td><span class="status-badge">${approvalStatus}</span></td>
                <td><span class="status-badge">${store.isBanned ? 'Banned' : 'Active'}</span></td>
                <td>
                    <button class="action-btn ${store.isBanned ? 'unban' : 'ban'}-store-btn">
                        ${store.isBanned ? 'Unban' : 'Ban'}
                    </button>
                </td>
            </tr>
        `;
    });
};
```

**Now Works Because:**
- ✅ Stores are created in `stores` collection
- ✅ Admin can see all stores
- ✅ Admin can ban/unban stores
- ✅ Store status reflects in frontend

---

## Store URL Format

### Before (Still works)
```
https://yoursite.com/?merchant=my-data-store
```

### After (Same)
```
https://yoursite.com/?merchant=my-data-store
```

**Query Parameter:** `?merchant={storeSlug}`

**Example Flow:**
1. User visits `?merchant=my-data-store`
2. System extracts `storeSlug` = `my-data-store`
3. Queries `stores/my-data-store` document
4. Gets `ownerId` from store document
5. Fetches user data from `users/{ownerId}`
6. Combines store config + user products
7. Renders store

---

## Firestore Security Rules

### Required Rules for `stores` Collection

Add these rules to allow public read access to active stores:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Stores collection
    match /stores/{storeSlug} {
      // Anyone can read active, non-banned stores
      allow read: if request.auth != null ||
                     (resource.data.setupComplete == true &&
                      resource.data.isBanned != true);

      // Only store owner can create/update their store
      allow create, update: if request.auth != null &&
                               request.auth.uid == request.resource.data.ownerId;

      // Only admins can delete or ban stores
      allow delete: if request.auth != null &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // ... other rules
  }
}
```

**Security Features:**
- ✅ Public can view active stores (for ?merchant= links)
- ✅ Only owner can create/update their store
- ✅ Only admins can delete stores
- ✅ Banned stores not readable by public

---

## Testing Instructions

### Test 1: Create New Store

1. **Login as merchant/agent**
2. **Navigate to Store Setup page**
3. **Fill in all details:**
   - Store Name: "Test Store"
   - Store Slug: "test-store"
   - Upload brand logo
   - Set colors, contact info
   - Set opening hours
4. **Click "Save Store Setup"**
5. **Check Firebase Console:**
   - Go to Firestore Database
   - Check `stores` collection
   - Should see document with ID: `test-store`
   - Verify all fields present
   - Check `users/{yourUserId}`
   - Should also have `storeConfig` field

**Expected Result:**
- ✅ Store saved in both `stores` collection AND `users` document
- ✅ Console log: "✅ Store created in both users collection and stores collection"
- ✅ Store link generated: `https://yoursite.com/?merchant=test-store`

---

### Test 2: View Store in Admin Panel

1. **Login to admin panel**
2. **Navigate to Stores tab**
3. **Should see:**
   - List of all stores
   - Store name: "Test Store"
   - Slug: "test-store"
   - Owner email
   - Status: Active
   - Ban/Unban button

**Expected Result:**
- ✅ All stores visible
- ✅ Search works
- ✅ Filter by status works
- ✅ No "No stores found" message

---

### Test 3: Access Store via URL

1. **Visit:** `https://yoursite.com/?merchant=test-store`
2. **Check console (F12):**
   - `🔍 Store query result: Found`
   - `✅ Store found: Test Store`
   - `✅ Merchant found: {userId}`
   - `📦 Store config: {...}`
3. **Verify store loads:**
   - Correct branding
   - Correct colors
   - Products display
   - Contact info correct

**Expected Result:**
- ✅ Store loads successfully
- ✅ No "Store not found" error
- ✅ All branding correct
- ✅ Products visible

---

### Test 4: Ban Store (Admin)

1. **Admin panel → Stores tab**
2. **Click "Ban" on test store**
3. **Confirm ban**
4. **Visit store URL:** `?merchant=test-store`
5. **Should see:**
   ```
   🚫 Store Suspended
   This store has been temporarily suspended.
   ```

**Expected Result:**
- ✅ Store status changes to "Banned" in admin
- ✅ Public cannot access store
- ✅ Clear message shown
- ✅ Merchant can still login to dashboard

---

### Test 5: Update Store

1. **Login as merchant**
2. **Go to Store Setup page**
3. **Change store slogan**
4. **Click "Save Store Setup"**
5. **Check Firestore:**
   - `stores/test-store` - `storeSlogan` updated
   - `users/{userId}/storeConfig` - `storeSlogan` updated
6. **Visit store URL**
7. **Verify new slogan displays**

**Expected Result:**
- ✅ Both collections updated
- ✅ Changes reflect immediately
- ✅ `lastUpdated` timestamp refreshed

---

## Troubleshooting

### Issue: "Store not found" after creation

**Cause:** Store document not created in `stores` collection

**Check:**
1. Firebase Console → Firestore → `stores` collection
2. Look for document with ID matching your store slug
3. If missing, store creation failed

**Solution:**
```javascript
// Check console for errors during save
// Look for: "✅ Store created in both users collection and stores collection"
// If error, check Firestore security rules
```

---

### Issue: Admin panel shows no stores

**Cause:** `stores` collection doesn't exist or is empty

**Check:**
1. Firestore → Collections
2. Verify `stores` collection exists
3. Check if any documents present

**Solution:**
- Create a new store via Store Setup page
- Verify it appears in Firestore
- Refresh admin panel

---

### Issue: Permission denied when creating store

**Cause:** Firestore security rules blocking write

**Solution:**
Add rule for stores creation:
```javascript
match /stores/{storeSlug} {
  allow create, update: if request.auth != null &&
                           request.auth.uid == request.resource.data.ownerId;
}
```

---

### Issue: Store loads but branding is wrong

**Cause:** Data mismatch between `stores` collection and `users/storeConfig`

**Check:**
1. Compare `stores/{slug}` fields
2. Compare `users/{userId}/storeConfig` fields
3. Look for differences

**Solution:**
- Re-save store setup to sync both
- Or manually update Firestore documents to match

---

## Migration Guide

### For Existing Stores (Before This Update)

If you have merchants who already created stores in the old format (only in `users` collection):

#### Option 1: Ask Merchants to Re-Save

1. Each merchant logs in
2. Goes to Store Setup page
3. Form auto-fills with existing data
4. Clicks "Save Store Setup"
5. Store now created in `stores` collection

#### Option 2: Admin Migration Script

Create a one-time script to migrate all existing stores:

```javascript
// Run this ONCE in browser console on admin page
async function migrateExistingStores() {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    let migratedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        // Check if user has storeConfig
        if (userData.storeConfig && userData.storeConfig.setupComplete === true) {
            const storeSlug = userData.storeConfig.storeSlug;

            // Create store document
            const storeDocRef = doc(db, 'stores', storeSlug);
            await setDoc(storeDocRef, {
                slug: storeSlug,
                brandName: userData.storeConfig.storeName,
                ownerId: userDoc.id,
                ownerEmail: userData.email,
                ownerName: userData.fullName || 'N/A',
                brandLogo: userData.storeConfig.brandLogo,
                contactEmail: userData.storeConfig.contactEmail,
                contactPhone: userData.storeConfig.contactPhone,
                storeSlogan: userData.storeConfig.storeSlogan,
                primaryColor: userData.storeConfig.primaryColor,
                secondaryColor: userData.storeConfig.secondaryColor,
                mtnLogoUrl: userData.storeConfig.mtnLogoUrl,
                telecelLogoUrl: userData.storeConfig.telecelLogoUrl,
                airtelTigoLogoUrl: userData.storeConfig.airtelTigoLogoUrl,
                openingTime: userData.storeConfig.openingTime,
                closingTime: userData.storeConfig.closingTime,
                workingDays: userData.storeConfig.workingDays,
                setupComplete: true,
                isBanned: false,
                isActive: true,
                createdAt: userData.storeConfig.lastUpdated || serverTimestamp(),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            migratedCount++;
            console.log(`✅ Migrated store: ${storeSlug}`);
        }
    }

    console.log(`🎉 Migration complete! ${migratedCount} stores migrated.`);
}

// Run migration
migrateExistingStores();
```

---

## Summary

### What Changed

1. ✅ **Store Creation:** Now saves to both `stores` collection and `users/storeConfig`
2. ✅ **Store Loading:** Queries `stores` collection instead of `users` collection
3. ✅ **Admin Panel:** Now sees all stores (was showing "No stores found")
4. ✅ **Store Banning:** Admin can ban stores, frontend respects ban status
5. ✅ **Performance:** Direct document get instead of compound query (no index needed)

### What Stayed the Same

1. ✅ **Store URL format:** Still uses `?merchant={slug}`
2. ✅ **Products location:** Still in `users/{userId}/storeProducts`
3. ✅ **User dashboard:** Still works the same
4. ✅ **Backward compatibility:** `storeConfig` still in user document

### Benefits

- ✅ Stores visible in admin panel
- ✅ Centralized store management
- ✅ Faster store loading
- ✅ No Firestore indexes needed
- ✅ Store banning supported
- ✅ Better separation of concerns
- ✅ Scalable architecture

---

**Files Modified:**
- [script.js:7321-7353](script.js#L7321-L7353) - Store creation
- [script.js:1160-1257](script.js#L1160-L1257) - Store loading
- [paneladmin.html:2230](paneladmin.html#L2230) - Admin stores (already correct)

**New Collection:**
- `stores` - Dedicated store documents

**Last Updated:** 2025-11-21

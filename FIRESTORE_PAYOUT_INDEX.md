# Firestore Index for Payout Requests

## Required Index

This index is needed for querying payout requests by merchant ID and ordering by request date.

### Collection: `payoutRequests`

**Fields to Index:**
- `merchantId` (Ascending)
- `requestedAt` (Descending)

---

## Option 1: Create via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Enter the following:
   - **Collection ID:** `payoutRequests`
   - **Fields:**
     - Field: `merchantId` | Order: `Ascending`
     - Field: `requestedAt` | Order: `Descending`
   - **Query scopes:** Collection
6. Click **Create**
7. Wait for index to build (usually 1-2 minutes)

---

## Option 2: Create via Firebase CLI

### Step 1: Add to firestore.indexes.json

Create or edit `firestore.indexes.json` in your project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "payoutRequests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "merchantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "requestedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Step 2: Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

---

## Option 3: Use Auto-Generated Link

When you try to query without the index, Firestore will show an error with a direct link to create the index.

1. Open your app in browser
2. Navigate to **Payout** page
3. Open browser console (F12)
4. Look for error like:
   ```
   The query requires an index. You can create it here: https://console.firebase.google.com/...
   ```
5. Click the link
6. Click **Create Index**
7. Wait for it to build

---

## Verification

After creating the index, test it:

```javascript
// This query should now work without errors
const payoutHistoryRef = collection(db, 'payoutRequests');
const q = query(
    payoutHistoryRef,
    where('merchantId', '==', currentUser.uid),
    orderBy('requestedAt', 'desc')
);
const querySnapshot = await getDocs(q);
```

---

## Additional Recommended Indexes for Store Features

### For Store Orders (if needed)

```json
{
  "collectionGroup": "storeOrders",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "merchantId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

### For Store Orders by Customer Phone

```json
{
  "collectionGroup": "storeOrders",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "merchantId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "beneficiaryNumber",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

---

## Complete firestore.indexes.json for Store Features

```json
{
  "indexes": [
    {
      "collectionGroup": "payoutRequests",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "merchantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "requestedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "storeOrders",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "merchantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "storeOrders",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "merchantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "beneficiaryNumber",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "storeOrders",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "merchantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "customerPhone",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Troubleshooting

### Issue: "The query requires an index"

**Solution:** The index hasn't been created yet or is still building.
- Check Firebase Console → Firestore → Indexes tab
- Wait for status to change from "Building" to "Enabled"
- Usually takes 1-2 minutes for small databases

### Issue: "Index already exists"

**Solution:** The index is already created. No action needed.

### Issue: "Permission denied"

**Solution:** Check Firestore security rules allow reading `payoutRequests`:
```javascript
match /payoutRequests/{requestId} {
  allow read: if request.auth != null &&
    (resource.data.merchantId == request.auth.uid ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
  allow write: if request.auth != null && request.auth.uid == request.resource.data.merchantId;
}
```

---

## Quick Setup Command

```bash
# Create firestore.indexes.json with the content above, then:
firebase deploy --only firestore:indexes
```

**Recommended:** Use Option 1 (Firebase Console) for quickest setup.

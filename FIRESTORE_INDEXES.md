# Firestore Composite Indexes Required

This document lists all the composite indexes you need to create in your Firebase Console for optimal query performance.

## How to Create Indexes

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** → **Composite**
4. Click **Create Index**
5. Enter the details for each index below

---

## Required Indexes

### 1. Orders Collection - User Orders by Status
**Collection ID:** `orders`

| Field | Order |
|-------|-------|
| userId | Ascending |
| status | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** User order history filtering by status

---

### 2. Orders Collection - General Orders Query
**Collection ID:** `orders`

| Field | Order |
|-------|-------|
| userId | Ascending |
| orderType | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** Filtering user orders excluding AFA registrations

---

### 3. Store Orders Collection - Admin Query by Status
**Collection ID:** `storeOrders`

| Field | Order |
|-------|-------|
| status | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** Admin panel store orders filtering

---

### 4. Store Orders Collection - Merchant Orders
**Collection ID:** `storeOrders`

| Field | Order |
|-------|-------|
| merchantId | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** Merchant-specific order queries

---

### 5. Manual Top-ups Collection - Status Filter
**Collection ID:** `manualTopups`

| Field | Order |
|-------|-------|
| status | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** Admin panel manual top-ups filtering

---

### 6. Transactions Collection - User Transactions
**Collection ID:** `transactions`

| Field | Order |
|-------|-------|
| userId | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** User transaction history

---

### 7. Top-ups Collection - User Top-ups Query
**Collection ID:** `topups`

| Field | Order |
|-------|-------|
| userId | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** Wallet page top-up history

---

### 8. AFA Registrations Collection
**Collection ID:** `afa_registrations`

| Field | Order |
|-------|-------|
| status | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** Admin panel AFA registration filtering (optional - may auto-create)

---

### 9. Notifications Collection - User Notifications
**Collection ID:** `notifications`

| Field | Order |
|-------|-------|
| userId | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** User notification loading

---

### 10. Stores Collection - Merchant Stores
**Collection ID:** `stores`

| Field | Order |
|-------|-------|
| ownerId | Ascending |
| createdAt | Descending |

**Query scope:** Collection

**Use case:** Merchant store management (if applicable)

---

## Alternative: Use Firebase CLI

You can also create these indexes using the Firebase CLI by creating a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "orderType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "storeOrders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "storeOrders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "merchantId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "manualTopups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "topups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy with:
```bash
firebase deploy --only firestore:indexes
```

---

## Notes

- Some indexes may be auto-created by Firebase when you first run queries that need them
- If you see an error message in your console about missing indexes, Firebase will provide a direct link to create the index
- Indexes can take a few minutes to build, especially if you already have data
- You can check index build status in the Firebase Console under **Firestore Database** → **Indexes**

---

## Verification

After creating all indexes, verify they're working by:

1. Going to each admin panel tab (Users, Orders, Store Orders, Manual Top-ups, AFA Registrations)
2. Testing filters and searches
3. Checking browser console for any "Missing index" errors

All queries should load quickly without errors once indexes are built.

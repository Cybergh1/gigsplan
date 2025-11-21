# Firestore Indexes and Configuration Guide

## 🚀 Quick Start - First Time Setup

**Before testing your store, you MUST create Index #3** (Users by Store Slug). Without it, stores will not work!

### Fastest Way to Create the Index:

1. Save your store setup in the dashboard
2. Copy the generated store link
3. Try to visit the store link
4. You'll see an error with a link from Firebase
5. **Click that link** - it will take you directly to create the index
6. Click "Create Index" and wait 5-10 minutes

**Or manually create it:**
- Go to [Firebase Console](https://console.firebase.google.com/)
- Firestore Database → Indexes → Create Index
- Collection: `users`
- Field: `storeConfig.storeSlug` (Ascending)
- Click Create

---

## Required Firestore Indexes

To ensure your application works correctly, you need to create the following composite indexes in Firebase Firestore.

### How to Create Indexes

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **quickxpress-1992e**
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"** button
5. Add the indexes listed below

---

## Index 1: Store Orders by Merchant and Beneficiary Number

**Collection ID:** `storeOrders`

**Fields to Index:**
| Field Name | Order |
|------------|-------|
| merchantId | Ascending |
| beneficiaryNumber | Ascending |
| createdAt | Descending |

**Query Scope:** Collection

**Purpose:** Allows querying store orders by merchant ID and beneficiary phone number, sorted by creation date.

**Used in:** `store.html` - Order history search functionality

---

## Index 2: Store Orders by Merchant and Customer Phone

**Collection ID:** `storeOrders`

**Fields to Index:**
| Field Name | Order |
|------------|-------|
| merchantId | Ascending |
| customerPhone | Ascending |
| createdAt | Descending |

**Query Scope:** Collection

**Purpose:** Allows querying store orders by merchant ID and customer MoMo phone number, sorted by creation date.

**Used in:** `store.html` - Order history search functionality

---

## Index 3: Users by Store Slug ⚠️ **CRITICAL - REQUIRED FOR STORES TO WORK**

**Collection ID:** `users`

**Fields to Index:**
| Field Name | Order |
|------------|-------|
| storeConfig.storeSlug | Ascending |

**Query Scope:** Collection

**Purpose:** Allows finding merchants by their store slug to load store configuration.

**Used in:** `store.html` - Store initialization

**⚠️ IMPORTANT:** Without this index, stores will show "Store Not Found" error. This is the most critical index for the store feature to work.

**How to Create:**
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `users`
4. Add field: `storeConfig.storeSlug` (Ascending)
5. Query scope: Collection
6. Click "Create"
7. Wait 5-10 minutes for index to build

**Or click the link in the error message** when you try to visit a store for the first time - Firebase will auto-generate the index creation link.

---

## Index 4: Data Packages by Network and Active Status

**Collection Group ID:** `packages` (Collection Group)

**Fields to Index:**
| Field Name | Order |
|------------|-------|
| isActive | Ascending |
| customerPrice | Ascending |

**Query Scope:** Collection Group

**Purpose:** Allows querying active data packages sorted by price across all networks.

**Used in:** `script.js` - Loading available data packages for each network

---

## Additional Indexes (if needed)

### Index 5: Orders by User and Status

**Collection ID:** `orders`

**Fields to Index:**
| Field Name | Order |
|------------|-------|
| userId | Ascending |
| status | Ascending |
| createdAt | Descending |

**Purpose:** Query user orders filtered by status

---

### Index 6: Top-ups by User and Date

**Collection ID:** `topups`

**Fields to Index:**
| Field Name | Order |
|------------|-------|
| userId | Ascending |
| createdAt | Descending |

**Purpose:** Query user wallet top-ups by date

---

## Firestore Security Rules

Ensure you have appropriate security rules set up. Here's a recommended base configuration:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;

      // Allow reading store config for public stores
      allow get: if resource.data.storeConfig.setupComplete == true;
    }

    // Store Orders collection
    match /storeOrders/{orderId} {
      allow read: if request.auth != null;
      allow create: if true; // Allow public order creation
      allow update, delete: if request.auth != null &&
        (request.auth.uid == resource.data.merchantId ||
         request.auth.uid == resource.data.userId);
    }

    // Data Packages collection
    match /dataPackages/{network}/packages/{packageId} {
      allow read: if true; // Public read access
      allow write: if request.auth != null; // Authenticated write
    }

    // Orders collection
    match /orders/{orderId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.userId);
      allow create: if request.auth != null;
    }

    // Top-ups collection
    match /topups/{topupId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.userId);
      allow create: if request.auth != null;
    }

    // Site settings (read-only for authenticated users)
    match /siteSettings/{doc} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only via Firebase Console
    }
  }
}
```

---

## Store Setup Features

### Brand Logo Upload

The store setup form now includes an image upload feature for brand logos:

**Features:**
- Upload image files (PNG, JPG, GIF)
- Maximum file size: 2MB
- Automatic conversion to base64 data URL
- Real-time preview before saving
- Base64 string stored directly in Firestore (`users/{userId}/storeConfig.brandLogo`)

**Benefits of Base64 Storage:**
- No need for Firebase Storage
- Immediate availability (no URL generation delays)
- Works in browser directly
- No additional storage costs

**How it works:**
1. User selects an image file
2. JavaScript converts the image to base64 using FileReader API
3. Preview shown immediately
4. Base64 string saved to Firestore when form is submitted
5. Store page (`store.html`) loads and displays the base64 image directly

---

## Store Detection

The system automatically detects stores using the following process:

1. **Store Slug URL Parameter:**
   - URL format: `store.html?store=your-store-slug`
   - Example: `store.html?store=maxjaydata`

2. **Firestore Query:**
   - Queries `users` collection
   - Filters by `storeConfig.storeSlug == 'your-store-slug'`
   - Returns merchant user document

3. **Store Configuration:**
   - Loads `storeConfig` object from merchant's user document
   - Includes: storeName, brandLogo (base64), colors, hours, etc.

4. **Products Loading:**
   - Loads `storeProducts` array from merchant's document
   - Cross-references with global `dataPackages` collection
   - Displays only active products configured by merchant

---

## Add to Cart Functionality

The add to cart system works as follows:

1. **Product Selection:**
   - Customer selects network (MTN, Telecel, AT)
   - Modal opens with available packages
   - Customer enters beneficiary phone and MoMo number

2. **Order Creation:**
   - Validates all inputs
   - Creates order document in `storeOrders` collection
   - Includes: merchantId, productId, prices, phone numbers
   - Status starts as 'pending'

3. **Order Data Structure:**
```javascript
{
  merchantId: "string",
  storeName: "string",
  productId: "string",
  productNetwork: "string",
  productName: "string",
  packageSize: "string",
  sellingPrice: number,
  costPrice: number,
  profit: number,
  customerName: "string",
  customerPhone: "string", // MoMo number
  beneficiaryNumber: "string", // Number receiving data
  status: "pending",
  createdAt: timestamp,
  paymentGatewayRef: "string",
  paymentStatus: "initiated"
}
```

---

## Testing Checklist

### Store Setup Testing

- [ ] Navigate to Store Setup page
- [ ] Fill in store name and slug
- [ ] Upload brand logo (test with different image formats)
- [ ] Verify image preview appears
- [ ] Test file size validation (try uploading >2MB image)
- [ ] Complete all 3 setup steps
- [ ] Save store configuration
- [ ] Verify store link is generated
- [ ] Click "Visit Store" button

### Store Page Testing

- [ ] Visit store using generated URL
- [ ] Verify brand logo displays correctly
- [ ] Check store name appears in header
- [ ] Verify colors match configuration
- [ ] Test business hours display
- [ ] Click on network card (MTN, Telecel, AT)
- [ ] Verify modal opens with packages
- [ ] Fill in beneficiary number
- [ ] Fill in MoMo number
- [ ] Submit order
- [ ] Verify order appears in Firestore `storeOrders` collection

### Order History Testing

- [ ] Enter phone number in order search
- [ ] Verify orders display for that phone number
- [ ] Check both beneficiary and customer phone searches work
- [ ] Verify order details are correct

---

## Common Issues and Solutions

### Issue 1: "Index required" error

**Error:** `The query requires an index`

**Solution:**
1. Click the link in the error message to create the index automatically
2. OR manually create the index as described in this document
3. Wait 5-10 minutes for index to build

### Issue 2: Store not found

**Possible Causes:**
- Store slug doesn't match exactly (case-sensitive)
- Store setup not completed (setupComplete !== true)
- User document missing storeConfig

**Solution:**
- Check Firestore Console for user document
- Verify storeConfig.storeSlug field exists
- Ensure setupComplete is set to true

### Issue 3: Logo not displaying

**Possible Causes:**
- Base64 string corrupted
- Image too large (>2MB)
- Browser cache issues

**Solution:**
- Re-upload logo through store setup
- Clear browser cache
- Check browser console for errors

### Issue 4: Form clears after saving store

**Solution:** ✅ FIXED in v2.1
- Form now persists data after saving
- Can edit store without re-uploading logo
- Existing logo is preserved unless new one is uploaded

### Issue 5: Store slug must be exact

**Important Notes:**
- Store slugs are automatically converted to lowercase
- Spaces are not allowed in slugs
- Use hyphens instead of spaces (e.g., "my-store" not "my store")
- Slug is saved in Firestore as lowercase
- URL parameter is case-insensitive

### Issue 4: Orders not saving

**Possible Causes:**
- Security rules blocking writes
- Missing required fields
- Network timeout

**Solution:**
- Check Firestore security rules
- Verify all required fields are present
- Check browser network tab for failed requests

---

## Database Collections Overview

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `users` | User accounts and store configs | email, balance, storeConfig, storeProducts |
| `storeOrders` | Customer orders from stores | merchantId, productId, status, customerPhone |
| `orders` | Internal system orders | userId, status, orderType |
| `topups` | Wallet top-up transactions | userId, amount, status |
| `dataPackages` | Global product catalog | network, packages (subcollection) |
| `dataPackages/{network}/packages` | Network-specific packages | name, customerPrice, agentPrice, isActive |
| `siteSettings` | System configuration | afaFee, maintenance, notifications |

---

## Support

For additional help:
- Email: hca.edu.gh@gmail.com
- WhatsApp: +233 55 220 2292

---

## Version History

**v1.0** - Initial setup with URL-based logo

**v2.0** - Updated to base64 image upload with preview
- Added file upload input
- Added base64 conversion
- Added real-time preview
- Updated store loading to display base64 images

**v2.1** - Dynamic base URL detection and Become an Agent improvements
- Store URLs now detect base URL automatically (works on localhost and production)
- Store URL preview updates in real-time as you type the slug
- Become an Agent button with premium gradient styling
- Auto-hide Become an Agent button for existing agents
- Agent application system with pending status
- Improved button positioning and visual hierarchy

---

## New Features (v2.1)

### Dynamic Store URL Generation

The system now automatically detects your base URL, so store links work correctly whether you're on:
- Localhost: `http://localhost:3000/store.html?store=yourslug`
- Production: `https://yourdomain.com/store.html?store=yourslug`

**How it works:**
```javascript
const baseUrl = `${window.location.protocol}//${window.location.host}`;
const storeUrl = `${baseUrl}/store.html?store=${storeSlug}`;
```

### Become an Agent Feature

**User Flow:**
1. Customer sees "Become an Agent" button on dashboard
2. Clicks button → Confirmation dialog appears
3. Upon confirmation → Status changes to "pending"
4. Admin reviews application in Firebase Console
5. Admin sets `isAgentApproved: true` and `role: 'Agent'`
6. User gets Agent privileges

**Button Behavior:**
- **Visible:** For regular customers only
- **Hidden:** For existing agents and pending applications
- **Auto-updates:** When role/status changes

**Styling:**
- Premium purple gradient background
- Subtle shadow and hover effects
- Positioned at the top of dashboard
- Stands out from other action buttons

---

*Last Updated: January 2025*

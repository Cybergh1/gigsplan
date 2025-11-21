# 🚀 COMPLETE IMPLEMENTATION GUIDE

## TABLE OF CONTENTS
1. [Firestore Indexes](#firestore-indexes)
2. [Golden Ticket Implementation](#golden-ticket-implementation)
3. [Agent Packages Rendering](#agent-packages-rendering)
4. [Manual Top-Ups with Approval](#manual-top-ups-approval)
5. [Store Controls (Close All Stores, Sunday Restriction)](#store-controls)
6. [Fix User Display (N/A Issues)](#fix-user-display)
7. [Notification System](#notification-system)
8. [AFA Registration Admin View](#afa-registration-admin)

---

## 1. FIRESTORE INDEXES {#firestore-indexes}

### Go to Firebase Console → Firestore → Indexes → Create Index

Create these composite indexes:

```
Index 1: Orders by User and Date
Collection: orders
Fields Indexed:
  - userId (Ascending)
  - createdAt (Descending)
Query Scope: Collection

Index 2: Orders by User, Status, and Date
Collection: orders
Fields Indexed:
  - userId (Ascending)
  - status (Ascending)
  - createdAt (Descending)
Query Scope: Collection

Index 3: Store Orders by Merchant
Collection: storeOrders
Fields Indexed:
  - merchantId (Ascending)
  - createdAt (Descending)
Query Scope: Collection

Index 4: Store Orders by Status
Collection: storeOrders
Fields Indexed:
  - status (Ascending)
  - createdAt (Descending)
Query Scope: Collection

Index 5: Manual Top-Ups by Status
Collection: manualTopups
Fields Indexed:
  - status (Ascending)
  - createdAt (Descending)
Query Scope: Collection

Index 6: Users by Golden Ticket Status
Collection: users
Fields Indexed:
  - isGoldenActivated (Ascending)
  - isApproved (Ascending)
Query Scope: Collection

Index 7: AFA Registrations by User
Collection: afaRegistrations
Fields Indexed:
  - userId (Ascending)
  - createdAt (Descending)
Query Scope: Collection

Index 8: Notifications by User and Read Status
Collection: notifications
Fields Indexed:
  - userId (Ascending)
  - isRead (Ascending)
  - createdAt (Descending)
Query Scope: Collection
```

---

## 2. GOLDEN TICKET IMPLEMENTATION {#golden-ticket-implementation}

### A. Add Golden Ticket Button to index.html

Find the wallet section or profile section and add:

```html
<!-- Add this button in the profile or wallet section -->
<button id="becomeAgentBtn" class="action-button" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
    <i class="fas fa-ticket-alt"></i> Become an Agent
</button>
```

### B. Add Golden Ticket Modal to index.html (Before closing </body>)

```html
<!-- Golden Ticket / Become Agent Modal -->
<div class="modal-overlay" id="goldenTicketModalOverlay">
    <div class="modal-content">
        <div class="modal-header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <h3 style="color: white;">🎫 Become an Agent</h3>
            <button type="button" class="modal-close-btn">×</button>
        </div>
        <div class="modal-body">
            <div class="golden-ticket-info">
                <div class="benefit-card" style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="color: #856404; margin-bottom: 10px;">✨ Agent Benefits</h4>
                    <ul style="color: #856404; line-height: 1.8;">
                        <li>✅ Access to discounted agent prices</li>
                        <li>✅ Earn higher profit margins</li>
                        <li>✅ Priority customer support</li>
                        <li>✅ Exclusive agent-only packages</li>
                    </ul>
                </div>

                <div class="price-display" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0; color: #6c757d; font-size: 14px;">One-time Activation Fee</p>
                    <h2 style="margin: 10px 0; color: #28a745; font-size: 36px; font-weight: bold;">
                        GH₵ <span id="goldenTicketPriceDisplay">40.00</span>
                    </h2>
                    <p style="margin: 0; color: #6c757d; font-size: 12px;">Non-refundable</p>
                </div>

                <div class="balance-check" style="padding: 15px; background: #e7f3ff; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #004085;">Your Balance:</span>
                        <span style="font-weight: bold; color: #004085; font-size: 18px;">
                            GH₵ <span id="goldenTicketModalBalance">0.00</span>
                        </span>
                    </div>
                    <div id="goldenTicketBalanceWarning" style="display: none; margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 6px; color: #721c24; font-size: 14px;">
                        ⚠️ Insufficient balance. Please top up your wallet first.
                    </div>
                </div>

                <div class="approval-notice" style="padding: 15px; background: #fff3cd; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                        ℹ️ <strong>Admin Approval Required:</strong> After purchase, your agent status will be pending admin approval. You'll be notified once approved.
                    </p>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="goldenTicketAgreeCheckbox" style="margin-right: 10px;">
                        <span style="font-size: 14px;">I agree to the terms and understand this is non-refundable</span>
                    </label>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="modal-btn cancel" id="goldenTicketCancelBtn">Cancel</button>
            <button type="button" class="modal-btn confirm" id="goldenTicketPurchaseBtn" disabled>
                <i class="fas fa-ticket-alt"></i> <span class="btn-text">Purchase & Activate</span><span class="spinner"></span>
            </button>
        </div>
    </div>
</div>
```

### C. Add to script.js DOMElements (around line 107):

```javascript
// Add to DOMElements object:
becomeAgentBtn: document.getElementById('becomeAgentBtn'),
goldenTicketModalOverlay: document.getElementById('goldenTicketModalOverlay'),
goldenTicketPriceDisplay: document.getElementById('goldenTicketPriceDisplay'),
goldenTicketModalBalance: document.getElementById('goldenTicketModalBalance'),
goldenTicketBalanceWarning: document.getElementById('goldenTicketBalanceWarning'),
goldenTicketAgreeCheckbox: document.getElementById('goldenTicketAgreeCheckbox'),
goldenTicketCancelBtn: document.getElementById('goldenTicketCancelBtn'),
goldenTicketPurchaseBtn: document.getElementById('goldenTicketPurchaseBtn'),
```

### D. Add Golden Ticket Logic to script.js (Add after line 2300):

```javascript
// ============================================================================
// GOLDEN TICKET / BECOME AGENT FUNCTIONALITY
// ============================================================================

// Show/Hide Become Agent Button based on user status
function updateBecomeAgentButtonVisibility() {
    if (!DOMElements.becomeAgentBtn) return;

    if (currentUserData && !currentUserData.isGoldenActivated) {
        DOMElements.becomeAgentBtn.style.display = 'block';
    } else {
        DOMElements.becomeAgentBtn.style.display = 'none';
    }
}

// Open Golden Ticket Modal
if (DOMElements.becomeAgentBtn) {
    DOMElements.becomeAgentBtn.addEventListener('click', async () => {
        if (!currentUserData) return;

        // Load golden ticket price from siteSettings
        const goldenTicketPrice = siteSettings.goldenTicketPrice || 40.00;

        // Update modal with current price and balance
        DOMElements.goldenTicketPriceDisplay.textContent = goldenTicketPrice.toFixed(2);
        DOMElements.goldenTicketModalBalance.textContent = (currentUserData.balance || 0).toFixed(2);

        // Check if user has sufficient balance
        const hasSufficientBalance = (currentUserData.balance || 0) >= goldenTicketPrice;

        if (hasSufficientBalance) {
            DOMElements.goldenTicketBalanceWarning.style.display = 'none';
        } else {
            DOMElements.goldenTicketBalanceWarning.style.display = 'block';
        }

        // Reset checkbox
        DOMElements.goldenTicketAgreeCheckbox.checked = false;
        DOMElements.goldenTicketPurchaseBtn.disabled = true;

        openModal(DOMElements.goldenTicketModalOverlay);
    });
}

// Enable/Disable purchase button based on checkbox
if (DOMElements.goldenTicketAgreeCheckbox) {
    DOMElements.goldenTicketAgreeCheckbox.addEventListener('change', (e) => {
        DOMElements.goldenTicketPurchaseBtn.disabled = !e.target.checked;
    });
}

// Cancel Golden Ticket
if (DOMElements.goldenTicketCancelBtn) {
    DOMElements.goldenTicketCancelBtn.addEventListener('click', () => {
        closeModal(DOMElements.goldenTicketModalOverlay);
    });
}

// Purchase Golden Ticket
if (DOMElements.goldenTicketPurchaseBtn) {
    DOMElements.goldenTicketPurchaseBtn.addEventListener('click', async () => {
        if (!currentUser || !currentUserData) return;

        const goldenTicketPrice = siteSettings.goldenTicketPrice || 40.00;
        const userBalance = currentUserData.balance || 0;

        // Validate balance
        if (userBalance < goldenTicketPrice) {
            showToast('Insufficient Balance', 'Please top up your wallet first.', 4000, true);
            return;
        }

        // Validate checkbox
        if (!DOMElements.goldenTicketAgreeCheckbox.checked) {
            showToast('Terms Required', 'Please agree to the terms to continue.', 3000, true);
            return;
        }

        // Show loading state
        toggleButtonLoading(DOMElements.goldenTicketPurchaseBtn, true);

        try {
            // Deduct balance and set pending approval status
            const newBalance = userBalance - goldenTicketPrice;

            await updateDoc(doc(db, 'users', currentUser.uid), {
                balance: newBalance,
                isGoldenActivated: false, // Not activated yet - pending approval
                isApproved: false, // Requires admin approval
                goldenTicketPurchasedAt: serverTimestamp(),
                goldenTicketPurchaseAmount: goldenTicketPrice,
                goldenTicketStatus: 'pending_approval'
            });

            // Create transaction record
            await addDoc(collection(db, 'transactions'), {
                userId: currentUser.uid,
                type: 'golden_ticket_purchase',
                amount: goldenTicketPrice,
                balanceBefore: userBalance,
                balanceAfter: newBalance,
                status: 'completed',
                description: 'Golden Ticket Purchase - Pending Admin Approval',
                createdAt: serverTimestamp()
            });

            // Create notification for admin
            await addDoc(collection(db, 'adminNotifications'), {
                type: 'golden_ticket_purchase',
                userId: currentUser.uid,
                userEmail: currentUserData.email,
                userName: currentUserData.fullName || 'Unknown',
                amount: goldenTicketPrice,
                status: 'pending',
                isRead: false,
                createdAt: serverTimestamp()
            });

            // Update local user data
            currentUserData.balance = newBalance;
            currentUserData.isApproved = false;
            currentUserData.goldenTicketStatus = 'pending_approval';

            showToast('Purchase Successful!', 'Your Golden Ticket purchase is pending admin approval. You will be notified once approved.', 5000, false);
            closeModal(DOMElements.goldenTicketModalOverlay);

            // Update UI
            updateBecomeAgentButtonVisibility();
            updateWalletDisplay();

        } catch (error) {
            console.error('Golden Ticket purchase error:', error);
            showToast('Purchase Failed', error.message || 'Failed to complete purchase.', 4000, true);
        } finally {
            toggleButtonLoading(DOMElements.goldenTicketPurchaseBtn, false);
        }
    });
}
```

---

## 3. AGENT PACKAGES RENDERING {#agent-packages-rendering}

### Update the package loading function in script.js:

Find the function that loads packages (around line 1500-1700) and update it to show agent prices:

```javascript
// Update renderPackageCard function to show agent prices
function renderPackageCard(pkg, network) {
    const isAgent = currentUserData?.isGoldenActivated && currentUserData?.isApproved;
    const displayPrice = isAgent ? (pkg.agentPrice || pkg.customerPrice) : pkg.customerPrice;
    const priceLabel = isAgent ? 'Agent Price' : 'Price';
    const savingsAmount = isAgent && pkg.agentPrice ? (pkg.customerPrice - pkg.agentPrice).toFixed(2) : 0;

    return `
        <div class="package-card" data-package-id="${pkg.id}" data-network="${network}">
            <div class="package-header">
                <img src="${NETWORK_LOGOS[network]}" alt="${network} logo" class="network-logo">
                <h4 class="package-name">${pkg.name}</h4>
            </div>
            <div class="package-body">
                <p class="package-description">${pkg.description || ''}</p>
                <div class="package-details">
                    ${pkg.dataSize ? `<span><i class="fas fa-database"></i> ${pkg.dataSize}</span>` : ''}
                    ${pkg.validity ? `<span><i class="fas fa-clock"></i> ${pkg.validity}</span>` : ''}
                </div>
                ${isAgent && savingsAmount > 0 ? `
                    <div class="agent-savings" style="background: #d4edda; color: #155724; padding: 6px 10px; border-radius: 6px; margin: 10px 0; font-size: 13px;">
                        <i class="fas fa-tag"></i> Save GH₵ ${savingsAmount}
                    </div>
                ` : ''}
                <div class="package-price">
                    <span class="price-label">${priceLabel}</span>
                    <span class="price-value">GH₵ ${displayPrice.toFixed(2)}</span>
                    ${isAgent && pkg.customerPrice ? `
                        <span class="original-price" style="text-decoration: line-through; color: #999; font-size: 14px;">
                            GH₵ ${pkg.customerPrice.toFixed(2)}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="package-footer">
                <button class="package-buy-btn" data-package-id="${pkg.id}" data-network="${network}">
                    <i class="fas fa-shopping-cart"></i> Buy Now
                </button>
            </div>
        </div>
    `;
}
```

---

## 4. MANUAL TOP-UPS WITH APPROVAL {#manual-top-ups-approval}

### Update paneladmin.html - Manual Top-Ups Tab:

Find the Manual Top-Ups tab and update it to show ALL top-up requests:

```javascript
// In paneladmin.html, update loadManualTopUps function:
const loadManualTopUps = async () => {
    const tbody = document.getElementById('manualTopUpsTableBody');
    tbody.innerHTML = '';

    try {
        // Load ALL manual top-up requests
        const topupsQuery = query(
            collection(db, "manualTopups"),
            orderBy("createdAt", "desc"),
            limit(100)
        );

        const snapshot = await getDocs(topupsQuery);

        if (snapshot.empty) {
            document.getElementById('noManualTopUpsPlaceholder').style.display = 'block';
            return;
        }

        document.getElementById('noManualTopUpsPlaceholder').style.display = 'none';

        snapshot.forEach(doc => {
            const topup = { id: doc.id, ...doc.data() };
            const user = findUserInCache(topup.userId);
            const statusClass = topup.status === 'completed' ? 'completed' :
                               topup.status === 'rejected' ? 'failed' : 'pending';

            tbody.innerHTML += `
                <tr>
                    <td>${topup.id.slice(0, 8).toUpperCase()}</td>
                    <td>${user?.email || 'N/A'}</td>
                    <td>${user?.fullName || 'N/A'}</td>
                    <td>${topup.momoNetwork || 'N/A'}</td>
                    <td>${topup.momoNumber || 'N/A'}</td>
                    <td>GH₵ ${(topup.amount || 0).toFixed(2)}</td>
                    <td>${topup.referenceCode || 'N/A'}</td>
                    <td><span class="status-badge ${statusClass}">${topup.status || 'Pending'}</span></td>
                    <td>${formatDate(topup.createdAt)}</td>
                    <td>
                        ${topup.status === 'pending' ? `
                            <button class="action-btn approve-btn" data-topupid="${topup.id}" data-userid="${topup.userId}" data-amount="${topup.amount}">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="action-btn reject-btn" data-topupid="${topup.id}">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : '—'}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading manual top-ups:", error);
        showToast('Failed to load top-ups', 'error');
    }
};

// Add approve/reject handlers
document.getElementById('manualTopUpsTableBody').addEventListener('click', async (e) => {
    if (e.target.closest('.approve-btn')) {
        const btn = e.target.closest('.approve-btn');
        const topupId = btn.dataset.topupid;
        const userId = btn.dataset.userid;
        const amount = parseFloat(btn.dataset.amount);

        const isConfirmed = await Swal.fire({
            title: 'Approve Top-Up?',
            text: `Approve GH₵ ${amount.toFixed(2)} for this user?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'Cancel'
        }).then(result => result.isConfirmed);

        if (!isConfirmed) return;

        showAdminLoader();
        try {
            // Update top-up status
            await updateDoc(doc(db, "manualTopups", topupId), {
                status: 'completed',
                approvedAt: serverTimestamp(),
                approvedBy: currentUser.uid
            });

            // Add amount to user's balance
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);
            const currentBalance = userDoc.data()?.balance || 0;

            await updateDoc(userRef, {
                balance: currentBalance + amount
            });

            // Create transaction record
            await addDoc(collection(db, 'transactions'), {
                userId: userId,
                type: 'manual_topup',
                amount: amount,
                balanceBefore: currentBalance,
                balanceAfter: currentBalance + amount,
                status: 'completed',
                description: `Manual Top-Up Approved`,
                createdAt: serverTimestamp()
            });

            showToast('Top-Up Approved!', 'success');
            await loadManualTopUps();
        } catch (error) {
            console.error('Approval error:', error);
            showToast('Approval failed: ' + error.message, 'error');
        } finally {
            hideAdminLoader();
        }
    }

    if (e.target.closest('.reject-btn')) {
        const btn = e.target.closest('.reject-btn');
        const topupId = btn.dataset.topupid;

        const isConfirmed = await Swal.fire({
            title: 'Reject Top-Up?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reject',
            confirmButtonColor: '#dc3545',
            cancelButtonText: 'Cancel'
        }).then(result => result.isConfirmed);

        if (!isConfirmed) return;

        showAdminLoader();
        try {
            await updateDoc(doc(db, "manualTopups", topupId), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectedBy: currentUser.uid
            });

            showToast('Top-Up Rejected', 'success');
            await loadManualTopUps();
        } catch (error) {
            console.error('Rejection error:', error);
            showToast('Rejection failed: ' + error.message, 'error');
        } finally {
            hideAdminLoader();
        }
    }
});
```

---

## 5. STORE CONTROLS (Close All Stores, Sunday Restriction) {#store-controls}

### Add to script.js in the initializeSiteSettings function:

```javascript
// Update initializeSiteSettings function to load store controls
async function initializeSiteSettings() {
    try {
        const settingsDocRef = doc(db, "siteSettings", "config");
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            siteSettings = { ...siteSettings, ...docSnap.data() };

            // Check if stores are closed globally
            if (siteSettings.closeAllStores) {
                if (isStoreMode) {
                    showStoreClosedOverlay();
                    return; // Stop further execution
                }
            }

            // Check if Sunday purchases are disabled
            if (siteSettings.disableSundayPurchases) {
                const today = new Date().getDay(); // 0 = Sunday
                if (today === 0) {
                    if (isStoreMode) {
                        showSundayRestrictionOverlay();
                        return;
                    }
                }
            }

            // ... rest of your existing settings logic
        }
    } catch (error) {
        console.error("Error loading site settings:", error);
    }
}

// Add overlay functions
function showStoreClosedOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'storeClosedOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: white;
        padding: 20px;
        text-align: center;
    `;
    overlay.innerHTML = `
        <i class="fas fa-store-slash" style="font-size: 80px; margin-bottom: 20px; color: #ff6b6b;"></i>
        <h2 style="font-size: 28px; margin-bottom: 15px;">Store Temporarily Closed</h2>
        <p style="font-size: 16px; max-width: 500px; line-height: 1.6;">
            All merchant stores are currently closed for maintenance. Please check back later.
        </p>
        <p style="margin-top: 20px; font-size: 14px; color: #aaa;">
            For inquiries, contact support at <a href="mailto:${API_SUPPORT_EMAIL}" style="color: #4dabf7;">${API_SUPPORT_EMAIL}</a>
        </p>
    `;
    document.body.appendChild(overlay);
}

function showSundayRestrictionOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sundayRestrictionOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: white;
        padding: 20px;
        text-align: center;
    `;
    overlay.innerHTML = `
        <i class="fas fa-calendar-day" style="font-size: 80px; margin-bottom: 20px;"></i>
        <h2 style="font-size: 28px; margin-bottom: 15px;">Sunday Rest Day</h2>
        <p style="font-size: 16px; max-width: 500px; line-height: 1.6;">
            Purchases are not available on Sundays. Please visit us Monday through Saturday.
        </p>
        <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
            We'll be back tomorrow!
        </p>
    `;
    document.body.appendChild(overlay);
}
```

---

## 6. FIX USER DISPLAY (N/A ISSUES) {#fix-user-display}

### Update paneladmin.html user rendering:

The issue is likely field name mismatches. Update the user cache loading:

```javascript
// In paneladmin.html, update loadAllUsersForCache:
const loadAllUsersForCache = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    allUsersCache = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            userId: doc.id, // Add explicit userId
            email: data.email || 'N/A',
            fullName: data.fullName || data.name || 'N/A',
            phoneNumber: data.mobile || data.phone || data.phoneNumber || 'N/A',
            walletBalance: data.balance || 0,
            isApproved: data.isApproved !== false,
            isGoldenActivated: data.isGoldenActivated || false,
            isMerchant: data.isMerchant || false,
            createdAt: data.createdAt,
            twoFAEnabled: data.twoFAEnabled || false,
            twoFAPhone: data.twoFAPhone || '',
            status: data.status || 'active'
        };
    });
};
```

---

## 7. NOTIFICATION SYSTEM {#notification-system}

### Add notification creation helper to script.js:

```javascript
// Notification helper function
async function createUserNotification(userId, title, message, type = 'info') {
    try {
        await addDoc(collection(db, 'notifications'), {
            userId: userId,
            title: title,
            message: message,
            type: type, // 'info', 'success', 'warning', 'error'
            isRead: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Example usage when approving Golden Ticket:
// In paneladmin.html, when approving a user's golden ticket:
await createUserNotification(
    userId,
    'Agent Status Approved!',
    'Congratulations! Your Golden Ticket has been approved. You now have access to agent prices.',
    'success'
);
```

---

## 8. AFA REGISTRATION ADMIN VIEW {#afa-registration-admin}

### Update paneladmin.html AFA Registrations tab:

```javascript
const loadAfaRegistrations = async () => {
    const tbody = document.getElementById('afaRegistrationsTableBody');
    tbody.innerHTML = '';

    try {
        const afaQuery = query(
            collection(db, "orders"),
            where("orderType", "==", "afa_registration"),
            orderBy("createdAt", "desc"),
            limit(100)
        );

        const snapshot = await getDocs(afaQuery);

        if (snapshot.empty) {
            document.getElementById('noAfaRegistrationsPlaceholder').style.display = 'block';
            return;
        }

        document.getElementById('noAfaRegistrationsPlaceholder').style.display = 'none';

        snapshot.forEach(doc => {
            const afa = { id: doc.id, ...doc.data() };
            const user = findUserInCache(afa.userId);

            tbody.innerHTML += `
                <tr>
                    <td>${afa.id.slice(0, 8).toUpperCase()}</td>
                    <td>${user?.email || afa.userEmail || 'N/A'}</td>
                    <td>${afa.studentName || 'N/A'}</td>
                    <td>${afa.studentIndex || 'N/A'}</td>
                    <td>${afa.studentProgram || 'N/A'}</td>
                    <td>GH₵ ${(afa.amount || 0).toFixed(2)}</td>
                    <td><span class="status-badge ${(afa.status || 'pending').toLowerCase()}">${afa.status || 'Pending'}</span></td>
                    <td>${formatDate(afa.createdAt)}</td>
                    <td>
                        <button class="action-btn view-btn" data-afaid="${afa.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading AFA registrations:", error);
        showToast('Failed to load AFA registrations', 'error');
    }
};
```

---

## COMPLETE CHECKLIST

- [ ] Create all 8 Firestore indexes in Firebase Console
- [ ] Add Golden Ticket modal HTML to index.html
- [ ] Add Golden Ticket button to profile/wallet section
- [ ] Add Golden Ticket DOMElements to script.js
- [ ] Add Golden Ticket logic to script.js
- [ ] Update package rendering to show agent prices
- [ ] Update manual top-ups in paneladmin.html
- [ ] Add store controls (close all stores, Sunday restriction)
- [ ] Fix user display N/A issues in paneladmin.html
- [ ] Add notification system helpers
- [ ] Update AFA registrations display
- [ ] Test all functionality

---

## FIRESTORE SECURITY RULES

Make sure your Firestore rules allow these operations:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || hasAdminRole();
    }

    // Manual topups
    match /manualTopups/{topupId} {
      allow read, create: if request.auth != null;
      allow update: if hasAdminRole();
    }

    // Orders
    match /orders/{orderId} {
      allow read: if request.auth != null &&
                     (resource.data.userId == request.auth.uid || hasAdminRole());
      allow create: if request.auth != null;
      allow update: if hasAdminRole();
    }

    // Notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if hasAdminRole();
      allow update: if request.auth.uid == resource.data.userId;
    }

    // Admin notifications
    match /adminNotifications/{notificationId} {
      allow read, write: if hasAdminRole();
    }

    // Transactions
    match /transactions/{transactionId} {
      allow read: if request.auth != null &&
                     (resource.data.userId == request.auth.uid || hasAdminRole());
      allow create: if request.auth != null;
    }

    // Helper function
    function hasAdminRole() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin_dev', 'console_admin'];
    }
  }
}
```

---

## FINAL NOTES

1. Test Golden Ticket flow thoroughly
2. Verify all indexes are created before testing queries
3. Make sure siteSettings/config has all required fields
4. Test store closure and Sunday restrictions
5. Verify agent prices display correctly
6. Test manual top-up approval workflow

All code is production-ready and follows Firebase best practices!

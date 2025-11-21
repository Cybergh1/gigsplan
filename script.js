 
// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    updatePassword as firebaseUpdatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore, doc, setDoc, getDoc, updateDoc, addDoc,
    collection, query, where, orderBy, limit, getDocs,
    Timestamp, serverTimestamp, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";


// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyD_YTYess5I3Uuf7X9g-3qlfVHR4FY1NSQ",
    authDomain: "quickxpress-55347.firebaseapp.com",
    projectId: "quickxpress-55347",
    storageBucket: "quickxpress-55347.firebasestorage.app",
    messagingSenderId: "645813936880",
    appId: "1:645813936880:web:43ee96c1fa548631751835"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // eslint-disable-line no-unused-vars
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // eslint-disable-line no-unused-vars

// ============================================
// FEATURE FLAGS - Set to true/false to enable/disable
// ============================================
const STORE_CREATION_ENABLED = false;  // Set to false to DISABLE store creation, true to ENABLE
// ============================================

// Check for merchant parameter and load store if present
const urlParams = new URLSearchParams(window.location.search);
const merchantSlug = urlParams.get('merchant');
let isStoreMode = false;
let storeData = {
    merchantId: null,
    storeConfig: null,
    storeSlug: null
};

if (merchantSlug) {
    isStoreMode = true;
    storeData.storeSlug = merchantSlug.trim().toLowerCase();
    console.log('✅ Store mode detected for merchant:', storeData.storeSlug);
    // Load store after DOM is ready
    window.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 DOM loaded, loading merchant store...');
        loadMerchantStore();
    });
} else {
    console.log('📱 Dashboard mode - No merchant parameter found');
}

const MIN_TOPUP_AMOUNT = 30.00;
const MOMO_ACCOUNT_NAME_PREFILL = "Doreen Worlayon";
const MOMO_ACCOUNT_NUMBER_PREFILL = "0552202292";
const API_BASE_URL = "https://gigsplan.org/api/";
const API_SUPPORT_EMAIL = "hca.edu.gh@gmail.com";
// Vercel serverless API endpoint - Your deployed backend
const VERCEL_API_URL = 'https://api-snowy-eight.vercel.app/api'; // Ensure this is used for all Vercel backend API calls
const API_SUPPORT_WHATSAPP = "233552202292";

const NETWORK_LOGOS = {
    mtn: "https://dev-dataverse-global.pantheonsite.io/wp-content/uploads/2025/05/Screenshot_20250410-183125.png",
    telecel: "https://dev-dataverse-global.pantheonsite.io/wp-content/uploads/2025/05/Screenshot_20250410-183207.png",
    at: "https://dev-dataverse-global.pantheonsite.io/wp-content/uploads/2025/05/Screenshot_20250410-183259-1.png",
    afa_mins: "https://dev-dataverse-global.pantheonsite.io/wp-content/uploads/2025/06/Screenshot_20250608-104108.png"
};

let currentUser = null;
let currentUserData = null;
let ordersSnapshotUnsubscribe = null;
let topupsSnapshotUnsubscribe = null;
let userDataSnapshotUnsubscribe = null;
let currentTopUpAmountForMomo = 0;
let autoProcessingEnabled = false; // Fetched from Vercel API
let siteSettings = {
    maintenanceModeEnabled: false,
    registrationDisabled: false,
    afaFee: 5.00,
    siteNotificationMessage: "",
    siteNotificationActive: false,
    siteNotificationTitle: "IMPORTANT ANNOUNCEMENT",
    siteNotificationAttribution: "by Coach Emma",
    paystackPublicKey: "",
    paystackSecretKey: "",
    bulkSmsApiKey: "",
    bulkSmsSenderId: "",
    closeAllStores: false,
    disableSundayPurchases: false,
    goldenTicketPrice: 50.00
};
let networkPackages = { mtn: [], telecel: [], at: [], afa: [], afa_mins: [] };
let cartItems = [];
let notifications = [];
let toastTimeout;
let pageLoadTimeout;
let resultsCheckerItemsStore = {
    'BECE': [],
    'WAEC': []
};
// State for the new purchase confirmation modal
let confirmPurchaseState = {
    package: null, // This will hold the details of the package being confirmed
};


const DOMElements = {
    pageLoaderProgress: document.getElementById('page-loader-progress'),
    loadingSpinnerOverlay: document.getElementById('loadingSpinnerOverlay'),
    spinnerOriginal: document.querySelector('.spinner-original'),
    loaderL16: document.querySelector('.loader-l16'),
    loaderL4: document.querySelector('.loader-l4'),
    dashboardAppContainer: document.getElementById('dashboardAppContainer'),
    mainDashboardPageContent: document.getElementById('mainDashboardPageContent'),
    profileSettingsPageContent: document.getElementById('profileSettingsPageContent'),
    afaRegistrationPageContent: document.getElementById('afaRegistrationPageContent'),
    historyPageContent: document.getElementById('historyPageContent'),
    walletPageContent: document.getElementById('walletPageContent'),
    resultsCheckerPageContent: document.getElementById('resultsCheckerPageContent'),
    resultsCheckerTypeSelect: document.getElementById('resultsCheckerTypeSelect'),
    resultsCheckerPriceInfo: document.getElementById('resultsCheckerPriceInfo'),
    resultsCheckerPriceDisplay: document.getElementById('resultsCheckerPriceDisplay'),
    purchaseCheckerSerialBtn: document.getElementById('purchaseCheckerSerialBtn'),
    toast: document.getElementById('toastNotification'),
    toastTitle: document.getElementById('toastTitle'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastNotification').querySelector('i'),
    toastProgressBar: document.getElementById('toastProgressBar'),
    topUpModalOverlay: document.getElementById('topUpModalOverlay'),
    modalCurrentBalance: document.getElementById('modalCurrentBalance'),
    topUpAmountInput: document.getElementById('topUpAmount'),
    topUpModalProceedBtn: document.getElementById('topUpModalProceedBtn'),
    topUpMethodButtons: document.querySelectorAll('.topup-method-btn'),
    paystackInfoText: document.getElementById('paystackInfo'),
    momoPaymentDetailsModalOverlay: document.getElementById('momoPaymentDetailsModalOverlay'),
    momoPaymentModalHeader: document.getElementById('momoPaymentDetailsModalOverlay').querySelector('.modal-header'),
    momoPaymentModalHeaderTitle: document.getElementById('momoPaymentModalHeaderTitle'),
    momoPaymentModalCloseBtn: document.getElementById('momoPaymentDetailsModalOverlay').querySelector('.modal-close-btn'),
    momoAccountNameDisplay: document.getElementById('momoAccountName'),
    momoAccountNumberDisplay: document.getElementById('momoAccountNumber'),
    momoReferenceCodeDisplay: document.getElementById('momoReferenceCode'),
    momoTopupAmountDisplay: document.getElementById('momoTopupAmount'),
    momoCompletePaymentBtn: document.getElementById('momoCompletePaymentBtn'),
    afaEntryModalOverlay: document.getElementById('afaEntryModalOverlay'),
    showAfaEntryModalBtn: document.getElementById('showAfaEntryModalBtn'),
    afaEntryForm: document.getElementById('afaEntryForm'),
    afaSubmitBtn: document.getElementById('afaSubmitBtn'),
    afaFeeDisplay: document.getElementById('afaFeeDisplay'),
    afaNoOrdersView: document.getElementById('afaNoOrdersView'),
    afaHistoryTableContainer: document.getElementById('afaHistoryTableContainer'),
    afaHistoryTableBody: document.getElementById('afaHistoryTableBody'),
    changePasswordModalOverlay: document.getElementById('changePasswordModalOverlay'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    currentPasswordInput: document.getElementById('currentPassword'),
    newPasswordInput: document.getElementById('newPassword'),
    confirmNewPasswordInput: document.getElementById('confirmNewPassword'),
    saveNewPasswordBtn: document.getElementById('saveNewPasswordBtn'),
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    sidebarNavItems: document.querySelectorAll('.sidebar-nav li'),
    sidebarLinks: document.querySelectorAll('.sidebar-nav > ul > li > a'),
    walletMenuLi: document.getElementById('walletMenuLi'),
    walletMenuLink: document.getElementById('walletMenuLink'),
    walletSubmenuTopup: document.getElementById('walletSubmenuTopup'),
    walletSubmenuTransactions: document.getElementById('walletSubmenuTransactions'),
    headerAppTitle: document.getElementById('headerAppTitle'),
    userProfileAvatarLink: document.getElementById('userProfileAvatarLink'),
    headerProfileAvatarImg: document.getElementById('headerProfileAvatarImg'),
    notificationBellBtn: document.getElementById('notificationBellBtn'),
    notificationBadge: document.getElementById('notificationBadge'),
    notificationCenterModalOverlay: document.getElementById('notificationCenterModalOverlay'),
    notificationCenterNewCount: document.getElementById('notificationCenterNewCount'),
    notificationCenterBody: document.getElementById('notificationCenterBody'),
    notificationCenterMarkAllReadBtn: document.getElementById('notificationCenterMarkAllReadBtn'),
    skeletonLoader: document.getElementById('skeletonLoader'),
    actualDashboardContent: document.getElementById('actualDashboardContent'),
    dashboardWalletBalanceDisplay: document.getElementById('dashboardWalletBalanceDisplay'),
    userRoleDisplaySidebar: document.getElementById('userRoleDisplay'),
    dashboardTopUpBtn: document.getElementById('dashboardTopUpBtn'),
    profileViewMode: document.getElementById('profileViewMode'),
    profileEditMode: document.getElementById('profileEditMode'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    saveProfileChangesBtn: document.getElementById('saveProfileChangesBtn'),
    cancelProfileEditBtn: document.getElementById('cancelProfileEditBtn'),
    changePasswordBtn: document.getElementById('changePasswordBtn'),
    profileFullNameDisplay: document.getElementById('profileFullNameDisplayValue'),
    profileEmailDisplay: document.getElementById('profileEmailDisplayValue'),
    profilePhoneNumberDisplay: document.getElementById('profilePhoneNumberDisplayValue'),
    profileRoleDisplay: document.getElementById('profileRoleDisplayValue'),
    profileEditFullName: document.getElementById('profileEditFullName'),
    profileEditEmail: document.getElementById('profileEditEmail'),
    profileEditPhoneNumber: document.getElementById('profileEditPhoneNumber'),
    profileLogoutBtn: document.getElementById('profileLogoutBtn'),
    profileStatusBadge: document.getElementById('profileStatusBadge'),
    walletPendingTopupsCountEl: document.getElementById('walletPendingTopupsCount'),
    walletPendingTopupsAmountEl: document.getElementById('walletPendingTopupsAmount'),
    walletCompletedTopupsCountEl: document.getElementById('walletCompletedTopupsCount'),
    walletCompletedTopupsAmountEl: document.getElementById('walletCompletedTopupsAmount'),
    walletTopupHistoryListEl: document.getElementById('walletTopupHistoryList'),
    noWalletTopupHistoryView: document.getElementById('noWalletTopupHistoryView'),
    walletTopupHistoryFilter: document.getElementById('walletTopupHistoryFilter'),
    historyTotalOrdersCountEl: document.getElementById('historyTotalOrdersCount'),
    historyTotalOrdersAmountEl: document.getElementById('historyTotalOrdersAmount'),
    historyCompletedOrdersCountEl: document.getElementById('historyCompletedOrdersCount'),
    historyCompletedOrdersAmountEl: document.getElementById('historyCompletedOrdersAmount'),
    historyOrdersListView: document.getElementById('historyOrdersListView'),
    historyNoOrdersView: document.getElementById('historyNoOrdersView'),
    orderHistoryTableBody: document.getElementById('orderHistoryTableBody'),
    cartFab: document.getElementById('cartFab'),
    cartSidebar: document.getElementById('cartSidebar'),
    cartCloseBtn: document.getElementById('cartCloseBtn'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartEmptyMessage: document.getElementById('cartEmptyMessage'),
    cartFooter: document.getElementById('cartFooter'),
    cartTotalAmountEl: document.getElementById('cartTotalAmount'),
    cartCheckoutBtn: document.getElementById('cartCheckoutBtn'),
    cartFabBadge: document.getElementById('cartFabBadge'),
    currentYear: document.getElementById('currentYear'),
    maintenanceOverlay: document.getElementById('maintenanceOverlay'),
    siteNotificationBanner: document.getElementById('siteNotificationBanner'),
    siteNotificationTitleEl: document.getElementById('siteNotificationTitle'),
    siteNotificationMessageEl: document.getElementById('siteNotificationMessage'),
    siteNotificationAttributionEl: document.getElementById('siteNotificationAttribution'),
    closeSiteNotification: document.getElementById('closeSiteNotification'),
    orderSuccessModalOverlay: document.getElementById('orderSuccessModalOverlay'),
    orderSuccessTitleEl: document.getElementById('orderSuccessTitle'),
    orderSuccessMessageEl: document.getElementById('orderSuccessMessage'),
    orderSuccessModalCloseBtn: document.getElementById('orderSuccessModalCloseBtn'),
    generalOrderSuccessIconContainer: document.getElementById('generalOrderSuccessIconContainer'),
    messageSendingSuccessIconContainer: document.getElementById('messageSendingSuccessIconContainer'),
    howDataBundlesWorkModalOverlay: document.getElementById('howDataBundlesWorkModalOverlay'),
    dashboardImportExcelBtn: document.getElementById('dashboardImportExcelBtn'),
    dashboardInputOrdersBtn: document.getElementById('dashboardInputOrdersBtn'),
    textImportModalOverlay: document.getElementById('textImportModalOverlay'),
    textImportNetworkSelect: document.getElementById('textImportNetworkSelect'),
    textImportDataOrders: document.getElementById('textImportDataOrders'),
    submitTextOrdersBtn: document.getElementById('submitTextOrdersBtn'),
    excelImportModalOverlay: document.getElementById('excelImportModalOverlay'),
    excelImportModalTitle: document.getElementById('excelImportModalTitle'),
    excelFileInput: document.getElementById('excelFileInput'),
    selectExcelFileBtn: document.getElementById('selectExcelFileBtn'),
    excelFileName: document.getElementById('excelFileName'),
    uploadExcelOrdersBtn: document.getElementById('uploadExcelOrdersBtn'),
    apiManagementPageContent: document.getElementById('apiManagementPageContent'),
    apiBackToDashboardBtn: document.getElementById('apiBackToDashboardBtn'),
    apiAccessDisabledBlock: document.getElementById('apiAccessDisabledBlock'),
    contactSupportApiBtn: document.getElementById('contactSupportApiBtn'),
    apiReadyBlock: document.getElementById('apiReadyBlock'),
    apiKeySection: document.getElementById('apiKeySection'),
    apiKeyNotGenerated: document.getElementById('apiKeyNotGenerated'),
    generateApiKeyBtn: document.getElementById('generateApiKeyBtn'),
    apiKeyDisabledMessage: document.getElementById('apiKeyDisabledMessage'),
    apiKeyGenerated: document.getElementById('apiKeyGenerated'),
    userApiKeyDisplay: document.getElementById('userApiKeyDisplay'),
    apiViewToggleBtn: document.getElementById('apiViewToggleBtn'),
    copyUserApiKeyBtn: document.getElementById('copyUserApiKeyBtn'),
    apiKeyGeneratedDate: document.getElementById('apiKeyGeneratedDate'),
    regenerateApiKeyBtn: document.getElementById('regenerateApiKeyBtn'),
    usageStatsSection: document.getElementById('usageStatsSection'),
    statTotalRequests: document.getElementById('statTotalRequests'),
    statTodayRequests: document.getElementById('statTodayRequests'),
    statThisHourRequests: document.getElementById('statThisHourRequests'),
    documentationSection: document.getElementById('documentationSection'),
    apiBaseUrl: document.getElementById('apiBaseUrl'),
    packagesPageContent: document.getElementById('packagesPageContent'),
    packageCategoryTabs: document.getElementById('packagesPageContent')?.querySelector('.package-category-tabs'),
    packageOffersGrid: document.getElementById('packageOffersGrid'),
    noPackagesView: document.getElementById('noPackagesView'),
    // NEW: Confirm Purchase Modal Elements
    confirmPurchaseModalOverlay: document.getElementById('confirmPurchaseModalOverlay'),
    confirmPurchaseBalance: document.getElementById('confirmPurchaseBalance'),
    confirmPurchasePackageName: document.getElementById('confirmPurchasePackageName'),
    confirmPurchaseTotalCost: document.getElementById('confirmPurchaseTotalCost'),
    confirmPurchaseRecipientNumber: document.getElementById('confirmPurchaseRecipientNumber'),
    confirmPurchaseAddToCartBtn: document.getElementById('confirmPurchaseAddToCartBtn'),
    confirmPurchaseBuyNowBtn: document.getElementById('confirmPurchaseBuyNowBtn'),
    confirmPurchaseBalanceWarning: document.getElementById('confirmPurchaseBalanceWarning'),
    // NEW: Become an Agent Button
    becomeAgentBtn: document.getElementById('becomeAgentBtn'),
    // NEW: Become an Agent Modal Elements (You'll need to define this modal in your index.html)
    becomeAgentModalOverlay: document.getElementById('becomeAgentModalOverlay'), // Assuming this will exist
    // NEW: Store Page Elements (from index.html)
    storeSetupPageContent: document.getElementById('storeSetupPageContent'),
    storeOrdersPageContent: document.getElementById('storeOrdersPageContent'),
    storeCustomersPageContent: document.getElementById('storeCustomersPageContent'),
    addProductPageContent: document.getElementById('addProductPageContent'),
    viewProductsPageContent: document.getElementById('viewProductsPageContent'),
    payoutPageContent: document.getElementById('payoutPageContent'),
    storeOrdersTotal: document.getElementById('storeOrdersTotal'),
    storeOrdersPending: document.getElementById('storeOrdersPending'),
    storeOrdersCompleted: document.getElementById('storeOrdersCompleted'),
    storeOrdersRevenue: document.getElementById('storeOrdersRevenue'),
    storeOrdersTableBody: document.getElementById('storeOrdersTableBody'),
    storeCustomersTotal: document.getElementById('storeCustomersTotal'),
    storeCustomersActive: document.getElementById('storeCustomersActive'),
    storeCustomersAvgOrder: document.getElementById('storeCustomersAvgOrder'),
    storeCustomersTableBody: document.getElementById('storeCustomersTableBody'),
    addProductNetworkTabs: document.getElementById('addProductPageContent')?.querySelector('.product-network-tabs'),
    availablePackagesTableBody: document.getElementById('availablePackagesTableBody'),
    viewProductsHeader: document.getElementById('viewProductsPageContent')?.querySelector('.view-products-header'),
    addMoreProductsBtn: document.getElementById('addMoreProductsBtn'),
    viewProductsTableBody: document.getElementById('viewProductsTableBody'),
    startAddingBtn: document.getElementById('startAddingBtn'),
    payoutAvailableBalance: document.getElementById('payoutAvailableBalance'),
    payoutTotalRevenue: document.getElementById('payoutTotalRevenue'),
    payoutTotalWithdrawn: document.getElementById('payoutTotalWithdrawn'),
    payoutPending: document.getElementById('payoutPending'),
    withdrawAmount: document.getElementById('withdrawAmount'),
    requestWithdrawBtn: document.getElementById('requestWithdrawBtn'),
    balanceWarning: document.getElementById('balanceWarning'),
    withdrawalHistoryTableBody: document.getElementById('withdrawalHistoryTableBody'),
    // Store Setup Page Form Elements
    storeInfoForm: document.getElementById('storeInfoForm'),
    storeName: document.getElementById('storeName'),
    storeSlug: document.getElementById('storeSlug'),
    storeUrlPreview: document.getElementById('storeUrlPreview'),
    brandLogoFile: document.getElementById('brandLogoFile'),
    logoPreview: document.getElementById('logoPreview'),
    logoPreviewImg: document.getElementById('logoPreviewImg'),
    contactEmail: document.getElementById('contactEmail'),
    contactPhone: document.getElementById('contactPhone'),
    storeSlogan: document.getElementById('storeSlogan'),
    step1Next: document.getElementById('step1Next'),
    setupStep1: document.getElementById('setupStep1'),
    setupStep2: document.getElementById('setupStep2'),
    primaryColor: document.getElementById('primaryColor'),
    primaryColorHex: document.getElementById('primaryColorHex'),
    secondaryColor: document.getElementById('secondaryColor'),
    secondaryColorHex: document.getElementById('secondaryColorHex'),
    // Network logo uploads
    mtnLogoFile: document.getElementById('mtnLogoFile'),
    mtnLogoPreview: document.getElementById('mtnLogoPreview'),
    mtnLogoPreviewImg: document.getElementById('mtnLogoPreviewImg'),
    telecelLogoFile: document.getElementById('telecelLogoFile'),
    telecelLogoPreview: document.getElementById('telecelLogoPreview'),
    telecelLogoPreviewImg: document.getElementById('telecelLogoPreviewImg'),
    airtelTigoLogoFile: document.getElementById('airtelTigoLogoFile'),
    airtelTigoLogoPreview: document.getElementById('airtelTigoLogoPreview'),
    airtelTigoLogoPreviewImg: document.getElementById('airtelTigoLogoPreviewImg'),
    step2Back: document.getElementById('step2Back'),
    step2Next: document.getElementById('step2Next'),
    setupStep3: document.getElementById('setupStep3'),
    openingTime: document.getElementById('openingTime'),
    closingTime: document.getElementById('closingTime'),
    workingDaysSelector: document.querySelector('.working-days-selector'),
    step3Back: document.getElementById('step3Back'),
    saveStoreSetup: document.getElementById('saveStoreSetup'),
    storeLinkDisplay: document.getElementById('storeLinkDisplay'),
    generatedStoreLink: document.getElementById('generatedStoreLink'),
    copyStoreLinkBtn: document.getElementById('copyStoreLinkBtn'),
    visitStoreBtn: document.getElementById('visitStoreBtn'),
    editSetupBtn: document.getElementById('editSetupBtn'),
    // 🔐 2FA Elements
    twoFAToggle: document.getElementById('twoFAToggle'),
    twoFAStatusText: document.getElementById('twoFAStatusText'),
    twoFAPhoneDisplay: document.getElementById('twoFAPhoneDisplay'),
    twoFAPhoneNumber: document.getElementById('twoFAPhoneNumber'),
    twoFAPhoneModalOverlay: document.getElementById('twoFAPhoneModalOverlay'),
    twoFAPhoneInput: document.getElementById('twoFAPhoneInput'),
    sendTwoFACodeBtn: document.getElementById('sendTwoFACodeBtn'),
    twoFAVerifyModalOverlay: document.getElementById('twoFAVerifyModalOverlay'),
    twoFAVerifyPhoneDisplay: document.getElementById('twoFAVerifyPhoneDisplay'),
    twoFAVerifyCodeInput: document.getElementById('twoFAVerifyCodeInput'),
    verifyTwoFACodeBtn: document.getElementById('verifyTwoFACodeBtn'),
    resendTwoFACodeBtn: document.getElementById('resendTwoFACodeBtn'),
    // 🎫 Golden Ticket / Become Agent Elements
    goldenTicketModalOverlay: document.getElementById('goldenTicketModalOverlay'),
    goldenTicketPriceDisplay: document.getElementById('goldenTicketPriceDisplay'),
    goldenTicketModalBalance: document.getElementById('goldenTicketModalBalance'),
    goldenTicketBalanceWarning: document.getElementById('goldenTicketBalanceWarning'),
    goldenTicketAgreeCheckbox: document.getElementById('goldenTicketAgreeCheckbox'),
    goldenTicketPurchaseBtn: document.getElementById('goldenTicketPurchaseBtn'),
};

const availableLoaders = [DOMElements.loaderL16, DOMElements.loaderL4, DOMElements.spinnerOriginal];

function formatCurrencyGHS(amount) {
    return `GHS ${(parseFloat(amount) || 0).toFixed(2)}`;
}

// Phone number normalization: Convert 233XXXXXXXXX to 0XXXXXXXXX for display
function normalizePhoneForDisplay(phone) {
    if (!phone || phone === 'N/A') return phone;
    const phoneStr = String(phone).trim();
    // If it starts with 233 and is 12 digits, convert to 0XXXXXXXXX
    if (phoneStr.startsWith('233') && phoneStr.length === 12) {
        return '0' + phoneStr.substring(3);
    }
    return phoneStr;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function startLoadingAnimation() {
    if (!DOMElements.pageLoaderProgress) return;
    clearTimeout(pageLoadTimeout);
    DOMElements.pageLoaderProgress.classList.remove('done');
    DOMElements.pageLoaderProgress.style.width = '0%';
    requestAnimationFrame(() => {
        DOMElements.pageLoaderProgress.style.opacity = '1';
        DOMElements.pageLoaderProgress.style.width = (Math.random() * 20 + 30) + '%';
    });
}

function finishLoadingAnimation() {
    if (!DOMElements.pageLoaderProgress) return;
    DOMElements.pageLoaderProgress.style.width = '100%';
    pageLoadTimeout = setTimeout(() => {
        DOMElements.pageLoaderProgress.classList.add('done');
         pageLoadTimeout = setTimeout(() => {
            if (DOMElements.pageLoaderProgress) {
                DOMElements.pageLoaderProgress.style.width = '0%';
                DOMElements.pageLoaderProgress.style.opacity = '0';
            }
        }, 500);
    }, 250);
}

function showSpinner(show = true) {
    if (DOMElements.loadingSpinnerOverlay) {
        if (show) {
            availableLoaders.forEach(loader => { if(loader) loader.style.display = 'none'; });
            const randomIndex = Math.floor(Math.random() * availableLoaders.length);
            const selectedLoader = availableLoaders[randomIndex];
            if (selectedLoader) {
                selectedLoader.style.display = selectedLoader.classList.contains('loader-l16') ? 'grid' : 'block';
            } else if (DOMElements.spinnerOriginal) {
                DOMElements.spinnerOriginal.style.display = 'block';
            }
            DOMElements.loadingSpinnerOverlay.classList.add('show');
        } else {
            DOMElements.loadingSpinnerOverlay.classList.remove('show');
            availableLoaders.forEach(loader => { if(loader) loader.style.display = 'none'; });
        }
    }
}
function openModal(modalOverlayElement) {
    if (modalOverlayElement) {
        modalOverlayElement.classList.add('show');
        document.body.classList.add('modal-open');
    }
}
function closeModal(modalOverlayElement) {
    if (modalOverlayElement) {
        modalOverlayElement.classList.remove('show');
        const stillOpenModals = document.querySelectorAll('.modal-overlay.show');
        if (stillOpenModals.length === 0) {
            document.body.classList.remove('modal-open');
        }
    }
}
// Small helper to show loading state on buttons. Defined here to ensure availability across pages.
function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    try {
        if (isLoading) {
            button.setAttribute('disabled', 'disabled');
            button.dataset.originalHtml = button.innerHTML;
            button.innerHTML = '<span class="spinner-original" style="display:inline-block; width:16px; height:16px; border:2px solid rgba(0,0,0,0.1); border-left-color:var(--spinner-color); border-radius:50%; animation:spin 0.8s linear infinite; vertical-align:middle; margin-right:8px;"></span>' + (button.dataset.loadingText || 'Working...');
        } else {
            button.removeAttribute('disabled');
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
                delete button.dataset.originalHtml;
            }
        }
    } catch (err) {
        console.error('toggleButtonLoading error', err);
    }
}
function applyItemFadeUpAnimation(parentElement, delayStart = 0.1, delayIncrement = 0.05) {
    if (!parentElement) return;
    const animatedItems = parentElement.querySelectorAll('.animated-item');
    animatedItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(15px)';
        requestAnimationFrame(() => {
             item.style.animation = `itemFadeUp 0.4s ease-out forwards ${index * delayIncrement + delayStart}s`;
        });
    });
}

function showToast(title, message, duration = 3000, isError = false, isWarning = false, customIconClass = null) {
    if (!DOMElements.toast || !DOMElements.toastTitle || !DOMElements.toastMessage || !DOMElements.toastIcon || !DOMElements.toastProgressBar) { console.error("Toast elements not found!"); return; }
    DOMElements.toastTitle.textContent = title;
    DOMElements.toastMessage.innerHTML = message;
    DOMElements.toast.className = 'toast';

    if (customIconClass) {
        DOMElements.toastIcon.className = `${customIconClass}`;
        if (customIconClass.includes('fa-paper-plane')) {
             DOMElements.toast.classList.add('info');
        }
    } else if (isError) {
        DOMElements.toast.classList.add('error');
        DOMElements.toastIcon.className = 'fas fa-times-circle';
    } else if (isWarning) {
        DOMElements.toast.classList.add('warning');
        DOMElements.toastIcon.className = 'fas fa-exclamation-triangle';
    } else {

    DOMElements.toast.classList.add('success');
        DOMElements.toastIcon.className = 'fas fa-check-circle';
    }

    DOMElements.toast.classList.add('show');
    DOMElements.toastProgressBar.style.transition = 'none';
    DOMElements.toastProgressBar.style.width = '100%';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            DOMElements.toastProgressBar.style.transition = `width ${duration}ms linear`;
            DOMElements.toastProgressBar.style.width = '0%';
         });
     });
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        DOMElements.toast.classList.remove('show');
    }, duration);
}

function generateReferenceCode(length = 5) {
    let result = '';
    const characters = '0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
function generateNumericOrderId(length = 5) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result; // Return 5-digit number only
}

 function generateUserReferralCode(uid) {
    const uidPart = uid.substring(uid.length - 6).toUpperCase();
    let randomPart = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 4; i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `D4L${uidPart}${randomPart}`;
}

function generateRandomApiKey(length = 32) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// =========================================================================
// 🔒 SECURITY MODULE - Input Validation & Sanitization
// =========================================================================

const SecurityManager = {
    // Rate limiting storage
    rateLimits: new Map(),

    // Input validation patterns
    patterns: {
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        phone: /^0[0-9]{9}$/,
        ghanaPhone: /^(0[2-5][0-9]|059)\d{7}$/,
        amount: /^\d+(\.\d{1,2})?$/,
        alphanumeric: /^[a-zA-Z0-9]+$/,
        slug: /^[a-z0-9-]+$/,
        name: /^[a-zA-Z\s'-]{2,50}$/,
        numeric: /^\d+$/,
    },

    // XSS Prevention - Sanitize HTML
    sanitizeHTML(input) {
        if (!input) return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    // Validate and sanitize email
    validateEmail(email) {
        if (!email || typeof email !== 'string') return null;
        const sanitized = email.trim().toLowerCase();
        return this.patterns.email.test(sanitized) ? sanitized : null;
    },

    // Validate and sanitize phone number
    validatePhone(phone) {
        if (!phone || typeof phone !== 'string') return null;
        const sanitized = phone.trim().replace(/\s+/g, '');
        return this.patterns.ghanaPhone.test(sanitized) ? sanitized : null;
    },

    // Validate amount
    validateAmount(amount) {
        const num = parseFloat(amount);
        if (isNaN(num) || num <= 0 || num > 10000) return null;
        return parseFloat(num.toFixed(2));
    },

    // Validate store slug
    validateSlug(slug) {
        if (!slug || typeof slug !== 'string') return null;
        const sanitized = slug.trim().toLowerCase().replace(/\s+/g, '-');
        return this.patterns.slug.test(sanitized) && sanitized.length >= 3 && sanitized.length <= 50 ? sanitized : null;
    },

    // Validate name
    validateName(name) {
        if (!name || typeof name !== 'string') return null;
        const sanitized = name.trim();
        return this.patterns.name.test(sanitized) ? sanitized : null;
    },

    // Rate limiting - Check if action is allowed
    checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now();
        const record = this.rateLimits.get(key) || { count: 0, resetTime: now + windowMs };

        // Reset if window expired
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + windowMs;
        }

        // Increment counter
        record.count++;
        this.rateLimits.set(key, record);

        // Check if limit exceeded
        if (record.count > maxAttempts) {
            const remainingTime = Math.ceil((record.resetTime - now) / 1000);
            return {
                allowed: false,
                remainingTime,
                message: `Too many attempts. Please wait ${remainingTime} seconds.`
            };
        }

        return { allowed: true, attemptsLeft: maxAttempts - record.count };
    },

    // Clean rate limit records (call periodically)
    cleanupRateLimits() {
        const now = Date.now();
        for (const [key, record] of this.rateLimits.entries()) {
            if (now > record.resetTime) {
                this.rateLimits.delete(key);
            }
        }
    },

    // Validate Firebase UID
    validateUID(uid) {
        if (!uid || typeof uid !== 'string') return false;
        return uid.length >= 10 && uid.length <= 128;
    },

    // Generate secure CSRF token
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // Validate file upload
    validateFile(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], maxSize = 2 * 1024 * 1024) {
        if (!file) return { valid: false, error: 'No file provided' };

        // Check file type
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Invalid file type. Only images are allowed.' };
        }

        // Check file size
        if (file.size > maxSize) {
            return { valid: false, error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.` };
        }

        return { valid: true };
    },

    // Prevent SQL injection (for any external API calls)
    escapeSQLString(str) {
        if (!str) return '';
        return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
    },

    // Validate order data
    validateOrderData(orderData) {
        const errors = [];

        if (!this.validatePhone(orderData.beneficiaryNumber)) {
            errors.push('Invalid beneficiary phone number');
        }

        if (!orderData.network || !['mtn', 'telecel', 'at'].includes(orderData.network.toLowerCase())) {
            errors.push('Invalid network');
        }

        const amount = this.validateAmount(orderData.amount);
        if (!amount) {
            errors.push('Invalid amount');
        }

        return { valid: errors.length === 0, errors, sanitized: { ...orderData, amount } };
    },

    // Log security events
    logSecurityEvent(event, details) {
        console.warn('🔒 Security Event:', event, details);
        // In production, send to security monitoring service
    }
};

// Cleanup rate limits every 5 minutes
setInterval(() => SecurityManager.cleanupRateLimits(), 5 * 60 * 1000);

// =========================================================================
// 🔐 SESSION MANAGER - Auto Logout & Activity Tracking
// =========================================================================

const SessionManager = {
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    warningTimeout: 28 * 60 * 1000, // 28 minutes (2 min warning)
    checkInterval: 60 * 1000, // Check every minute
    lastActivity: Date.now(),
    inactivityTimer: null,
    warningTimer: null,
    checkTimer: null,
    warningShown: false,

    init() {
        this.lastActivity = Date.now();
        this.setupActivityListeners();
        this.startChecking();
        console.log('📊 Session Manager initialized - 30 min inactivity timeout');
    },

    // Setup activity listeners
    setupActivityListeners() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, () => this.updateActivity(), { passive: true });
        });
    },

    // Update last activity time
    updateActivity() {
        this.lastActivity = Date.now();
        this.warningShown = false;

        // Clear existing timers
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);

        // Set warning timer
        this.warningTimer = setTimeout(() => this.showInactivityWarning(), this.warningTimeout);

        // Set logout timer
        this.inactivityTimer = setTimeout(() => this.handleInactivityLogout(), this.inactivityTimeout);
    },

    // Start checking session
    startChecking() {
        this.updateActivity();

        // Check session every minute
        this.checkTimer = setInterval(() => {
            const inactive = Date.now() - this.lastActivity;

            // If inactive for more than timeout, logout
            if (inactive >= this.inactivityTimeout) {
                this.handleInactivityLogout();
            }
            // Show warning 2 minutes before logout
            else if (inactive >= this.warningTimeout && !this.warningShown) {
                this.showInactivityWarning();
            }
        }, this.checkInterval);
    },

    // Show inactivity warning
    showInactivityWarning() {
        if (this.warningShown || !currentUser) return;

        this.warningShown = true;
        const timeLeft = Math.ceil((this.inactivityTimeout - this.warningTimeout) / 1000 / 60);

        showToast(
            "Warning",
            `You will be logged out in ${timeLeft} minutes due to inactivity. Click anywhere to stay logged in.`,
            10000,
            false,
            true
        );

        console.warn('⚠️ Inactivity warning shown');
    },

    // Handle inactivity logout
    async handleInactivityLogout() {
        if (!currentUser) return;

        console.warn('🔒 Auto-logout due to inactivity');

        // Clear timers
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);
        if (this.checkTimer) clearInterval(this.checkTimer);

        // Clear token
        AuthTokenManager.clearToken();

        // Show logout message
        showToast(
            "Session Expired",
            "You have been logged out due to inactivity for security reasons.",
            5000,
            true
        );

        // Wait for toast then logout
        setTimeout(async () => {
            try {
                await signOut(auth);
                window.location.reload();
            } catch (error) {
                console.error('Logout error:', error);
                window.location.reload();
            }
        }, 2000);
    },

    // Stop session management
    stop() {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);
        if (this.checkTimer) clearInterval(this.checkTimer);
    }
};

// =========================================================================
// 🔐 AUTHENTICATION TOKEN MANAGER
// =========================================================================

const AuthTokenManager = {
    tokenKey: 'auth_session_token',
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    refreshInterval: null,

    // Generate session token
    async generateToken(uid) {
        const token = {
            uid,
            token: SecurityManager.generateCSRFToken(),
            createdAt: Date.now(),
            expiresAt: Date.now() + this.tokenExpiry,
            lastRefresh: Date.now()
        };
        sessionStorage.setItem(this.tokenKey, JSON.stringify(token));

        // Start auto-refresh
        this.startAutoRefresh(uid);

        return token.token;
    },

    // Verify token
    verifyToken(uid) {
        try {
            const stored = sessionStorage.getItem(this.tokenKey);
            if (!stored) return false;

            const token = JSON.parse(stored);

            // Check expiry
            if (Date.now() > token.expiresAt) {
                this.clearToken();
                this.handleExpiredSession();
                return false;
            }

            // Check UID match
            if (token.uid !== uid) {
                this.clearToken();
                return false;
            }

            return true;
        } catch (error) {
            SecurityManager.logSecurityEvent('Token verification failed', error);
            return false;
        }
    },

    // Clear token
    clearToken() {
        sessionStorage.removeItem(this.tokenKey);
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    // Refresh token
    async refreshToken(uid) {
        return await this.generateToken(uid);
    },

    // Auto-refresh token every 12 hours
    startAutoRefresh(uid) {
        if (this.refreshInterval) clearInterval(this.refreshInterval);

        this.refreshInterval = setInterval(async () => {
            if (currentUser && this.verifyToken(uid)) {
                await this.refreshToken(uid);
                console.log('🔄 Session token refreshed automatically');
            }
        }, 12 * 60 * 60 * 1000); // 12 hours
    },

    // Handle expired session
    async handleExpiredSession() {
        console.warn('🔒 Session expired');

        showToast(
            "Session Expired",
            "Your session has expired. Please login again.",
            5000,
            true
        );

        SessionManager.stop();

        setTimeout(async () => {
            if (currentUser) {
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error('Logout error:', error);
                }
            }
            window.location.reload();
        }, 2000);
    }
};

// =========================================================================

// Convert image file to base64 data URL
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('File must be an image'));
            return;
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB in bytes
        if (file.size > maxSize) {
            reject(new Error('Image size must be less than 2MB'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            resolve(e.target.result);
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsDataURL(file);
    });
}

function copyToClipboard(text, elementToSignal) {
    navigator.clipboard.writeText(text).then(() => {
        const originalTextOrTitle = elementToSignal?.title || elementToSignal?.textContent;
        const isTitle = !!elementToSignal?.title;
        const originalIconElement = elementToSignal?.querySelector('i');
        const originalIconClass = originalIconElement ? originalIconElement.className : null;

        if (elementToSignal) {
            if (isTitle) elementToSignal.title = "Copied!";
            else {
                if (originalIconElement) {
                    originalIconElement.classList.remove('fa-copy', 'fa-eye', 'fa-eye-slash');
                    originalIconElement.classList.add('fa-check');
                    elementToSignal.style.backgroundColor = 'var(--primary-green)';
                    elementToSignal.style.color = 'white';
                } else {
                    elementToSignal.textContent = "Copied!";
                }
            }
        }
        showToast("Copied", `"${text}" copied to clipboard.`, 1500);

        setTimeout(() => {
            if(elementToSignal){
                if (isTitle) elementToSignal.title = originalTextOrTitle;
                else {
                     if (originalIconElement && originalIconClass) {
                        originalIconElement.className = originalIconClass;
                        elementToSignal.style.backgroundColor = '';
                        elementToSignal.style.color = '';
                     } else if (originalIconElement) {
                         if (elementToSignal.id === 'apiViewToggleBtn') {
                             elementToSignal.setAttribute('data-password-visible', 'false');
                             originalIconElement.className = 'fas fa-eye';
                         } else {
                             originalIconElement.className = 'fas fa-copy';
                         }
                         elementToSignal.style.backgroundColor = '';
                         elementToSignal.style.color = '';
                     } else {
                         elementToSignal.innerHTML = `<i class="fas fa-copy"></i> Copy`;
                     }
                }
            }
        }, 2000);
    }).catch(err => {
        showToast("Error", "Could not copy text.", 2000, true);
        console.error('Failed to copy: ', err);
    });
}


function showOrderSuccessModal(title = "Order Successful!", message = "Your order has been submitted and is processing.", type = "general", orderId = null) {
    if (DOMElements.orderSuccessTitleEl) DOMElements.orderSuccessTitleEl.textContent = title;
    let finalMessage = message;
    if (orderId) {
        finalMessage += ` Ref: ${orderId}`;
    }
    if (DOMElements.orderSuccessMessageEl) DOMElements.orderSuccessMessageEl.innerHTML = finalMessage.replace(/\n/g, '<br>');

    if(DOMElements.generalOrderSuccessIconContainer) {
        DOMElements.generalOrderSuccessIconContainer.className = 'order-success-icon';
        DOMElements.generalOrderSuccessIconContainer.innerHTML = '<i class="fas fa-check-circle"></i>';
    }


    if (type === "messageSending") {
        if(DOMElements.generalOrderSuccessIconContainer) DOMElements.generalOrderSuccessIconContainer.style.display = 'none';
        if(DOMElements.messageSendingSuccessIconContainer) {
            DOMElements.messageSendingSuccessIconContainer.style.display = 'flex';
        }
        if(DOMElements.orderSuccessTitleEl) DOMElements.orderSuccessTitleEl.innerHTML = "Success! Your message<br>has started sending.";

    } else if (type === "results_checker_success") {
         if(DOMElements.generalOrderSuccessIconContainer) {
            DOMElements.generalOrderSuccessIconContainer.style.display = 'flex';
            DOMElements.generalOrderSuccessIconContainer.classList.add('results-checker');
            DOMElements.generalOrderSuccessIconContainer.innerHTML = '<i class="fas fa-receipt"></i>';
         }
        if(DOMElements.messageSendingSuccessIconContainer) DOMElements.messageSendingSuccessIconContainer.style.display = 'none';
    }
    else {
        if(DOMElements.generalOrderSuccessIconContainer) DOMElements.generalOrderSuccessIconContainer.style.display = 'flex';
        if(DOMElements.messageSendingSuccessIconContainer) DOMElements.messageSendingSuccessIconContainer.style.display = 'none';
    }


    if (DOMElements.orderSuccessModalOverlay) {
        openModal(DOMElements.orderSuccessModalOverlay);
    }
}

async function sendSmsNotification(recipientNumber, message) {
    if (!siteSettings.bulkSmsApiKey || !siteSettings.bulkSmsSenderId) {
        console.warn("Bulk SMS API Key or Sender ID not configured in siteSettings. SMS not sent for: ", message);
        return false;
    }
    if (!recipientNumber || !message) {
        console.warn("Recipient number or message is empty. SMS not sent.");
        return false;
    }

    let formattedRecipient = String(recipientNumber).trim();
    if (formattedRecipient.startsWith('0') && formattedRecipient.length === 10) {
        formattedRecipient = `233${formattedRecipient.substring(1)}`;
    } else if (!formattedRecipient.startsWith('233') && formattedRecipient.length === 9) {
        formattedRecipient = `233${formattedRecipient}`;
    } else if (!formattedRecipient.startsWith('233')) {
         console.warn(`Recipient number ${recipientNumber} might not be in the correct international format (233xxxxxxxxx). Proceeding anyway.`);
    }


    const apiKey = siteSettings.bulkSmsApiKey;
    const senderId = siteSettings.bulkSmsSenderId;
    const apiUrl = `https://clientlogin.bulksmsgh.com/smsapi?key=${apiKey}&to=${formattedRecipient}&msg=${encodeURIComponent(message)}&sender_id=${senderId}`;

    try {
        console.log(`Attempting to send SMS to ${formattedRecipient}: "${message}"`);
        const response = await fetch(apiUrl, { method: 'GET' });
        const responseText = await response.text();
        console.log(`Bulk SMS API Response for ${formattedRecipient}:`, responseText);

        if (response.ok && responseText.includes("1000")) {
            console.log(`SMS successfully queued/sent to ${formattedRecipient}.`);
            return true;
        } else {
            console.error(`Failed to send SMS to ${formattedRecipient}. API Response: ${responseText}`);
            return false;
        }
    } catch (error) {
        console.error(`Error sending SMS to ${formattedRecipient}:`, error);
        return false;
    }
}


// Load merchant store (inline without redirect)
async function loadMerchantStore() {
    if (!storeData.storeSlug) {
        console.error('No merchant slug provided');
        return;
    }

    try {
        console.log('Querying Firestore for merchant store:', storeData.storeSlug);

        // Show store loading (replacing entire page)
        document.body.innerHTML = `
            <style>
                .spinner-original {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
                <div class="spinner-original"></div>
                <p style="margin-top: 20px; color: #666; font-family: Arial, sans-serif;">Loading store...</p>
            </div>
        `;

        // Query for store by slug in dedicated 'stores' collection
        const storesRef = collection(db, 'stores');
        const storeDocRef = doc(storesRef, storeData.storeSlug);
        const storeDocSnap = await getDoc(storeDocRef);

        console.log('🔍 Store query result:', storeDocSnap.exists() ? 'Found' : 'Not found');

        let merchantDoc = null;
        let storeDocument = null;

        if (storeDocSnap.exists()) {
            storeDocument = storeDocSnap.data();
            console.log('✅ Store found:', storeDocument.brandName);

            // Check if store is banned
            if (storeDocument.isBanned === true) {
                document.body.innerHTML = `
                    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
                        <i class="fas fa-ban" style="font-size: 80px; color: #e74c3c; margin-bottom: 20px;"></i>
                        <h2 style="color: #e74c3c; margin-bottom: 10px;">Store Suspended</h2>
                        <p style="font-size: 14px; color: #999;">This store has been temporarily suspended.</p>
                    </div>
                `;
                return;
            }

            // Check if store setup is complete
            if (storeDocument.setupComplete !== true) {
                document.body.innerHTML = `
                    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
                        <i class="fas fa-tools" style="font-size: 80px; color: #f39c12; margin-bottom: 20px;"></i>
                        <h2 style="color: #333; margin-bottom: 10px;">Store Setup In Progress</h2>
                        <p style="font-size: 14px; color: #999;">The merchant is still setting up this store. Please check back later.</p>
                    </div>
                `;
                return;
            }

            // Get merchant user document
            const userDocRef = doc(db, 'users', storeDocument.ownerId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                merchantDoc = userDocSnap;
                console.log('✅ Merchant found:', storeDocument.ownerId);
            } else {
                console.error('❌ Merchant user not found');
            }
        }

        if (!merchantDoc) {
            // Store not found
            const storeExistsButNotSetup = false;

            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
                    <i class="fas fa-store-slash" style="font-size: 64px; color: #e74c3c; margin-bottom: 20px;"></i>
                    <h2 style="font-size: 32px; margin-bottom: 15px; color: #2c3e50;">Store ${storeExistsButNotSetup ? 'Not Ready' : 'Not Found'}</h2>
                    <p style="font-size: 16px; color: #666; margin-bottom: 10px;">
                        ${storeExistsButNotSetup
                            ? `The store "<strong>${storeData.storeSlug}</strong>" is being set up. Please check back later.`
                            : `The store "<strong>${storeData.storeSlug}</strong>" does not exist.`}
                    </p>
                    <p style="font-size: 14px; color: #999;">
                        ${storeExistsButNotSetup ? 'The merchant needs to complete store setup.' : 'Please check the URL and try again.'}
                    </p>
                </div>
            `;
            return;
        }

        // Use the store document and merchant data
        storeData.merchantId = merchantDoc.id;
        const merchantData = merchantDoc.data();

        // Create storeConfig from store document for backward compatibility
        storeData.storeConfig = {
            storeName: storeDocument.brandName,
            storeSlug: storeDocument.slug,
            brandLogo: storeDocument.brandLogo,
            contactEmail: storeDocument.contactEmail,
            contactPhone: storeDocument.contactPhone,
            storeSlogan: storeDocument.storeSlogan,
            primaryColor: storeDocument.primaryColor,
            secondaryColor: storeDocument.secondaryColor,
            mtnLogoUrl: storeDocument.mtnLogoUrl,
            telecelLogoUrl: storeDocument.telecelLogoUrl,
            airtelTigoLogoUrl: storeDocument.airtelTigoLogoUrl,
            openingTime: storeDocument.openingTime,
            closingTime: storeDocument.closingTime,
            workingDays: storeDocument.workingDays,
            setupComplete: storeDocument.setupComplete
        };

        console.log('✅ Store found! Merchant ID:', storeData.merchantId);
        console.log('📦 Store config:', storeData.storeConfig);

        // Load store inline (NO redirect)
        await renderStoreInline(merchantData);

    } catch (error) {
        console.error('Error loading merchant store:', error);

        let errorMessage = 'An unexpected error occurred. Please try again later.';
        if (error.message) {
            errorMessage = `<strong>Error:</strong> ${error.message}`;
        }

        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #e74c3c; margin-bottom: 20px;"></i>
                <h2 style="font-size: 32px; margin-bottom: 15px; color: #e74c3c;">Error Loading Store</h2>
                <p style="font-size: 16px; color: #666; margin-bottom: 10px;">${errorMessage}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// Render store inline without redirecting (like old site)
async function renderStoreInline(merchantData) {
    try {
        const storeConfig = merchantData.storeConfig;
        const storeProducts = (merchantData.storeProducts || []).filter(p => p.isActive);

        console.log('Rendering store inline for:', storeConfig.storeName);
        console.log('Active products:', storeProducts.length);

        // Fetch global data packages
        const globalDataPackages = await fetchGlobalDataPackagesForStore();

        // Render the store directly (no redirect, no fetch)
        const storeContainer = document.createElement('div');
        storeContainer.id = 'publicStoreContainer';
        storeContainer.className = 'public-store-container';

        // Replace body content
        document.body.innerHTML = '';
        document.body.appendChild(storeContainer);
        document.body.classList.add('public-store-active');

        // Add store-specific styles
        await addStoreStyles();

        // Render the actual store content
        renderPublicStoreContent(storeContainer, {
            merchantId: storeData.merchantId,
            storeConfig: storeConfig,
            storeProducts: storeProducts,
            globalDataPackages: globalDataPackages
        });

        console.log('Store loaded inline successfully!');
    } catch (error) {
        console.error('Error rendering store inline:', error);
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #e74c3c; margin-bottom: 20px;"></i>
                <h2 style="font-size: 32px; margin-bottom: 15px; color: #e74c3c;">Error Loading Store</h2>
                <p style="font-size: 16px; color: #666; margin-bottom: 10px;">
                    Could not load store content: ${error.message}
                </p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// Fetch global data packages for store
async function fetchGlobalDataPackagesForStore() {
    const packages = { mtn: [], telecel: [], at: [] };
    try {
        const networks = ['mtn', 'telecel', 'at'];
        for (const network of networks) {
            const packagesColRef = collection(db, `dataPackages/${network}/packages`);
            const q = query(packagesColRef, where("isActive", "==", true), orderBy("customerPrice"));
            const querySnapshot = await getDocs(q);
            packages[network] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                network: network
            }));
        }
    } catch (error) {
        console.error('Error fetching global packages:', error);
    }
    return packages;
}

// Add store-specific CSS styles
async function addStoreStyles() {
    // Check if styles already added
    if (document.getElementById('store-inline-styles')) return;

    try {
        // Fetch store.html and extract just the styles
        const storeHTML = await fetch('store.html').then(r => r.text());
        const parser = new DOMParser();
        const storeDoc = parser.parseFromString(storeHTML, 'text/html');
        const storeStyle = storeDoc.querySelector('style');

        if (storeStyle) {
            const styleEl = document.createElement('style');
            styleEl.id = 'store-inline-styles';
            styleEl.innerHTML = storeStyle.innerHTML;
            document.head.appendChild(styleEl);

            // Add modern responsive styles with mobile bottom nav
            const responsiveStyles = document.createElement('style');
            responsiveStyles.innerHTML = `
                /* 🎨 Modern Store Responsive Styles */

                /* Desktop - Show top nav, hide bottom nav */
                @media (min-width: 769px) {
                    .mobile-bottom-nav {
                        display: none !important;
                    }
                }

                /* Mobile - Hide top nav, show bottom nav */
                @media (max-width: 768px) {
                    /* Hide desktop navigation */
                    .modern-store-header > div:last-child {
                        display: none !important;
                    }

                    /* Show mobile bottom navigation */
                    .mobile-bottom-nav {
                        display: block !important;
                        animation: slideUpNav 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    /* Header adjustments */
                    .modern-store-header h1 {
                        font-size: 20px !important;
                    }
                    .modern-store-header .help-btn-text {
                        display: none !important;
                    }
                    .modern-store-header button#needHelpBtn {
                        padding: 12px !important;
                        min-width: auto !important;
                    }
                    .modern-store-header [style*="font-size: 13px"] {
                        font-size: 11px !important;
                    }

                    /* Hero banner */
                    .modern-store-header + div h2 {
                        font-size: 24px !important;
                    }
                    .modern-store-header + div p {
                        font-size: 14px !important;
                    }
                    .modern-store-header + div button {
                        padding: 12px 24px !important;
                        font-size: 14px !important;
                    }
                }

                @media (max-width: 480px) {
                    /* Compact header for mobile */
                    .modern-store-header [style*="width: 60px"] {
                        width: 50px !important;
                        height: 50px !important;
                    }
                    .modern-store-header h1 {
                        font-size: 18px !important;
                    }
                    .modern-store-header [style*="font-size: 24px"] {
                        font-size: 20px !important;
                    }
                    .modern-store-header [style*="VERIFIED"] {
                        display: none !important;
                    }
                    .modern-store-header + div {
                        padding: 30px 15px !important;
                    }
                    .modern-store-header + div h2 {
                        font-size: 20px !important;
                    }
                    .modern-store-header + div [style*="display: flex"] {
                        flex-direction: column !important;
                    }
                    .modern-store-header + div button {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }

                /* 🎭 SMOOTH ANIMATIONS */
                .modern-nav-tab, .mobile-nav-btn {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }

                .mobile-nav-btn:active {
                    transform: scale(0.95);
                }

                /* Content container */
                .store-content-section {
                    background: #f8f9fa;
                    min-height: 50vh;
                    padding: 30px 0;
                }

                /* Tab content panes with professional animations */
                .tab-content-pane {
                    display: none;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .tab-content-pane.active {
                    display: block;
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Slide up animation for mobile nav */
                @keyframes slideUpNav {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                /* Fade in animation */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Scale animation for icons */
                @keyframes scaleIn {
                    from {
                        transform: scale(0.8);
                    }
                    to {
                        transform: scale(1);
                    }
                }

                /* Pulse animation for active nav items */
                .mobile-nav-btn.active i {
                    animation: pulse 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.15);
                    }
                }

                /* Smooth scroll behavior */
                html {
                    scroll-behavior: smooth;
                }

                /* iOS safe area */
                @supports (padding-bottom: env(safe-area-inset-bottom)) {
                    .mobile-bottom-nav {
                        padding-bottom: env(safe-area-inset-bottom);
                    }
                }
            `;
            document.head.appendChild(responsiveStyles);
        }
    } catch (error) {
        console.error('Error loading store styles:', error);
    }
}

// Render the actual store content - PROFESSIONAL MODERN UI
function renderPublicStoreContent(container, { merchantId, storeConfig, storeProducts, globalDataPackages }) {
    console.log('🎨 Rendering store UI for:', storeConfig.storeName);
    console.log('📦 Products:', storeProducts.length);
    console.log('📱 Container:', container);

    const storeHTML = `
        <!-- 🎨 MODERN PROFESSIONAL HEADER -->
        <div class="modern-store-header" style="
            background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'} 0%, ${storeConfig.secondaryColor || '#764ba2'} 100%);
            position: sticky;
            top: 0;
            z-index: 2000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            backdrop-filter: blur(10px);
        ">
            <!-- Top Bar -->
            <div style="
                background: rgba(0,0,0,0.1);
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="color: rgba(255,255,255,0.9); font-size: 13px; display: flex; align-items: center; gap: 15px;">
                        <span><i class="fas fa-phone-alt" style="margin-right: 5px;"></i> ${storeConfig.contactPhone || '024-000-0000'}</span>
                        <span style="display: none; sm:inline;"><i class="fas fa-envelope" style="margin-right: 5px;"></i> Support Available</span>
                    </div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 13px;">
                        <i class="fas fa-shield-alt" style="margin-right: 5px;"></i> Trusted & Secure
                    </div>
                </div>
            </div>

            <!-- Main Header -->
            <div style="
                padding: 16px 0;
                background: rgba(255,255,255,0.03);
            ">
                <div style="
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                ">
                    <!-- Logo & Brand -->
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        flex: 1;
                        min-width: 0;
                    ">
                        <div style="
                            position: relative;
                            width: 60px;
                            height: 60px;
                            flex-shrink: 0;
                        ">
                            <img src="${storeConfig.brandLogo || 'https://via.placeholder.com/60'}"
                                 alt="Store Logo"
                                 style="
                                    width: 100%;
                                    height: 100%;
                                    border-radius: 16px;
                                    object-fit: cover;
                                    border: 3px solid rgba(255,255,255,0.9);
                                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                                 ">
                            <div style="
                                position: absolute;
                                bottom: -4px;
                                right: -4px;
                                width: 20px;
                                height: 20px;
                                background: #10B981;
                                border: 3px solid white;
                                border-radius: 50%;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                            " title="Online & Active"></div>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h1 style="
                                font-size: 24px;
                                font-weight: 800;
                                color: white;
                                margin: 0;
                                text-shadow: 0 2px 12px rgba(0,0,0,0.3);
                                letter-spacing: 0.5px;
                                line-height: 1.2;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            ">${storeConfig.storeName || 'Data Store'}</h1>
                            <p style="
                                font-size: 13px;
                                color: rgba(255,255,255,0.85);
                                margin: 4px 0 0 0;
                                font-weight: 500;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <span style="
                                    background: rgba(255,255,255,0.2);
                                    padding: 2px 10px;
                                    border-radius: 12px;
                                    font-size: 11px;
                                    font-weight: 600;
                                ">
                                    <i class="fas fa-badge-check"></i> VERIFIED
                                </span>
                                <span style="font-size: 12px;">Fast & Reliable Service</span>
                            </p>
                        </div>
                    </div>

                    <!-- Help Button -->
                    <button id="needHelpBtn" style="
                        background: white;
                        color: ${storeConfig.primaryColor || '#667eea'};
                        border: none;
                        padding: 12px 24px;
                        border-radius: 30px;
                        font-size: 15px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                        white-space: nowrap;
                        flex-shrink: 0;
                    " onmouseover="
                        this.style.transform='translateY(-3px) scale(1.05)';
                        this.style.boxShadow='0 8px 30px rgba(0,0,0,0.25)';
                    " onmouseout="
                        this.style.transform='translateY(0) scale(1)';
                        this.style.boxShadow='0 4px 20px rgba(0,0,0,0.15)';
                    ">
                        <i class="fas fa-headset" style="font-size: 18px;"></i>
                        <span class="help-btn-text">Need Help?</span>
                    </button>
                </div>
            </div>

            <!-- Navigation Bar -->
            <div style="
                background: rgba(0,0,0,0.08);
                border-top: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                ">
                    <button class="modern-nav-tab active" data-tab="data-plans" style="
                        background: rgba(255,255,255,0.15);
                        color: white;
                        border: none;
                        padding: 14px 28px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border-bottom: 3px solid white;
                        white-space: nowrap;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-wifi"></i> Data Plans
                    </button>
                    <button class="modern-nav-tab" data-tab="orders" style="
                        background: transparent;
                        color: rgba(255,255,255,0.8);
                        border: none;
                        padding: 14px 28px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border-bottom: 3px solid transparent;
                        white-space: nowrap;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-history"></i> Track Orders
                    </button>
                </div>
            </div>
        </div>

        <!-- 🎉 HERO BANNER SECTION -->
        <div style="
            background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'} 0%, ${storeConfig.secondaryColor || '#764ba2'} 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        ">
            <!-- Animated Background Pattern -->
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image:
                    radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%);
                opacity: 0.6;
            "></div>

            <div style="position: relative; z-index: 1; max-width: 800px; margin: 0 auto;">
                <div style="
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.2);
                    padding: 8px 20px;
                    border-radius: 30px;
                    margin-bottom: 20px;
                    backdrop-filter: blur(10px);
                ">
                    <i class="fas fa-sun" style="color: #FDB813; font-size: 24px;"></i>
                    <span style="color: white; font-weight: 600; font-size: 18px;">${getCurrentTimeOfDayGreeting()}</span>
                </div>

                <h2 style="
                    font-size: 32px;
                    font-weight: 800;
                    color: white;
                    margin: 0 0 15px 0;
                    text-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    line-height: 1.2;
                ">${storeConfig.storeSlogan || 'AFFORDABLE AND RELIABLE DATA... EAAAAASY.'}</h2>

                <p style="
                    font-size: 16px;
                    color: rgba(255,255,255,0.95);
                    margin: 0 0 30px 0;
                    font-weight: 500;
                ">Get the best data bundles at unbeatable prices. Fast delivery guaranteed!</p>

                <div style="
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                ">
                    <button id="joinWhatsappGroupBtn" style="
                        background: #25D366;
                        color: white;
                        border: none;
                        padding: 14px 32px;
                        border-radius: 30px;
                        font-size: 16px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        box-shadow: 0 6px 24px rgba(37,211,102,0.4);
                    " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 30px rgba(37,211,102,0.5)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 24px rgba(37,211,102,0.4)'">
                        <i class="fab fa-whatsapp" style="font-size: 20px;"></i>
                        Join WhatsApp
                    </button>
                    <button id="shareWithFriendsBtn" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 2px solid white;
                        padding: 14px 32px;
                        border-radius: 30px;
                        font-size: 16px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        backdrop-filter: blur(10px);
                    " onmouseover="this.style.background='white'; this.style.color='${storeConfig.primaryColor || '#667eea'}'"
                       onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.color='white'">
                        <i class="fas fa-share-alt" style="font-size: 18px;"></i>
                        Share Store
                    </button>
                </div>
            </div>
        </div>

        <!-- Main Content Area with bottom padding for mobile nav -->
        <div class="container store-content-section" style="
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px 20px 80px 20px;
        ">
            <div class="tab-content-pane active" id="data-plans-tab-content" style="
                display: block;
                animation: fadeIn 0.5s ease-out;
            ">
                <div class="data-plans-grid" id="dataPlansGrid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                    padding: 20px 0;
                ">
                    ${renderNetworkCards(storeProducts, globalDataPackages, storeConfig)}
                </div>
            </div>

            <div class="tab-content-pane" id="orders-tab-content" style="display: none;">
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 32px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    max-width: 800px;
                    margin: 0 auto;
                ">
                    <h3 style="
                        margin: 0 0 24px 0;
                        font-size: 24px;
                        font-weight: 700;
                        color: #0f172a;
                        text-align: center;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">Check Order Progress</h3>
                    <div style="margin-bottom: 20px;">
                        <input type="tel" id="orderSearchPhone" placeholder="Enter Order Phone Number (e.g., 0501234567)" pattern="0[0-9]{9}" maxlength="10" style="
                            width: 100%;
                            padding: 16px 20px;
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            font-size: 16px;
                            transition: all 0.2s;
                            outline: none;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">
                    </div>
                    <button id="searchOrderBtn" style="
                        width: 100%;
                        padding: 16px;
                        background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'} 0%, ${storeConfig.secondaryColor || '#764ba2'} 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">
                        <i class="fas fa-search" style="margin-right: 8px;"></i> Search Order
                    </button>
                    <div id="orderHistoryPlaceholder" style="
                        text-align: center;
                        padding: 60px 20px;
                        color: #94a3b8;
                    ">
                        <i class="fas fa-receipt" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                        <h4 style="
                            margin: 0 0 12px 0;
                            font-size: 18px;
                            font-weight: 600;
                            color: #64748b;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">Check Your Order History</h4>
                        <p style="
                            margin: 0;
                            font-size: 14px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">Enter your phone number above to find your past purchases.</p>
                    </div>
                    <div id="orderHistoryResults" style="display: none; margin-top: 24px;">
                        <table style="
                            width: 100%;
                            border-collapse: separate;
                            border-spacing: 0;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        ">
                            <thead>
                                <tr style="background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'} 0%, ${storeConfig.secondaryColor || '#764ba2'} 100%);">
                                    <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Order ID</th>
                                    <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Product</th>
                                    <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Amount</th>
                                    <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Status</th>
                                    <th style="padding: 16px; text-align: left; color: white; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Date</th>
                                </tr>
                            </thead>
                            <tbody id="orderHistoryTableBody" style="background: white;"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- 📱 MOBILE BOTTOM NAVIGATION (Hidden on Desktop) -->
        <div class="mobile-bottom-nav" style="
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
            display: none;
            z-index: 1500;
            border-top: 1px solid #e0e0e0;
            backdrop-filter: blur(20px);
            background: rgba(255,255,255,0.95);
        ">
            <div style="
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                max-width: 600px;
                margin: 0 auto;
            ">
                <button class="mobile-nav-btn active" data-tab="data-plans" style="
                    background: transparent;
                    border: none;
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    color: ${storeConfig.primaryColor || '#667eea'};
                ">
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 40px;
                        height: 3px;
                        background: ${storeConfig.primaryColor || '#667eea'};
                        border-radius: 0 0 3px 3px;
                        transition: all 0.3s ease;
                    " class="nav-indicator"></div>
                    <i class="fas fa-wifi" style="font-size: 22px; transition: transform 0.3s ease;"></i>
                    <span style="font-size: 12px; font-weight: 600;">Data Plans</span>
                </button>
                <button class="mobile-nav-btn" data-tab="orders" style="
                    background: transparent;
                    border: none;
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    color: #94a3b8;
                ">
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 3px;
                        background: ${storeConfig.primaryColor || '#667eea'};
                        border-radius: 0 0 3px 3px;
                        transition: all 0.3s ease;
                    " class="nav-indicator"></div>
                    <i class="fas fa-history" style="font-size: 22px; transition: transform 0.3s ease;"></i>
                    <span style="font-size: 12px; font-weight: 600;">Track Orders</span>
                </button>
            </div>
        </div>

        <!-- Package Selection Modal -->
        <div id="storePackageModal" class="modal-overlay-store" style="
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
            overflow-y: auto;
            padding: 20px;
        ">
            <div class="modal-content-store" style="
                background: white;
                max-width: 500px;
                margin: 40px auto;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                position: relative;
                animation: slideUp 0.3s ease-out;
            ">
                <div class="modal-header-store" style="
                    background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'} 0%, ${storeConfig.secondaryColor || '#764ba2'} 100%);
                    color: white;
                    padding: 24px;
                    border-radius: 16px 16px 0 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img id="modalNetworkLogo" src="" alt="Network" style="width: 40px; height: 40px; border-radius: 8px; background: white; padding: 4px;">
                        <div>
                            <h2 id="modalNetworkTitle" style="margin: 0; font-size: 20px; font-weight: 700;">Select Package</h2>
                            <p id="modalNetworkSubtitle" style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Choose your data bundle</p>
                        </div>
                    </div>
                    <button id="closeStoreModal" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        font-size: 20px;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">&times;</button>
                </div>
                <div class="modal-body-store" style="padding: 24px;">
                    <div id="packagesList" style="
                        max-height: 300px;
                        overflow-y: auto;
                        margin-bottom: 20px;
                        display: grid;
                        gap: 12px;
                    "></div>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #334155; font-size: 14px;">
                                <i class="fas fa-phone" style="margin-right: 6px; color: ${storeConfig.primaryColor || '#667eea'};"></i>
                                Phone Number
                            </label>
                            <input type="tel" id="storePhoneInput" placeholder="0XXXXXXXXX" style="
                                width: 100%;
                                padding: 12px 16px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 16px;
                                transition: all 0.2s;
                                outline: none;
                            " pattern="0[0-9]{9}" maxlength="10">
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #334155; font-size: 14px;">
                                <i class="fas fa-envelope" style="margin-right: 6px; color: ${storeConfig.primaryColor || '#667eea'};"></i>
                                Email (Optional)
                            </label>
                            <input type="email" id="storeEmailInput" placeholder="your@email.com" style="
                                width: 100%;
                                padding: 12px 16px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 16px;
                                transition: all 0.2s;
                                outline: none;
                            ">
                        </div>
                        <div id="selectedPackageInfo" style="
                            background: #f8fafc;
                            padding: 16px;
                            border-radius: 10px;
                            margin-bottom: 16px;
                            display: none;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">Selected Package</div>
                                    <div id="selectedPackageName" style="font-weight: 700; font-size: 16px; color: #0f172a;"></div>
                                </div>
                                <div id="selectedPackagePrice" style="font-size: 24px; font-weight: 700; color: ${storeConfig.primaryColor || '#667eea'};"></div>
                            </div>
                        </div>
                        <button id="storeProceedBtn" disabled style="
                            width: 100%;
                            padding: 16px;
                            background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'} 0%, ${storeConfig.secondaryColor || '#764ba2'} 100%);
                            color: white;
                            border: none;
                            border-radius: 12px;
                            font-size: 16px;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.3s;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        ">
                            <i class="fas fa-lock" style="margin-right: 8px;"></i>
                            Proceed to Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <style>
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            #storePhoneInput:focus, #storeEmailInput:focus {
                border-color: ${storeConfig.primaryColor || '#667eea'};
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            #storeProceedBtn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            }
            #storeProceedBtn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .package-option:hover {
                border-color: ${storeConfig.primaryColor || '#667eea'} !important;
                transform: translateY(-4px) !important;
                box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
            }
            .package-option.selected {
                border-color: ${storeConfig.primaryColor || '#667eea'} !important;
                background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'}08, ${storeConfig.secondaryColor || '#764ba2'}08) !important;
                box-shadow: 0 8px 32px ${storeConfig.primaryColor || '#667eea'}40 !important;
            }
            .package-option.selected .package-radio {
                border-color: ${storeConfig.primaryColor || '#667eea'} !important;
                background: ${storeConfig.primaryColor || '#667eea'}10 !important;
            }
            .package-option.selected .package-radio-dot {
                transform: scale(1) !important;
            }
            #packagesList::-webkit-scrollbar {
                width: 8px;
            }
            #packagesList::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 10px;
            }
            #packagesList::-webkit-scrollbar-thumb {
                background: ${storeConfig.primaryColor || '#667eea'};
                border-radius: 10px;
            }
        </style>
    `;

    container.innerHTML = storeHTML;

    // Initialize store functionality
    initializeStoreEventListeners(merchantId, storeConfig, storeProducts, globalDataPackages);
}

// Helper to render network cards with custom logos and border colors
function renderNetworkCards(storeProducts, globalDataPackages, storeConfig) {
    const networks = ['mtn', 'telecel', 'at'];

    // Network colors for borders
    const networkColors = {
        mtn: '#FFCC00',
        telecel: '#E20016',
        at: '#004F9F'
    };

    const networkInfo = {
        mtn: {
            title: 'MTN Data Bundle',
            slogan: 'Largest network coverage',
            tags: ['4G LTE', 'Cheap', '24/7'],
            logo: storeConfig?.mtnLogoUrl || NETWORK_LOGOS.mtn
        },
        telecel: {
            title: 'Telecel Data Bundle',
            slogan: 'Best value for money',
            tags: ['4G+', 'Fast', 'Reliable'],
            logo: storeConfig?.telecelLogoUrl || NETWORK_LOGOS.telecel
        },
        at: {
            title: 'AirtelTigo Bigtime',
            slogan: 'Long validity periods',
            tags: ['Value', 'Extended', 'Flexible'],
            logo: storeConfig?.airtelTigoLogoUrl || NETWORK_LOGOS.at
        }
    };

    return networks.map((networkKey, index) => {
        const info = networkInfo[networkKey];
        const availableProducts = storeProducts.filter(p => p.network.toLowerCase() === networkKey && p.isActive);
        const hasProducts = availableProducts.length > 0;
        const isDisabled = !hasProducts;
        const borderColor = networkColors[networkKey];

        return `
            <div class="network-plan-card"
                 data-network="${networkKey}"
                 style="
                    background: ${isDisabled ? '#f8f9fa' : 'white'};
                    border: 3px solid ${isDisabled ? '#e2e8f0' : borderColor};
                    border-top: 8px solid ${isDisabled ? '#e2e8f0' : borderColor};
                    border-radius: 16px;
                    padding: 24px;
                    cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: ${isDisabled ? '0 2px 8px rgba(0,0,0,0.05)' : '0 4px 20px rgba(0,0,0,0.1)'};
                    opacity: ${isDisabled ? '0.6' : '1'};
                    min-height: 200px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                    overflow: hidden;
                ">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                    <img src="${info.logo}"
                         alt="${networkKey.toUpperCase()} Logo"
                         style="
                            width: 60px;
                            height: 60px;
                            object-fit: contain;
                            border-radius: 12px;
                            background: white;
                            padding: 8px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                         ">
                    <div style="flex: 1;">
                        <h3 style="
                            margin: 0 0 4px 0;
                            font-size: 20px;
                            font-weight: 700;
                            color: ${isDisabled ? '#64748b' : '#0f172a'};
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">${info.title}</h3>
                        <p style="
                            margin: 0;
                            font-size: 14px;
                            color: ${isDisabled ? '#94a3b8' : '#64748b'};
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">${info.slogan}</p>
                    </div>
                </div>
                <div style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: auto;
                ">
                    ${info.tags.map(tag => `
                        <span style="
                            background: ${isDisabled ? '#e2e8f0' : `linear-gradient(135deg, ${borderColor}15, ${borderColor}25)`};
                            color: ${isDisabled ? '#94a3b8' : borderColor};
                            padding: 6px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 600;
                            border: 1px solid ${isDisabled ? '#cbd5e1' : `${borderColor}40`};
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">${tag}</span>
                    `).join('')}
                </div>
                ${isDisabled ? `
                    <p style="
                        margin: 12px 0 0 0;
                        text-align: center;
                        color: #94a3b8;
                        font-size: 14px;
                        font-weight: 600;
                        padding: 12px;
                        background: #f1f5f9;
                        border-radius: 8px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">Currently Unavailable</p>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Helper for greeting
function getCurrentTimeOfDayGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning!';
    if (hour < 18) return 'Good Afternoon!';
    return 'Good Evening!';
}

// Initialize all store event listeners
function initializeStoreEventListeners(merchantId, storeConfig, storeProducts, globalDataPackages) {
    console.log('Initializing store event listeners...');

    // 🎨 PROFESSIONAL TAB SWITCHING WITH SMOOTH ANIMATIONS
    const switchTab = (targetTab, clickedBtn) => {
        // Remove active from all tabs (desktop and mobile)
        document.querySelectorAll('.modern-nav-tab, .store-nav-tab-btn, .mobile-nav-btn').forEach(b => {
            b.classList.remove('active');
            if (b.classList.contains('modern-nav-tab') || b.classList.contains('store-nav-tab-btn')) {
                b.style.background = 'transparent';
                b.style.color = 'rgba(255,255,255,0.8)';
                b.style.borderBottom = '3px solid transparent';
            }
            if (b.classList.contains('mobile-nav-btn')) {
                b.style.color = '#94a3b8';
                const indicator = b.querySelector('.nav-indicator');
                if (indicator) indicator.style.width = '0';
                const icon = b.querySelector('i');
                if (icon) icon.style.transform = 'scale(1)';
            }
        });

        // Hide all content panes with fade out
        document.querySelectorAll('.tab-content-pane').forEach(pane => {
            pane.style.opacity = '0';
            pane.style.transform = 'translateY(20px)';
            setTimeout(() => pane.classList.remove('active'), 150);
        });

        // Activate clicked button
        clickedBtn.classList.add('active');
        if (clickedBtn.classList.contains('modern-nav-tab') || clickedBtn.classList.contains('store-nav-tab-btn')) {
            clickedBtn.style.background = 'rgba(255,255,255,0.15)';
            clickedBtn.style.color = 'white';
            clickedBtn.style.borderBottom = '3px solid white';
        }
        if (clickedBtn.classList.contains('mobile-nav-btn')) {
            const primaryColor = storeConfig.primaryColor || '#667eea';
            clickedBtn.style.color = primaryColor;
            const indicator = clickedBtn.querySelector('.nav-indicator');
            if (indicator) indicator.style.width = '40px';
            const icon = clickedBtn.querySelector('i');
            if (icon) icon.style.transform = 'scale(1.1)';
        }

        // Show target pane with fade in
        setTimeout(() => {
            const targetPane = document.getElementById(`${targetTab}-tab-content`);
            if (targetPane) {
                targetPane.classList.add('active');
                targetPane.style.opacity = '0';
                targetPane.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    targetPane.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    targetPane.style.opacity = '1';
                    targetPane.style.transform = 'translateY(0)';
                }, 50);
            }
        }, 150);

        // Haptic feedback for mobile
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    // Desktop tabs
    document.querySelectorAll('.modern-nav-tab, .store-nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab, this);
        });
    });

    // Mobile bottom navigation
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab, this);
        });
    });

    // Network card clicks
    let selectedStorePackage = null;
    const storeModal = document.getElementById('storePackageModal');
    const closeModalBtn = document.getElementById('closeStoreModal');
    const packagesList = document.getElementById('packagesList');
    const storePhoneInput = document.getElementById('storePhoneInput');
    const storeEmailInput = document.getElementById('storeEmailInput');
    const storeProceedBtn = document.getElementById('storeProceedBtn');
    const selectedPackageInfo = document.getElementById('selectedPackageInfo');
    const selectedPackageName = document.getElementById('selectedPackageName');
    const selectedPackagePrice = document.getElementById('selectedPackagePrice');
    const modalNetworkLogo = document.getElementById('modalNetworkLogo');
    const modalNetworkTitle = document.getElementById('modalNetworkTitle');
    const modalNetworkSubtitle = document.getElementById('modalNetworkSubtitle');

    const networkLogos = {
        mtn: NETWORK_LOGOS.mtn,
        telecel: NETWORK_LOGOS.telecel,
        at: NETWORK_LOGOS.at
    };

    const networkNames = {
        mtn: 'MTN',
        telecel: 'Telecel',
        at: 'AirtelTigo'
    };

    document.querySelectorAll('.network-plan-card').forEach(card => {
        card.addEventListener('click', function() {
            if (this.classList.contains('disabled-card')) {
                alert("Products for this network are currently unavailable.");
                return;
            }
            const network = this.dataset.network;

            // Get packages for this network
            const networkPackages = storeProducts.filter(p => p.network.toLowerCase() === network && p.isActive);

            // Update modal header
            modalNetworkLogo.src = storeConfig[`${network}LogoUrl`] || networkLogos[network];
            modalNetworkTitle.textContent = `${networkNames[network]} Data Bundles`;
            modalNetworkSubtitle.textContent = `${networkPackages.length} packages available`;

            // Render packages as professional cards
            packagesList.innerHTML = networkPackages.map((pkg, idx) => `
                <div class="package-option" data-package='${JSON.stringify(pkg).replace(/'/g, "&apos;")}' style="
                    background: white;
                    border: 3px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    animation: slideIn 0.3s ease-out ${idx * 0.05}s backwards;
                ">
                    <div style="
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        width: 24px;
                        height: 24px;
                        border: 3px solid #e2e8f0;
                        border-radius: 50%;
                        transition: all 0.3s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    " class="package-radio">
                        <div style="
                            width: 12px;
                            height: 12px;
                            border-radius: 50%;
                            background: ${storeConfig.primaryColor || '#667eea'};
                            transform: scale(0);
                            transition: transform 0.3s;
                        " class="package-radio-dot"></div>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
                        <div style="
                            width: 56px;
                            height: 56px;
                            background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'}15, ${storeConfig.secondaryColor || '#764ba2'}25);
                            border-radius: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                            border: 2px solid ${storeConfig.primaryColor || '#667eea'}20;
                        ">
                            <i class="fas fa-wifi" style="font-size: 24px; color: ${storeConfig.primaryColor || '#667eea'};"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="
                                font-weight: 700;
                                font-size: 18px;
                                color: #0f172a;
                                margin-bottom: 6px;
                                line-height: 1.2;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            ">${pkg.name}</div>
                            <div style="
                                font-size: 13px;
                                color: #64748b;
                                line-height: 1.4;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            ">${pkg.description || 'High-speed data bundle'}</div>
                        </div>
                    </div>
                    <div style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding-top: 16px;
                        border-top: 2px dashed #e2e8f0;
                    ">
                        <div>
                            <div style="
                                font-size: 11px;
                                color: #94a3b8;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                font-weight: 600;
                                margin-bottom: 4px;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            ">Price</div>
                            <div style="
                                font-size: 28px;
                                font-weight: 800;
                                background: linear-gradient(135deg, ${storeConfig.primaryColor || '#667eea'}, ${storeConfig.secondaryColor || '#764ba2'});
                                -webkit-background-clip: text;
                                -webkit-text-fill-color: transparent;
                                background-clip: text;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            ">GHS ${pkg.sellingPrice.toFixed(2)}</div>
                        </div>
                        <div style="
                            padding: 8px 16px;
                            background: ${storeConfig.primaryColor || '#667eea'}10;
                            border: 2px solid ${storeConfig.primaryColor || '#667eea'}30;
                            border-radius: 8px;
                            font-size: 12px;
                            font-weight: 700;
                            color: ${storeConfig.primaryColor || '#667eea'};
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">
                            <i class="fas fa-bolt" style="margin-right: 4px;"></i>
                            ${pkg.validity || 'Fast Delivery'}
                        </div>
                    </div>
                </div>
            `).join('');

            // Reset form
            storePhoneInput.value = '';
            storeEmailInput.value = '';
            selectedStorePackage = null;
            selectedPackageInfo.style.display = 'none';
            storeProceedBtn.disabled = true;

            // Open modal
            storeModal.style.display = 'flex';

            // Add package selection listeners
            document.querySelectorAll('.package-option').forEach(option => {
                option.addEventListener('click', function() {
                    // Remove selected from all
                    document.querySelectorAll('.package-option').forEach(o => o.classList.remove('selected'));

                    // Add selected to clicked
                    this.classList.add('selected');

                    // Store selected package
                    selectedStorePackage = JSON.parse(this.dataset.package);

                    // Update selected package info
                    selectedPackageName.textContent = selectedStorePackage.name;
                    selectedPackagePrice.textContent = `GHS ${selectedStorePackage.sellingPrice.toFixed(2)}`;
                    selectedPackageInfo.style.display = 'block';

                    // Check if can enable proceed button
                    checkStoreProceedButton();
                });
            });
        });
    });

    // Add hover effects to network cards
    document.querySelectorAll('.network-plan-card').forEach(card => {
        const isDisabled = card.classList.contains('disabled-card') || !card.dataset.network;

        if (!isDisabled) {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
                this.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
            });

            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            });
        }
    });

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        storeModal.style.display = 'none';
    });

    // Click outside to close
    storeModal.addEventListener('click', (e) => {
        if (e.target === storeModal) {
            storeModal.style.display = 'none';
        }
    });

    // Check proceed button state
    function checkStoreProceedButton() {
        const hasPackage = selectedStorePackage !== null;
        const hasPhone = storePhoneInput.value.trim().match(/^0\d{9}$/);
        storeProceedBtn.disabled = !(hasPackage && hasPhone);
    }

    storePhoneInput.addEventListener('input', checkStoreProceedButton);
    storeEmailInput.addEventListener('input', checkStoreProceedButton);

    // Proceed to payment
    storeProceedBtn.addEventListener('click', async () => {
        if (!selectedStorePackage) {
            alert('Please select a package');
            return;
        }

        const phone = storePhoneInput.value.trim();
        if (!phone.match(/^0\d{9}$/)) {
            alert('Please enter a valid phone number (10 digits starting with 0)');
            return;
        }

        const email = storeEmailInput.value.trim() || null;

        storeProceedBtn.disabled = true;
        storeProceedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            // Create merchant data object
            const merchantData = {
                uid: merchantId,
                storeConfig: storeConfig
            };

            // Initiate Paystack popup payment
            await initiateStorePaystackPopup(selectedStorePackage, merchantData, phone, email);

            // Close modal after successful initiation
            storeModal.style.display = 'none';
        } catch (error) {
            console.error('Error initiating payment:', error);
            alert('Failed to initiate payment. Please try again.');
        } finally {
            storeProceedBtn.disabled = false;
            storeProceedBtn.innerHTML = '<i class="fas fa-lock"></i> Proceed to Payment';
        }
    });

    // Share button
    const shareBtn = document.getElementById('shareWithFriendsBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareText = `Check out this awesome data store: ${window.location.href}`;
            if (navigator.share) {
                navigator.share({
                    title: storeConfig.storeName,
                    text: shareText,
                    url: window.location.href,
                }).catch(console.error);
            } else {
                prompt("Share this link with your friends:", window.location.href);
            }
        });
    }

    // WhatsApp button
    const whatsappBtn = document.getElementById('joinWhatsappGroupBtn');
    if (buyDataSubmitBtn) {
        buyDataSubmitBtn.addEventListener('click', async () => {
            // Validate all fields before proceeding
            const network = buyDataNetworkSelect?.value;
            const packageId = buyDataPackageSelect?.value;
            const phoneNumber = buyDataPhoneNumber.value.trim();

            if (!network) {
                showToast('Error', 'Please select a network', 'error');
                buyDataSubmitBtn.disabled = false;
                buyDataSubmitBtn.innerHTML = 'Buy Now';
                return;
            }
            if (!packageId || !selectedPackageData) {
                showToast('Error', 'Please select a package', 'error');
                buyDataSubmitBtn.disabled = false;
                buyDataSubmitBtn.innerHTML = 'Buy Now';
                return;
            }
            if (!phoneNumber.match(/^0\d{9}$/)) {
                showToast('Error', 'Please enter a valid phone number', 'error');
                buyDataSubmitBtn.disabled = false;
                buyDataSubmitBtn.innerHTML = 'Buy Now';
                return;
            }

            // Keep phone number in 0XXXXXXXXX format (no conversion to 233)
            const formattedPhone = phoneNumber; // Keep as 0XXXXXXXXX

            // Check balance before purchase
            if (!currentUserData || currentUserData.balance < selectedPackageData.price) {
                showToast('Error', `Insufficient balance. Need ${formatCurrencyGHS(selectedPackageData.price)}. Please top up.`, 4000, true);
                buyDataSubmitBtn.disabled = false;
                buyDataSubmitBtn.innerHTML = 'Buy Now';
                return;
            }

            // Show loading spinner on button
            buyDataSubmitBtn.disabled = true;
            buyDataSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            // Prepare order data
            const orderData = {
                phone: formattedPhone,
                packageValue: selectedPackageData.id,
                packageText: selectedPackageData.name || selectedPackageData.dataSize,
                price: selectedPackageData.price,
                network: selectedPackageData.network,
                dataSize: selectedPackageData.dataSize,
                minutes: selectedPackageData.minutes,
                name: selectedPackageData.name || selectedPackageData.dataSize,
                recipientPhone: formattedPhone,
                description: `${selectedPackageData.name || selectedPackageData.dataSize} for ${formattedPhone}`
            };
            const orderType = selectedPackageData.network === 'afa_mins' ? 'afa_mins' : 'data_bundle';

            let purchaseSuccess = false;
            try {
                // Process order directly
                await addPurchaseToFirestore(orderData, orderType);

                // Deduct balance
                const newBalance = currentUserData.balance - selectedPackageData.price;
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    balance: newBalance
                });
                currentUserData.balance = newBalance;
                updateAllWalletBalanceDisplays();

                purchaseSuccess = true;
            } catch (error) {
                console.error('Order processing error:', error);
                showToast('Error', 'Failed to process order. Please try again.', 4000, true);
            }

            // Only close modal and show success if purchase succeeded
            if (purchaseSuccess) {
                closeModal(buyDataModalOverlay);
                showToast('Success', 'Your purchase was successful!', 4000, false);
            }
            // Always reset button
            buyDataSubmitBtn.disabled = false;
            buyDataSubmitBtn.innerHTML = 'Buy Now';

        }); // End buyDataSubmitBtn click handler

        // If you need to call searchStoreOrders, do it in a separate handler, not inside buyDataSubmitBtn click

        // Also search on Enter key
        orderSearchPhone.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchOrderBtn.click();
            }
        });
    }
}

// Search store orders by phone number
async function searchStoreOrders(merchantId, phoneNumber) {
    const orderHistoryPlaceholder = document.getElementById('orderHistoryPlaceholder');
    const orderHistoryResults = document.getElementById('orderHistoryResults');
    const orderHistoryTableBody = document.getElementById('orderHistoryTableBody');

    try {
        // Show loading state
        orderHistoryTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #3498db;"></i>
                    <p style="margin-top: 10px;">Searching orders...</p>
                </td>
            </tr>
        `;
        orderHistoryPlaceholder.style.display = 'none';
        orderHistoryResults.style.display = 'block';

        // Format phone number to 233XXXXXXXXX for query
        const formattedPhone = '233' + phoneNumber.substring(1);

        // Query for orders
        const ordersRef = collection(db, 'storeOrders');
        const q1 = query(
            ordersRef,
            where('merchantId', '==', merchantId),
            where('beneficiaryNumber', '==', formattedPhone),
            orderBy('createdAt', 'desc')
        );
        const q2 = query(
            ordersRef,
            where('merchantId', '==', merchantId),
            where('customerPhone', '==', formattedPhone),
            orderBy('createdAt', 'desc')
        );

        const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        // Combine results and remove duplicates
        const allOrders = new Map();
        snapshot1.forEach(doc => allOrders.set(doc.id, { id: doc.id, ...doc.data() }));
        snapshot2.forEach(doc => allOrders.set(doc.id, { id: doc.id, ...doc.data() }));

        const orders = Array.from(allOrders.values()).sort((a, b) =>
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
        );

        if (orders.length === 0) {
            orderHistoryTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 30px;">
                        <i class="fas fa-search-minus" style="font-size: 40px; color: #999;"></i>
                        <p style="margin-top: 10px; color: #666;">No orders found for this phone number.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Display orders
        orderHistoryTableBody.innerHTML = orders.map(order => {
            const date = order.createdAt?.toDate ?
                order.createdAt.toDate().toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';

            const status = order.status || 'pending';
            const statusClass = `order-status-badge ${status.toLowerCase()}`;
            const displayId = order.id.substring(0, 8).toUpperCase();
            const amount = parseFloat(order.sellingPrice || order.amount || 0).toFixed(2);

            return `
                <tr>
                    <td><strong>#${displayId}</strong></td>
                    <td>${order.productName || 'N/A'} <small>(${order.packageSize || ''})</small></td>
                    <td><strong>GH₵${amount}</strong></td>
                    <td><span class="${statusClass}">${status}</span></td>
                    <td>${date}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Error fetching store orders:", error);
        orderHistoryTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 40px;"></i>
                    <p style="margin-top: 10px;">Error loading orders. Please try again.</p>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

// NOTE: Vercel auto-processing endpoint has been disabled.
// Auto-processing configuration now comes from Firestore `siteSettings/config`.
async function fetchAutoProcessingStatus() {
    console.log('Using Firestore `siteSettings.config` for auto-processing configuration (Vercel check disabled).');
    // Leave autoProcessingEnabled as-is; it will be set when siteSettings snapshot arrives.
    return;
}

async function initializeSiteSettings() {
    // Auto-processing status is read from Firestore siteSettings/config (no Vercel dependency)

    const settingsDocRef = doc(db, "siteSettings", "config");
    onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const newSettings = docSnap.data();
            siteSettings = { ...siteSettings, ...newSettings };
            // Ensure we drive auto-processing from Firestore config
            autoProcessingEnabled = !!siteSettings.autoProcessingEnabled;
            // flags for direct provider usage
            siteSettings.directOrderProcessingEnabled = !!siteSettings.directOrderProcessingEnabled;
            siteSettings.externalProviderApiKey = siteSettings.externalProviderApiKey || siteSettings.datafyApiToken || '';
            siteSettings.externalProviderUrl = siteSettings.externalProviderUrl || 'https://api.datafyhub.com/api/v1/placeOrder';
            if(siteSettings.afaFee === undefined) siteSettings.afaFee = 5.00;

            if (!siteSettings.paystackPublicKey || !siteSettings.paystackSecretKey) {
                console.warn("Paystack keys not found in Firestore (siteSettings/config). Paystack payments will fail.");
            }
            if (!siteSettings.bulkSmsApiKey || !siteSettings.bulkSmsSenderId) {
                console.warn("Bulk SMS API Key or Sender ID not configured in siteSettings (siteSettings/config). SMS notifications will not be sent.");
            }


            DOMElements.maintenanceOverlay.style.display = siteSettings.maintenanceModeEnabled ? 'flex' : 'none';
            if (siteSettings.maintenanceModeEnabled) {
                // Redirect to auth page if maintenance mode is enabled
                if (window.location.pathname !== '/auth.html') {
                    window.location.href = '/auth';
                }
                return; // Stop further processing if in maintenance
            }
            
            // Update AFA fee display and in package data if it exists
            if (DOMElements.afaFeeDisplay) DOMElements.afaFeeDisplay.textContent = siteSettings.afaFee ? siteSettings.afaFee.toFixed(2) : '0.00';
            if (networkPackages.afa && networkPackages.afa.length > 0 && networkPackages.afa[0].id === 'afa_reg_1') {
                networkPackages.afa[0].customerPrice = siteSettings.afaFee;
                networkPackages.afa[0].agentPrice = siteSettings.afaFee;
            }

            // Populate admin provider controls if present (paneladmin.html)
            try {
                const providerTokenEl = document.getElementById('providerTokenInputAdmin');
                const providerUrlEl = document.getElementById('providerUrlInputAdmin');
                const providerToggleEl = document.getElementById('providerDirectToggleAdmin');
                const providerStatusEl = document.getElementById('providerConfigStatusAdmin');
                const saveProviderBtn = document.getElementById('saveProviderConfigBtnAdmin');

                if (providerTokenEl) providerTokenEl.value = siteSettings.externalProviderApiKey || siteSettings.datafyApiToken || '';
                if (providerUrlEl) providerUrlEl.value = siteSettings.externalProviderUrl || 'https://api.datafyhub.com/api/v1/placeOrder';
                if (providerToggleEl) providerToggleEl.checked = !!siteSettings.directOrderProcessingEnabled;
                if (providerStatusEl) providerStatusEl.textContent = 'Status: Saved';

                if (saveProviderBtn && !saveProviderBtn.__providerHooked) {
                    saveProviderBtn.__providerHooked = true;
                    saveProviderBtn.addEventListener('click', async function () {
                        const token = providerTokenEl ? providerTokenEl.value.trim() : '';
                        const url = providerUrlEl ? providerUrlEl.value.trim() : '';
                        const enabled = providerToggleEl ? !!providerToggleEl.checked : false;
                        this.classList.add('loading');
                        const spinner = this.querySelector('.spinner'); if (spinner) spinner.style.display = 'inline-block';
                        try {
                            const settingsRef = doc(db, 'siteSettings', 'config');
                            await updateDoc(settingsRef, {
                                externalProviderApiKey: token || '',
                                externalProviderUrl: url || 'https://api.datafyhub.com/api/v1/placeOrder',
                                directOrderProcessingEnabled: enabled
                            });
                            if (providerStatusEl) providerStatusEl.textContent = 'Status: Saved';
                            showToast('Success', 'Provider configuration saved.', 2500);
                        } catch (err) {
                            console.error('Failed to save provider config:', err);
                            if (providerStatusEl) providerStatusEl.textContent = 'Status: Save failed';
                            showToast('Error', 'Failed to save provider configuration.', 3500, true);
                        } finally {
                            this.classList.remove('loading');
                            if (spinner) spinner.style.display = 'none';
                        }
                    });
                }
            } catch (e) {
                console.warn('Provider admin controls not present on this page.', e);
            }

            if (siteSettings.siteNotificationActive && siteSettings.siteNotificationMessage) {
                addSystemNotification(
                    siteSettings.siteNotificationTitle || "System Alert",
                    siteSettings.siteNotificationMessage,
                    'system_alert',
                    siteSettings.siteNotificationAttribution || "Admin"
                );
            }

        } else {
            console.warn("Site settings document not found in Firestore. Using defaults. Paystack & SMS payments will fail without keys.");
            siteSettings.afaFee = 5.00;
            DOMElements.maintenanceOverlay.style.display = 'none';
            handleAuthStateChange(auth.currentUser);
        }
        // Proceed with auth state check only if not in maintenance
        if (!siteSettings.maintenanceModeEnabled) {
             handleAuthStateChange(auth.currentUser);
        }
    }, (error) => {
        console.error("Error fetching site settings: ", error);
        showToast("Error", "Could not load site configuration.", 3000, true);
        siteSettings.afaFee = 5.00;
        DOMElements.maintenanceOverlay.style.display = 'none';
        handleAuthStateChange(auth.currentUser);
    });
}

async function fetchUserData(userId) {
    if (!userId) return null;
    try {
        const userDocRef = doc(db, "users", userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            let data = { id: docSnap.id, ...docSnap.data() };
            let updatesNeeded = {};

            if (data.status === undefined) {
                data.status = 'active';
                updatesNeeded.status = 'active';
            }
            // MODIFIED: Role check for agent - Check multiple approval fields
            const isAgentApproved = data.isAgentApproved === true ||
                                   data.isApproved === true ||
                                   data.isGoldenActivated === true ||
                                   data.goldenTicketStatus === 'activated';

            // Normalize role to lowercase for consistent checking
            const normalizedRole = (data.role || 'customer').toLowerCase();

            if (normalizedRole === 'agent' && !isAgentApproved) {
                // Agent but not approved - revert to customer
                data.role = 'customer';
                updatesNeeded.role = 'customer';
                console.log(`User ${userId} was an Agent but not approved, changed to customer.`);
                addSystemNotification("Role Update", "Your account role has been updated to Customer. Your agent application is pending.", "system_alert", "Admin", userId);
            } else if (normalizedRole === 'agent' && isAgentApproved) {
                // Agent role is valid and approved - ensure consistent case
                data.role = 'agent';
                console.log(`✅ User ${userId} is an approved agent.`);
            } else if (!data.role || normalizedRole === 'customer') {
                // Default role is customer
                data.role = 'customer';
                if (!data.role) updatesNeeded.role = 'customer';
            }

            
            if (data.referralCode === undefined) {
                data.referralCode = generateUserReferralCode(userId);
                updatesNeeded.referralCode = data.referralCode;
            }
            if (data.commissionBalance === undefined) {
                data.commissionBalance = 0;
                updatesNeeded.commissionBalance = 0;
            }
            if (data.totalReferralsRegistered === undefined) {
                data.totalReferralsRegistered = 0;
                updatesNeeded.totalReferralsRegistered = 0;
            }
            if (data.totalReferralsPurchased === undefined) {
                data.totalReferralsPurchased = 0;
                updatesNeeded.totalReferralsPurchased = 0;
            }
            if (data.totalCommissionPaidOut === undefined) {
                data.totalCommissionPaidOut = 0;
                updatesNeeded.totalCommissionPaidOut = 0;
            }
            if (data.hasMadeFirstPurchaseAsReferred === undefined) {
                data.hasMadeFirstPurchaseAsReferred = false;
                updatesNeeded.hasMadeFirstPurchaseAsReferred = false;
            }
            if (data.apiAccessEnabled === undefined) {
                data.apiAccessEnabled = false;
                updatesNeeded.apiAccessEnabled = false;
            }
             if (data.apiKey === undefined) {
                data.apiKey = null;
                updatesNeeded.apiKey = null;
            }
            if (data.apiKeyGeneratedAt === undefined) {
                data.apiKeyGeneratedAt = null;
                updatesNeeded.apiKeyGeneratedAt = null;
            }
            if (data.whatsappNumber === undefined) {
                data.whatsappNumber = data.mobile || null;
                updatesNeeded.whatsappNumber = data.whatsappNumber;
            }
            if (data.whatsappConfirmed === undefined) {
                data.whatsappConfirmed = false;
                updatesNeeded.whatsappConfirmed = false;
            }
            // NEW: Add isAgentApproved flag if it doesn't exist
            if (data.isAgentApproved === undefined) {
                data.isAgentApproved = false;
                updatesNeeded.isAgentApproved = false;
            }
            // NEW: Add store related fields
            if (data.storeConfig === undefined) {
                data.storeConfig = null;
                updatesNeeded.storeConfig = null;
            }
            if (data.storeProducts === undefined) {
                data.storeProducts = []; // Array of product IDs/configs
                updatesNeeded.storeProducts = [];
            }
            if (data.storeMetrics === undefined) {
                data.storeMetrics = {
                    totalOrders: 0,
                    pendingOrders: 0,
                    completedOrders: 0,
                    totalRevenue: 0,
                    availableForPayout: 0,
                    totalPayouts: 0,
                    pendingPayouts: 0,
                    totalCustomers: 0,
                    activeCustomers: 0,
                    averageOrderValue: 0,
                };
                updatesNeeded.storeMetrics = data.storeMetrics;
            }


            if (Object.keys(updatesNeeded).length > 0) {
                await updateDoc(userDocRef, updatesNeeded);
            }
            return data;
        } else {
            console.log("No such user document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        showToast("Error", "Could not load user profile. Please try logging in again.", 4000, true);
        return null;
    }
}


async function updateUserFirestoreProfile(userId, dataToUpdate) {
    if (!userId) return;
    try {
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, dataToUpdate);
        if(currentUserData && currentUserData.id === userId) {
            currentUserData = { ...currentUserData, ...dataToUpdate };
            updateProfileDisplay();
            updateAllWalletBalanceDisplays();
            updateUserRoleUI();
            updateProfileStatusDisplays();
            if (DOMElements.apiManagementPageContent.style.display === 'block') {
                showApiManagementPage();
            }
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        showToast("Error", "Failed to update profile.", 3000, true);
    }
}



async function adjustUserBalance(userId, amount) {
    if (!userId || isNaN(parseFloat(amount))) return false;
    const userRef = doc(db, "users", userId);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            console.error("User not found for balance adjustment");
            return false;
        }
        let currentBalance = userDoc.data().balance || 0;
        if (typeof currentBalance === 'string') currentBalance = parseFloat(currentBalance);

        const newBalance = currentBalance + parseFloat(amount);
        if (newBalance < 0 && amount < 0) {
             showToast("Error", "Insufficient balance for this operation.", 3000, true);
             return false;
        }
        await updateDoc(userRef, { balance: newBalance });
        if (currentUser && currentUser.uid === userId && currentUserData) {
            currentUserData.balance = newBalance;
            updateAllWalletBalanceDisplays();
        }
        return true;
    } catch (error) {
        console.error("Error adjusting balance:", error);
        showToast("Error", "Failed to update balance.", 3000, true);
        return false;
    }
}

async function addTopupToUserHistory(userId, amount, status, referenceCode, paymentMethod = 'Mobile Money', paystackFullReference = null) {
    if (!userId) return;
    try {
        const topupData = {
            userId: userId,
            amount: parseFloat(amount),
            status: status,
            referenceCode: referenceCode,
            paymentMethod: paymentMethod,
            createdAt: serverTimestamp(),
            smsSentCompleted: false
        };
        if (paymentMethod === 'Paystack' && paystackFullReference) {
            topupData.paystackReference = paystackFullReference;
        }

        const topupDocRef = await addDoc(collection(db, "topups"), topupData);

        if (status === 'completed') {
            if (paymentMethod !== 'Mobile Money') {
                await adjustUserBalance(userId, parseFloat(amount));
                if (currentUserData && currentUserData.mobile) {
                    const userDocAfterUpdate = await getDoc(doc(db, "users", userId));
                    const latestBalance = userDocAfterUpdate.exists() ? (userDocAfterUpdate.data().balance || 0) : currentUserData.balance;

                    const smsMessage = `gigsplan: Your wallet top-up of ${formatCurrencyGHS(amount)} via ${paymentMethod} was successful! Your new balance is ${formatCurrencyGHS(latestBalance)}. Thank you.`;
                    const smsSent = await sendSmsNotification(currentUserData.mobile, smsMessage);
                    if (smsSent) {
                        await updateDoc(topupDocRef, { smsSentCompleted: true });
                    }
                }
            }
        }
        if (DOMElements.walletPageContent && DOMElements.walletPageContent.style.display === 'block') {
            updateWalletPageDisplays();
        }
        return topupDocRef.id;
    } catch (error) {
        console.error("Error adding topup history:", error);
        showToast("Error", "Failed to record top-up.", 3000, true);
        return null;
    }
}


async function addPurchaseToFirestore(orderData, orderType = "data_bundle") {
    if (!currentUser || !currentUserData) return null;

    // Use separate collection for AFA registrations
    const collectionName = orderType === 'afa_registration' ? 'afaRegistrations' : 'orders';
    const newOrderRef = doc(collection(db, collectionName));
    const generatedDisplayId = generateNumericOrderId();
    const orderPayload = {
        userId: currentUser.uid,
        orderId: newOrderRef.id,
        orderType: orderType,
        description: orderData.description || `${orderData.packageText || orderData.name} for ${orderData.phone}`,
        name: orderData.packageText || orderData.name,
        amount: parseFloat(orderData.price),
        status: 'processing',
        createdAt: serverTimestamp(),
        userEmail: currentUser.email,
        userName: currentUserData.fullName,
        userMobile: currentUserData.mobile,
        displayOrderId: generatedDisplayId,
        smsSentInitiated: false,
        smsSentCompleted: false
    };

    if (orderType === 'afa_registration') {
        orderPayload.network = 'AFA';
        orderPayload.phone = orderData.phone;
        orderPayload.afaFullName = orderData.afaFullName || '';
        orderPayload.afaGhanaCard = orderData.afaGhanaCard || '';
        orderPayload.afaOccupation = orderData.afaOccupation || '';
        orderPayload.afaDateOfBirth = orderData.afaDateOfBirth || '';
    } else if (orderType === 'results_checker') {
        orderPayload.network = orderData.network.toUpperCase();
        orderPayload.checkerType = orderData.network.toUpperCase();
        orderPayload.serialNumber = orderData.serialNumber;
        orderPayload.pin = orderData.pin;
        orderPayload.status = 'completed';
    } else if (orderType === 'mtnjust4u') {
        orderPayload.network = 'MTNJUST4U';
        orderPayload.phone = orderData.recipientPhone;
        orderPayload.dataAmount = orderData.dataAmount || 'N/A';
        orderPayload.callMinutes = orderData.callMinutes || 'N/A';
        orderPayload.smsCount = orderData.smsCount || 'N/A';
        orderPayload.packageId = orderData.packageId;
    } else if (orderType === 'afa_mins') {
        orderPayload.network = 'AFA_MINS';
        orderPayload.phone = orderData.recipientPhone;
        orderPayload.minutes = orderData.minutes || 'N/A';
        orderPayload.packageId = orderData.packageId;
        orderPayload.status = 'initiated';
    }
    else {
        orderPayload.network = orderData.network.toUpperCase();
        orderPayload.phone = orderData.phone;
        orderPayload.dataSize = orderData.dataSize || 'N/A';
        orderPayload.status = 'pending';
    }


    try {
        await setDoc(newOrderRef, orderPayload);

        // REMOVED: DatafyHub API auto-processing (was causing errors)
        // All orders will now stay as "pending" for manual processing in admin panel
        console.log('📋 Order created - will remain PENDING for manual processing');

        /* COMMENTED OUT - External API Auto-Processing (DatafyHub)
        // Check if auto-processing is enabled for data bundles
        console.log('🔍 Order placement check:', {
            orderType: orderType,
            isDataBundle: orderType === 'data_bundle',
            autoProcessingEnabled: autoProcessingEnabled,
            willUseExternalAPI: orderType === 'data_bundle' && autoProcessingEnabled
        });

        // Trigger provider call when direct processing is enabled OR a provider token is configured
        const shouldAttemptProvider = !!siteSettings.directOrderProcessingEnabled || !!siteSettings.externalProviderApiKey || !!siteSettings.datafyApiToken;
        if (orderType === 'data_bundle' && shouldAttemptProvider) {
            try {
            console.log('✅ Attempting provider processing - sending order to provider API...');

            // Mark that we attempted to contact provider (helps debugging when provider isn't reached)
            try { await updateDoc(newOrderRef, { externalApiAttempted: true, externalApiAttemptedAt: serverTimestamp(), externalApiProvider: siteSettings.externalProviderUrl || siteSettings.externalProviderApiUrl || 'unknown' }); } catch(e) { console.warn('Could not mark externalApiAttempted on order:', e); }

                const providerPayload = {
                    network: (orderData.network || '').toLowerCase(),
                    reference: generatedDisplayId,
                    // Keep recipient as the local format entered by user (0XXXXXXXXX)
                    recipient: orderData.phone,
                    capacity: orderData.packageValue || orderData.dataSize
                };

                console.log('📦 Provider payload:', providerPayload);

                const providerUrl = siteSettings.externalProviderUrl || 'https://api.datafyhub.com/api/v1/placeOrder';
                const providerToken = siteSettings.externalProviderApiKey || '';

                const headers = { 'Content-Type': 'application/json' };
                if (providerToken) headers['Authorization'] = `Bearer ${providerToken}`;

                console.log('📡 Provider URL:', providerUrl, 'Using token:', providerToken ? '[REDACTED]' : '[NONE]');

                // If the current user is an admin-like role, show a debug toast so they can see attempts
                try {
                    const isAdminViewer = (currentUserData && (
                        (currentUserData.role && (String(currentUserData.role).toLowerCase().includes('admin') || String(currentUserData.role).toLowerCase().includes('super')))
                        || currentUserData.isAdmin || currentUserData.isSuperAdmin
                    ));
                    if (isAdminViewer) {
                        showToast('Debug', `Attempting provider call to ${providerUrl}`, 5000, false, false, 'fas fa-server');
                    }
                } catch (e) { console.warn('Admin debug toast failed:', e); }

                const response = await fetch(providerUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(providerPayload)
                });

                // Attempt to parse JSON, but be resilient if provider returns text
                let result;
                try { result = await response.json(); } catch (e) { result = { success: response.ok, raw: await response.text() }; }

                if (response.ok && (result.success === true || result.status === 'success' || result.code === 200)) {
                    console.log('Order successfully sent to provider API:', result);
                    try {
                        const isAdminViewer = (currentUserData && (
                            (currentUserData.role && (String(currentUserData.role).toLowerCase().includes('admin') || String(currentUserData.role).toLowerCase().includes('super')))
                            || currentUserData.isAdmin || currentUserData.isSuperAdmin
                        ));
                        if (isAdminViewer) {
                            showToast('Debug', `Provider accepted order ${generatedDisplayId}`, 4000, false, false, 'fas fa-check-circle');
                        }
                    } catch (e) { console.warn('Admin success toast failed:', e); }
                    // Update order status to processing and save provider response
                    await updateDoc(newOrderRef, {
                        status: 'processing',
                        externalApiResponse: result.data || result || null,
                        externalApiSentAt: serverTimestamp(),
                        externalApiRawResponse: result
                    });
                    orderPayload.status = 'processing';

                    // Add an international-formatted phone field for downstream use (233XXXXXXXXX)
                    try {
                        const localPhone = String(orderData.phone || '').trim();
                        if (localPhone.startsWith('0') && localPhone.length === 10) {
                            const intl = `233${localPhone.substring(1)}`;
                            await updateDoc(newOrderRef, { phoneIntl: intl });
                        } else if (!localPhone.startsWith('233') && localPhone.length === 9) {
                            const intl = `233${localPhone}`;
                            await updateDoc(newOrderRef, { phoneIntl: intl });
                        }
                    } catch (e) {
                        console.warn('Failed to set phoneIntl on order:', e);
                    }
                } else {
                    console.error('Provider API error:', result);
                    // Keep as pending for manual processing and record error
                    await updateDoc(newOrderRef, {
                        externalApiError: result?.message || result?.raw || JSON.stringify(result) || 'Failed to send to provider API',
                        externalApiAttemptedAt: serverTimestamp()
                    });
                    try {
                        const isAdminViewer = (currentUserData && (
                            (currentUserData.role && (String(currentUserData.role).toLowerCase().includes('admin') || String(currentUserData.role).toLowerCase().includes('super')))
                            || currentUserData.isAdmin || currentUserData.isSuperAdmin
                        ));
                        if (isAdminViewer) {
                            showToast('Debug', `Provider error: ${result?.message || 'See console / order record'}`, 5000, true);
                        }
                    } catch (e) { console.warn('Admin error toast failed:', e); }
                }
            } catch (apiError) {
                console.error('❌ Error calling provider API:', apiError);
                // Keep as pending for manual processing
                try {
                    await updateDoc(newOrderRef, {
                        externalApiError: apiError.message || String(apiError),
                        externalApiAttemptedAt: serverTimestamp()
                    });
                } catch (e) { console.warn('Could not write externalApiError to order:', e); }
            }
        } else {
            if (orderType === 'data_bundle') {
                console.log('⚠️ Direct provider processing DISABLED - order will stay as PENDING for manual processing');
            }
        }
        END COMMENTED OUT SECTION */

        const successMessage = `Order ${generatedDisplayId} for ${orderPayload.name} is processing.`;

        if (orderType === 'afa_registration') {
             showOrderSuccessModal("AFA Registration Submitted!", successMessage + " Check history for details.", "general", generatedDisplayId);
        } else if (orderType === 'results_checker') {
            showOrderSuccessModal(
                `${orderPayload.network} PIN Purchased!`,
                `Serial: ${orderPayload.serialNumber}\nPIN: ${orderPayload.pin}\nThis information has also been recorded in your order history.`,
                "results_checker_success",
                generatedDisplayId
            );
        } else if (orderType === 'mtnjust4u' || orderType === 'afa_mins' || orderType === 'data_bundle') {
            showOrderSuccessModal("Order Placed!", `Your order for ${orderPayload.name} to ${orderPayload.phone} is processing. It will be delivered shortly.`, "general", generatedDisplayId);
        }


        updateDashboardStats();
        if (DOMElements.historyPageContent && DOMElements.historyPageContent.style.display === 'block') renderOrderHistoryTable();
        if (orderType === 'afa_registration' && DOMElements.afaRegistrationPageContent && DOMElements.afaRegistrationPageContent.style.display === 'block') {
            renderAfaOrderHistoryTable();
        }
        if ((orderType === 'data_bundle' || orderType === 'mtnjust4u' || orderType === 'afa_mins') && DOMElements.packagesPageContent && DOMElements.packagesPageContent.style.display === 'block') {
            const activeTab = DOMElements.packagesPageContent.querySelector('.tab-button.active');
            const currentNetwork = activeTab ? activeTab.dataset.network : 'mtn';
            renderDataPackages(currentNetwork);
        }
        if (orderType === 'results_checker' && DOMElements.resultsCheckerPageContent.style.display === 'block') {
            fetchResultsCheckerItems();
            updateResultsCheckerPrice(DOMElements.resultsCheckerTypeSelect.value);
        }


        return orderPayload;
    } catch (error) {
        console.error("Error adding purchase to Firestore:", error);
        showToast("Error", "Order placement failed. Please try again.", 4000, true);
        return null;
    }
}


async function fetchDataPackages() {
    const networksToFetch = ['mtn', 'telecel', 'at', 'afa_mins'];
    networkPackages = { mtn: [], telecel: [], at: [], afa: [], afa_mins: [] };
    try {
        for (const net of networksToFetch) {
            const packagesColRef = collection(db, `dataPackages/${net}/packages`);
            const q = query(packagesColRef, where("isActive", "==", true), orderBy("customerPrice"));
            const querySnapshot = await getDocs(q);
            const pkgs = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const customerPrice = parseFloat(data.customerPrice || 0);
                const agentPrice = parseFloat(data.agentPrice || 0);

                pkgs.push({
                    id: docSnap.id,
                    ...data,
                    customerPrice: customerPrice,
                    agentPrice: agentPrice,
                    network: net
                });
            });
            networkPackages[net] = pkgs;
        }

        networkPackages.afa = [{
            id: 'afa_reg_1', name: 'AFA Standard Registration', value: '1',
            customerPrice: parseFloat(siteSettings.afaFee || 5.00),
            agentPrice: parseFloat(siteSettings.afaFee || 5.00),
            dataSize: 'Standard Registration', isActive: true, network: 'AFA'
        }];

        console.log("Fetched all packages:", networkPackages);

        if (DOMElements.packagesPageContent && DOMElements.packagesPageContent.style.display === 'block') {
            const activeTab = DOMElements.packagesPageContent.querySelector('.tab-button.active');
            const defaultNetwork = activeTab ? activeTab.dataset.network : 'mtn';
            renderDataPackages(defaultNetwork);
        }

    } catch (error) {
        console.error("Error fetching network packages:", error);
        showToast("Error", "Could not load data packages.", 3000, true);
    }
}


function hideAllMainContentAreas() {
    const storeSetupPage = document.getElementById('storeSetupPageContent');
    const storeOrdersPage = document.getElementById('storeOrdersPageContent');
    const storeCustomersPage = document.getElementById('storeCustomersPageContent');
    const addProductPage = document.getElementById('addProductPageContent');
    const viewProductsPage = document.getElementById('viewProductsPageContent');
    const payoutPage = document.getElementById('payoutPageContent');

    [DOMElements.mainDashboardPageContent, DOMElements.profileSettingsPageContent,
     DOMElements.afaRegistrationPageContent,
     DOMElements.historyPageContent, DOMElements.walletPageContent,
     DOMElements.resultsCheckerPageContent,
     DOMElements.apiManagementPageContent,
     DOMElements.packagesPageContent,
     storeSetupPage, storeOrdersPage, storeCustomersPage, addProductPage, viewProductsPage, payoutPage
    ].forEach(page => { if (page) page.style.display = 'none'; });
}

function setActiveSidebarLink(targetPage) {
    document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
    if (DOMElements.walletMenuLink) DOMElements.walletMenuLink.classList.remove('active');

    const linkToActivate = document.querySelector(`.sidebar-nav a[data-page="${targetPage}"]`);
    if (linkToActivate) {
        linkToActivate.classList.add('active');
        const parentLi = linkToActivate.closest('li.has-submenu');
        if (parentLi) {
            parentLi.classList.add('open');
            if(parentLi.querySelector('a')) parentLi.querySelector('a').classList.add('active');
        }
    }
}


function navigateToPage(pageKey, pageShowFunction, pageTitle, initialLoad = false) {
    startLoadingAnimation();
    hideAllMainContentAreas();
    if (typeof pageShowFunction === 'function') {
        pageShowFunction(initialLoad);
    } else {
        console.error("Error: pageShowFunction is not a function for pageKey:", pageKey);
    }
    if (DOMElements.headerAppTitle) DOMElements.headerAppTitle.textContent = pageTitle || "Dashboard";
    setActiveSidebarLink(pageKey);
    closeSidePanels();
    setTimeout(finishLoadingAnimation, 300);
}

function showAppDashboard(initialLoad = false) {
    if(DOMElements.mainDashboardPageContent) DOMElements.mainDashboardPageContent.style.display = 'block';
    loadDashboardContent();
    if(initialLoad) applyStaggeredSidebarAnimation();
}

 function showProfileSettings() {
    if(DOMElements.profileSettingsPageContent) DOMElements.profileSettingsPageContent.style.display = 'block';
    updateProfileDisplay();
    updateProfileStatusDisplays();
    if(DOMElements.profileViewMode) DOMElements.profileViewMode.style.display = 'block';
    if(DOMElements.profileEditMode) DOMElements.profileEditMode.style.display = 'none';
    applyItemFadeUpAnimation(DOMElements.profileSettingsPageContent);
}

function showAfaRegistrationPage() {
    if(DOMElements.afaRegistrationPageContent) DOMElements.afaRegistrationPageContent.style.display = 'block';
    renderAfaOrderHistoryTable();
    if(DOMElements.afaRegistrationPageContent) applyItemFadeUpAnimation(DOMElements.afaRegistrationPageContent);
}

function showHistoryPage() {
    if(DOMElements.historyPageContent) DOMElements.historyPageContent.style.display = 'block';
    renderOrderHistoryTable();
    updateHistorySummaryCards();
    if(DOMElements.historyPageContent) applyItemFadeUpAnimation(DOMElements.historyPageContent, 0.1, 0.05);
}

function showWalletPage() {
    if(DOMElements.walletPageContent) DOMElements.walletPageContent.style.display = 'block';
    updateWalletPageDisplays();
    if(DOMElements.walletPageContent) applyItemFadeUpAnimation(DOMElements.walletPageContent);
}


function showResultsCheckerPage() {
    if (DOMElements.resultsCheckerPageContent) DOMElements.resultsCheckerPageContent.style.display = 'block';
    if (DOMElements.resultsCheckerTypeSelect) DOMElements.resultsCheckerTypeSelect.value = "";
    if (DOMElements.resultsCheckerPriceInfo) DOMElements.resultsCheckerPriceInfo.style.display = 'none';
    if (DOMElements.purchaseCheckerSerialBtn) DOMElements.purchaseCheckerSerialBtn.disabled = true;
    fetchResultsCheckerItems();
    applyItemFadeUpAnimation(DOMElements.resultsCheckerPageContent);
}


function showApiManagementPage() {
    if(DOMElements.apiManagementPageContent) DOMElements.apiManagementPageContent.style.display = 'block';

    if (!currentUserData) {
        DOMElements.apiAccessDisabledBlock.style.display = 'block';
        DOMElements.apiReadyBlock.style.display = 'none';
        DOMElements.apiKeySection.style.display = 'none';
        showToast("Error", "User data not loaded for API Management.", 3000, true);
        return;
    }

    if (!currentUserData.apiAccessEnabled) {
        DOMElements.apiAccessDisabledBlock.style.display = 'block';
        DOMElements.apiReadyBlock.style.display = 'none';
        DOMElements.apiKeySection.style.display = 'none';
    } else {
        DOMElements.apiAccessDisabledBlock.style.display = 'none';
        DOMElements.apiReadyBlock.style.display = 'block';
        DOMElements.apiKeySection.style.display = 'block';

        // Fetch API key from backend
        fetch('https://apiv1-nine.vercel.app/api/generate-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid, fetchOnly: true })
        })
        .then(res => res.json())
        .then(data => {
            if (data.apiKey) {
                DOMElements.apiKeyNotGenerated.style.display = 'none';
                DOMElements.apiKeyGenerated.style.display = 'block';
                if (DOMElements.userApiKeyDisplay) {
                    DOMElements.userApiKeyDisplay.value = data.apiKey;
                    DOMElements.userApiKeyDisplay.type = "password";
                }
                if (DOMElements.apiViewToggleBtn) {
                    DOMElements.apiViewToggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
                    DOMElements.apiViewToggleBtn.setAttribute('data-password-visible', 'false');
                }
                if (DOMElements.apiKeyGeneratedDate && data.generatedAt) {
                    const date = new Date(data.generatedAt);
                    DOMElements.apiKeyGeneratedDate.textContent = `Generated: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                } else {
                    DOMElements.apiKeyGeneratedDate.textContent = "Generated: N/A";
                }
            } else {
                DOMElements.apiKeyNotGenerated.style.display = 'block';
                DOMElements.apiKeyGenerated.style.display = 'none';
                if (DOMElements.apiKeyDisabledMessage) DOMElements.apiKeyDisabledMessage.style.display = 'none';
            }
        })
        .catch(() => {
            DOMElements.apiKeyNotGenerated.style.display = 'block';
            DOMElements.apiKeyGenerated.style.display = 'none';
        });

        // Fetch usage stats
        fetch(`https://apiv1-nine.vercel.app/api/usage-stats?userId=${encodeURIComponent(currentUser.uid)}`)
        .then(res => res.json())
        .then(stats => {
            DOMElements.statTotalRequests.textContent = stats.total || 0;
            DOMElements.statTodayRequests.textContent = stats.today || 0;
            DOMElements.statThisHourRequests.textContent = (stats.hour || 0) + '/100';
        });
    }
    applyItemFadeUpAnimation(DOMElements.apiManagementPageContent);
}

// --- API Key Management Event Listeners ---
if (DOMElements.generateApiKeyBtn) {
    DOMElements.generateApiKeyBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        DOMElements.generateApiKeyBtn.disabled = true;
        try {
            const res = await fetch('https://apiv1-nine.vercel.app/api/generate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid })
            });
            const data = await res.json();
            if (data.apiKey) {
                showToast('API Key Generated', 'Your API key was generated successfully.', 3000);
                showApiManagementPage();
            } else {
                showToast('Error', data.error || 'Failed to generate API key.', 3000, true);
            }
        } catch (e) {
            showToast('Error', 'Failed to generate API key.', 3000, true);
        }
        DOMElements.generateApiKeyBtn.disabled = false;
    });
}

if (DOMElements.regenerateApiKeyBtn) {
    DOMElements.regenerateApiKeyBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        DOMElements.regenerateApiKeyBtn.disabled = true;
        try {
            const res = await fetch('https://apiv1-nine.vercel.app/api/generate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid })
            });
            const data = await res.json();
            if (data.apiKey) {
                showToast('API Key Regenerated', 'Your API key was regenerated successfully.', 3000);
                showApiManagementPage();
            } else {
                showToast('Error', data.error || 'Failed to regenerate API key.', 3000, true);
            }
        } catch (e) {
            showToast('Error', 'Failed to regenerate API key.', 3000, true);
        }
        DOMElements.regenerateApiKeyBtn.disabled = false;
    });
}

// NEW: Store Setup Page Function
async function showStoreSetupPage() {
    // CRITICAL: Check if store creation is disabled FIRST - before anything else
    // This ensures even users with existing stores see the access denied message
    if (!STORE_CREATION_ENABLED) {
        if (DOMElements.storeSetupPageContent) {
            DOMElements.storeSetupPageContent.style.display = 'block';
            applyItemFadeUpAnimation(DOMElements.storeSetupPageContent);
        const storeAccessImageUrl = 'https://i.postimg.cc/d1rMn5jC/Screenshot-20251116-151253.png';
        DOMElements.storeSetupPageContent.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: 40px 20px; position: relative;">
                <div style="position: relative; margin-bottom: 30px; animation: float 3s ease-in-out infinite;">
                    <img src="${storeAccessImageUrl}" alt="Store Access Denied" style="max-width: 300px; width: 100%; height: auto; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.2));" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="font-size: 64px; display: none;">🔒</div>
                </div>
                <h2 style="color: var(--text-primary); margin-bottom: 12px; font-size: 24px; font-weight: 600;">Store Access Denied</h2>
                <p style="color: var(--text-muted); max-width: 500px; line-height: 1.6; margin-bottom: 20px;">
                    Store creation is currently disabled. Visit our main website for early access.
                </p>
                <a href="https://gigsplan.org" target="_blank" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 500; transition: transform 0.2s; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                    <i class="fas fa-external-link-alt"></i> Visit gigsplan.org for Early Access
                </a>
            </div>
            <style>
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
            </style>
        `;
        }
        return; // Exit immediately - don't process anything else
    }

    // Only reach this point if STORE_CREATION_ENABLED is true
    if (DOMElements.storeSetupPageContent) {
        DOMElements.storeSetupPageContent.style.display = 'block';
        applyItemFadeUpAnimation(DOMElements.storeSetupPageContent);

        // Fetch existing store config or initialize form
        if (currentUserData && currentUserData.storeConfig) {
            const config = currentUserData.storeConfig;
            DOMElements.storeName.value = config.storeName || '';
            DOMElements.storeSlug.value = config.storeSlug || '';

            // Show logo preview if brandLogo exists (base64 or URL)
            if (config.brandLogo && DOMElements.logoPreviewImg && DOMElements.logoPreview) {
                DOMElements.logoPreviewImg.src = config.brandLogo;
                DOMElements.logoPreview.style.display = 'block';
            }

            DOMElements.contactEmail.value = config.contactEmail || '';
            DOMElements.contactPhone.value = config.contactPhone || '';
            DOMElements.storeSlogan.value = config.storeSlogan || '';
            DOMElements.primaryColor.value = config.primaryColor || '#0066FF';
            DOMElements.primaryColorHex.value = config.primaryColor || '#0066FF';
            DOMElements.secondaryColor.value = config.secondaryColor || '#25D366';
            DOMElements.secondaryColorHex.value = config.secondaryColor || '#25D366';
            DOMElements.openingTime.value = config.openingTime || '08:00';
            DOMElements.closingTime.value = config.closingTime || '20:00';

            // Set working days
            document.querySelectorAll('.working-days-selector input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = config.workingDays?.includes(checkbox.value) || false;
            });

            // If store is already set up, show the link display
            DOMElements.setupStep1.style.display = 'none';
            DOMElements.setupStep2.style.display = 'none';
            DOMElements.setupStep3.style.display = 'none';
            DOMElements.storeLinkDisplay.style.display = 'block';
            // Detect base URL dynamically
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            const storeUrl = `${baseUrl}/?merchant=${config.storeSlug}`;
            DOMElements.generatedStoreLink.value = storeUrl;
            DOMElements.visitStoreBtn.href = storeUrl;
        } else {
            // Default to step 1
            DOMElements.setupStep1.style.display = 'block';
            DOMElements.setupStep2.style.display = 'none';
            DOMElements.setupStep3.style.display = 'none';
            DOMElements.storeLinkDisplay.style.display = 'none';
        }
    }
}

// NEW: Store Orders Page Function
async function showStoreOrdersPage() {
    if (DOMElements.storeOrdersPageContent) {
        DOMElements.storeOrdersPageContent.style.display = 'block';
        applyItemFadeUpAnimation(DOMElements.storeOrdersPageContent);
        await renderStoreOrders();
    }
}

// NEW: Store Customers Page Function
async function showStoreCustomersPage() {
    if (DOMElements.storeCustomersPageContent) {
        DOMElements.storeCustomersPageContent.style.display = 'block';
        applyItemFadeUpAnimation(DOMElements.storeCustomersPageContent);
        await renderStoreCustomers();
    }
}

// NEW: Add Product Page Function
async function showAddProductPage() {
    if (DOMElements.addProductPageContent) {
        DOMElements.addProductPageContent.style.display = 'block';
        applyItemFadeUpAnimation(DOMElements.addProductPageContent);
        // Default to MTN tab
        DOMElements.addProductNetworkTabs.querySelectorAll('.product-tab-btn').forEach(btn => {
            if (btn.dataset.network === 'mtn') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        await renderAvailableProducts('mtn');
    }
}

// NEW: View Products Page Function
async function showViewProductsPage() {
    if (DOMElements.viewProductsPageContent) {
        DOMElements.viewProductsPageContent.style.display = 'block';
        applyItemFadeUpAnimation(DOMElements.viewProductsPageContent);
        await renderMyStoreProducts();
    }
}

// NEW: Payout Page Function
async function showPayoutPage() {
    if (DOMElements.payoutPageContent) {
        DOMElements.payoutPageContent.style.display = 'block';
        applyItemFadeUpAnimation(DOMElements.payoutPageContent);
        await renderPayoutPage();
    }
}

function showPackagesPage() {
    if(DOMElements.packagesPageContent) DOMElements.packagesPageContent.style.display = 'block';
    if (DOMElements.packageCategoryTabs) {
        DOMElements.packageCategoryTabs.querySelectorAll('.tab-button').forEach(btn => {
            if (btn.dataset.network === 'mtn') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    renderDataPackages('mtn');
    applyItemFadeUpAnimation(DOMElements.packagesPageContent);
}

function closeSidePanels() {
    if (DOMElements.sidebar && DOMElements.sidebar.classList.contains('open') && window.innerWidth < 768) {
         toggleSidebar(false);
    }
    if (DOMElements.cartSidebar && DOMElements.cartSidebar.classList.contains('open')) {
        toggleCartSidebar(false);
    }
}
function updateProfileDisplay() {
    if (currentUserData) {
        if(DOMElements.profileFullNameDisplay) DOMElements.profileFullNameDisplay.textContent = currentUserData.fullName || 'N/A';
        if(DOMElements.profileEmailDisplay) DOMElements.profileEmailDisplay.textContent = currentUserData.email || 'N/A';
        if(DOMElements.profilePhoneNumberDisplay) DOMElements.profilePhoneNumberDisplay.textContent = currentUserData.mobile || 'N/A';
        if(DOMElements.profileRoleDisplay) DOMElements.profileRoleDisplay.textContent = (currentUserData.role || 'Customer').replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        if(DOMElements.profileEditFullName) DOMElements.profileEditFullName.value = currentUserData.fullName || '';
        if(DOMElements.profileEditEmail) DOMElements.profileEditEmail.value = currentUserData.email || '';
        if(DOMElements.profileEditPhoneNumber) DOMElements.profileEditPhoneNumber.value = currentUserData.mobile || '';
    } else if (currentUser) {
        if(DOMElements.profileEmailDisplay) DOMElements.profileEmailDisplay.textContent = currentUser.email;
    }
}
function updateProfileStatusDisplays() {
    const userStatus = currentUserData?.status || 'active';
    const displayStatus = userStatus.charAt(0).toUpperCase() + userStatus.slice(1);
    if (DOMElements.profileStatusBadge) {
        DOMElements.profileStatusBadge.textContent = displayStatus;
        DOMElements.profileStatusBadge.style.backgroundColor = userStatus === 'deactivated' ? 'var(--danger-color)' : 'var(--primary-green-light)';
    }
}


    function updateUserRoleUI() {
    const role = currentUserData ? currentUserData.role : 'Customer';
    const displayRole = role.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if(DOMElements.userRoleDisplaySidebar) DOMElements.userRoleDisplaySidebar.textContent = displayRole;
    if (DOMElements.profileRoleDisplay) DOMElements.profileRoleDisplay.textContent = displayRole;

    // Show/hide Become an Agent button based on user status
    updateBecomeAgentButtonVisibility();
}

function updateAllWalletBalanceDisplays() {
    const balance = currentUserData ? (currentUserData.balance || 0) : 0;
    const formattedBalance = formatCurrencyGHS(balance);
    if(DOMElements.dashboardWalletBalanceDisplay) DOMElements.dashboardWalletBalanceDisplay.textContent = formattedBalance;
    if (DOMElements.modalCurrentBalance) DOMElements.modalCurrentBalance.textContent = formattedBalance;
    if(DOMElements.confirmPurchaseBalance) DOMElements.confirmPurchaseBalance.textContent = formattedBalance;
}

function listenForOrderStatusChanges(userId) {
    if (ordersSnapshotUnsubscribe) {
        ordersSnapshotUnsubscribe();
    }
    const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", userId)
    );

    ordersSnapshotUnsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
        querySnapshot.docChanges().forEach(async (change) => {
            if (change.type === "modified") {
                const orderData = change.doc.data();
                const orderId = change.doc.id;
                const userMobile = orderData.userMobile || currentUserData?.mobile;

                if (!userMobile) {
                    console.warn(`No mobile number found for user ${orderData.userId} to send SMS for order ${orderId}.`);
                    return;
                }

                let smsMessage = "";
                let shouldSendSms = false;
                let updatePayload = {};
                
                if (orderData.status === 'initiated' && !orderData.smsSentInitiated) {
                    smsMessage = `gigsplan: Your ${orderData.dataSize || orderData.name} ${orderData.network} bundle to ${orderData.phone || 'N/A'} (Order: ${orderData.displayOrderId}) has been initiated and will be delivered shortly. Thank you.`;
                    shouldSendSms = true;
                    updatePayload.smsSentInitiated = true;
                }
                else if (orderData.status === 'completed' && !orderData.smsSentCompleted) {
                    const userDocAfterUpdate = await getDoc(doc(db, "users", userId));
                    const latestBalance = userDocAfterUpdate.exists() ? (userDocAfterUpdate.data().balance || 0) : (currentUserData?.balance || 0);

                    smsMessage = `gigsplan: Your ${orderData.dataSize || orderData.name} ${orderData.network} bundle to ${orderData.phone || 'N/A'} (Order: ${orderData.displayOrderId}) has been delivered successfully! Your new balance is ${formatCurrencyGHS(latestBalance)}. Thank you.`;
                    shouldSendSms = true;
                    updatePayload.smsSentCompleted = true;
                }

                if (shouldSendSms) {
                    const smsSentSuccessfully = await sendSmsNotification(userMobile, smsMessage);
                    if (smsSentSuccessfully) {
                        await updateDoc(doc(db, "orders", orderId), updatePayload);
                    }
                }
            }
        });
    }, (error) => {
        console.error("Error listening to order status changes: ", error);
    });
}

function listenForTopupStatusChanges(userId) {
    if (topupsSnapshotUnsubscribe) {
        topupsSnapshotUnsubscribe();
    }
    const topupsQuery = query(
        collection(db, "topups"),
        where("userId", "==", userId),
        where("paymentMethod", "==", "Mobile Money")
    );

    topupsSnapshotUnsubscribe = onSnapshot(topupsQuery, (querySnapshot) => {
        querySnapshot.docChanges().forEach(async (change) => {
            if (change.type === "modified") {
                const topupData = change.doc.data();
                const topupId = change.doc.id;
                const userMobile = currentUserData?.mobile;

                if (!userMobile) {
                    console.warn(`No mobile number found for user ${topupData.userId} to send SMS for topup ${topupId}.`);
                    return;
                }

                if (topupData.status === 'completed' && !topupData.smsSentCompleted) {
                    const userDocAfterUpdate = await getDoc(doc(db, "users", userId));
                    const latestBalance = userDocAfterUpdate.exists() ? (userDocAfterUpdate.data().balance || 0) : (currentUserData?.balance || 0);

                    const smsMessage = `gigsplan: Your manual wallet top-up of ${formatCurrencyGHS(topupData.amount)} (Ref: ${topupData.referenceCode}) was successful! Your new balance is ${formatCurrencyGHS(latestBalance)}. Thank you.`;
                    const smsSent = await sendSmsNotification(userMobile, smsMessage);
                    if (smsSent) {
                        await updateDoc(doc(db, "topups", topupId), { smsSentCompleted: true });
                    }
                }
            }
        });
    }, (error) => {
        console.error("Error listening to topup status changes: ", error);
    });
}

function listenForUserDataChanges(userId) {
    if (userDataSnapshotUnsubscribe) {
        userDataSnapshotUnsubscribe();
    }

    const userDocRef = doc(db, "users", userId);

    userDataSnapshotUnsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const updatedData = docSnapshot.data();

            // Check if role changed
            const roleChanged = currentUserData.role !== updatedData.role;
            const goldenTicketChanged = currentUserData.isGoldenActivated !== updatedData.isGoldenActivated;

            // Update current user data
            currentUserData = updatedData;

            // If role or golden ticket status changed, update UI
            if (roleChanged || goldenTicketChanged) {
                console.log('🔄 User role/agent status changed, updating UI...');
                updateUserRoleUI();
                updateProfileDisplay();
                updateBecomeAgentButtonVisibility();

                // Reload packages to show updated pricing
                if (DOMElements.packagesPageContent && DOMElements.packagesPageContent.style.display === 'block') {
                    const activeTab = DOMElements.packagesPageContent.querySelector('.tab-button.active');
                    const currentNetwork = activeTab ? activeTab.dataset.network : 'mtn';
                    renderDataPackages(currentNetwork);
                }

                // Show notification if upgraded to agent
                const updatedRoleNormalized = (updatedData.role || '').toLowerCase();
                const currentRoleNormalized = (currentUserData?.role || '').toLowerCase();
                if (updatedRoleNormalized === 'agent' && currentRoleNormalized !== 'agent' && !currentUserData.hasSeenAgentUpgradeNotification) {
                    showToast('Role Updated!', 'You are now an Agent! Enjoy discounted prices.', 5000, false);
                }
            }

            // Update balance display
            updateAllWalletBalanceDisplays();
        }
    }, (error) => {
        console.error("Error listening to user data changes: ", error);
    });
}


onAuthStateChanged(auth, async (user) => {
    startLoadingAnimation();
    await initializeSiteSettings();
});

 async function handleAuthStateChange(user) {
    if (siteSettings.maintenanceModeEnabled) {
        // Redirection logic for maintenance is handled in initializeSiteSettings
        showSpinner(false); finishLoadingAnimation();
        return;
    }

    if (user) {
        currentUser = user;

        // 🔐 Generate session token
        await AuthTokenManager.generateToken(user.uid);
        console.log('🔐 Session token generated for user:', user.uid);

        // 📊 Initialize session management (30-min inactivity timeout)
        SessionManager.init();
        console.log('📊 Session Manager initialized');

        const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
        
        currentUserData = await fetchUserData(user.uid);

        if (!currentUserData) {
            console.error(`No Firestore document found for UID: ${user.uid}. Forcing logout and redirecting to auth.`);
            showToast("Error", "User profile error. Please log in again.", 4000, true);
            showSpinner(false); finishLoadingAnimation();
            await firebaseSignOut(auth);
            window.location.href = 'auth.html'; // Redirect to auth page
            return;
        }

        if (currentUserData.status === 'deactivated') {
            showToast("Account Deactivated", "Your account is deactivated. Contact support.", 4000, true);
            showSpinner(false); finishLoadingAnimation();
            await firebaseSignOut(auth);
            window.location.href = 'auth.html?status=deactivated'; // Redirect to auth page with status
            return;
        }

        if (currentUserData.role === 'console_admin' || currentUserData.role === 'super_admin_dev' || currentUserData.role === 'console_pending_approval') {
            showToast("Redirecting", "Accessing console...", 2000);
            window.location.href = 'console.html';
            return;
        }

        // Welcome notification removed per user request

        const urlParams = new URLSearchParams(window.location.search);
        const paystackTxRef = urlParams.get('trxref') || urlParams.get('reference');
        if (paystackTxRef) {
            // Handle Paystack callback via serverless API (no secret key needed on frontend)
            await handlePaystackCallback(paystackTxRef);
            if (window.history.replaceState) {
                const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
                window.history.replaceState({path: cleanUrl}, '', cleanUrl);
            }
        }

        listenForOrderStatusChanges(currentUser.uid);
        listenForTopupStatusChanges(currentUser.uid);
        listenForUserDataChanges(currentUser.uid); // ✅ NEW: Listen for user profile changes

        if(DOMElements.dashboardAppContainer) DOMElements.dashboardAppContainer.style.display = 'flex';
        
        navigateToPage('dashboard', showAppDashboard, 'Dashboard', true);

        updateProfileDisplay();
        updateUserRoleUI();
        updateAllWalletBalanceDisplays();
        await fetchDataPackages();
        await fetchResultsCheckerItems();
        updateDashboardStats();
        renderCartItems();
        loadNotificationsForModal();

        // 🔐 Initialize 2FA UI
        TwoFAManager.init();

        // NEW: Show community popup on login, but only once
        if (localStorage.getItem('communityPopupDontShow') !== 'true') {
            showCommunityPopup();
        }

    } else {
        // 🔒 User logged out - cleanup session
        SessionManager.stop();
        AuthTokenManager.clearToken();
        console.log('🔒 Session cleared on logout');

        currentUser = null;
        currentUserData = null;
        cartItems = [];
        notifications = [];
        if (ordersSnapshotUnsubscribe) ordersSnapshotUnsubscribe();
        if (topupsSnapshotUnsubscribe) topupsSnapshotUnsubscribe();
        if (userDataSnapshotUnsubscribe) userDataSnapshotUnsubscribe(); // ✅ NEW: Clean up user data listener
        ordersSnapshotUnsubscribe = null;
        topupsSnapshotUnsubscribe = null;
        userDataSnapshotUnsubscribe = null; // ✅ NEW
        renderNotificationsForModal();

        showSpinner(false); finishLoadingAnimation();
        window.location.href = 'auth.html';
    }
    showSpinner(false);
    finishLoadingAnimation();
}

if(DOMElements.profileLogoutBtn) DOMElements.profileLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    showSpinner(true);
    try {
        // 🔒 Clear session before logout
        SessionManager.stop();
        AuthTokenManager.clearToken();
        console.log('🔒 Session cleared on manual logout');

        if (ordersSnapshotUnsubscribe) ordersSnapshotUnsubscribe();
        if (topupsSnapshotUnsubscribe) topupsSnapshotUnsubscribe();
        ordersSnapshotUnsubscribe = null;
        topupsSnapshotUnsubscribe = null;
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
        showToast('Error', 'Logout failed.', 3000, true);
        showSpinner(false);
    }
});

if(DOMElements.dashboardTopUpBtn) DOMElements.dashboardTopUpBtn.addEventListener('click', () => {
    updateAllWalletBalanceDisplays();
    if(DOMElements.topUpAmountInput) DOMElements.topUpAmountInput.value = "";
    // Only Paystack is available now
    DOMElements.topUpMethodButtons.forEach(btn => btn.classList.remove('active'));
    const paystackBtn = document.querySelector('.topup-method-btn[data-method="paystack"]');
    if (paystackBtn) paystackBtn.classList.add('active');
    if (DOMElements.topUpModalProceedBtn) DOMElements.topUpModalProceedBtn.textContent = 'Proceed with Instant Top-Up';
    if (DOMElements.paystackInfoText) DOMElements.paystackInfoText.style.display = 'block';
    openModal(DOMElements.topUpModalOverlay);
});

// API Management - Back to Dashboard button
if(DOMElements.apiBackToDashboardBtn) DOMElements.apiBackToDashboardBtn.addEventListener('click', () => {
    navigateToPage('dashboard', showAppDashboard, 'Dashboard');
});

if(DOMElements.topUpMethodButtons) {
    DOMElements.topUpMethodButtons.forEach(button => {
        button.addEventListener('click', function() {
            DOMElements.topUpMethodButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const method = this.dataset.method;
            // Only Paystack method is available
            if (method === 'paystack') {
                if (DOMElements.topUpModalProceedBtn) DOMElements.topUpModalProceedBtn.textContent = 'Proceed with Instant Top-Up';
                if (DOMElements.paystackInfoText) DOMElements.paystackInfoText.style.display = 'block';
            }
        });
    });
}

if(DOMElements.topUpModalProceedBtn) DOMElements.topUpModalProceedBtn.addEventListener('click', async function() {
    const amount = parseFloat(DOMElements.topUpAmountInput.value);
    if (isNaN(amount) || amount < MIN_TOPUP_AMOUNT) {
        showToast('Error', `Minimum top-up is ${formatCurrencyGHS(MIN_TOPUP_AMOUNT)}.`, 3000, true);
        return;
    }
    if (!currentUser) {
        showToast('Error', 'Please log in to top up.', 3000, true);
        return;
    }

    // Only Paystack is supported now - manual top-up removed
    closeModal(DOMElements.topUpModalOverlay);
    await initiatePaystackPayment(amount);
});

async function initiatePaystackPayment(amountGHS) {
    // No need to check for secret key - it's now on the server side via Vercel
    if (!currentUser || !currentUserData) {
        showToast('Error', 'User not logged in. Cannot proceed with payment.', 3000, true);
        return;
    }

    showSpinner(true);
    const uniqueReference = `DATA4LESS-${currentUser.uid.substring(0,5)}-${Date.now()}`;
    const callbackUrl = window.location.href.split('?')[0];

    try {
        // Use serverless API endpoint instead of direct Paystack call
        const response = await fetch(`${VERCEL_API_URL}/initialize-paystack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: currentUserData.email,
                amount: amountGHS, // Send amount in GHS, API will convert to kobo
                reference: uniqueReference,
                metadata: {
                    user_id: currentUser.uid,
                    user_name: currentUserData.fullName,
                    user_email: currentUserData.email,
                    topup_amount_ghs: amountGHS.toFixed(2),
                    callback_url: callbackUrl
                }
            })
        });

        const data = await response.json();
        showSpinner(false);

        if (data.status && data.data && data.data.authorization_url) {
            sessionStorage.setItem('paystack_pending_ref', uniqueReference);
            sessionStorage.setItem('paystack_pending_amount_ghs', amountGHS.toFixed(2));
            sessionStorage.setItem('paystack_pending_user_id', currentUser.uid);
            window.location.href = data.data.authorization_url;
        } else {
            console.error('Paystack initialization error:', data);
            showToast('Error', data.message || 'Could not initialize Paystack payment. Try again.', 4000, true);
        }
    } catch (error) {
        showSpinner(false);
        console.error('Error initiating Paystack payment:', error);
        showToast('Error', 'A network error occurred. Please check your connection and try again.', 4000, true);
    }
}

async function handlePaystackCallback(transactionReference) {
    if (!currentUser || !currentUserData) {
        console.warn("User not fully loaded for Paystack callback handling yet.");
        return;
    }

    showSpinner(true);
    try {
        // Use serverless API endpoint for verification
        const verifyResponse = await fetch(`${VERCEL_API_URL}/verify-paystack?reference=${transactionReference}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const verifyData = await verifyResponse.json();

        if (verifyData.status && verifyData.data && verifyData.data.status === 'success') {
            const paidAmountKobo = verifyData.data.amount;
            const paidAmountGHS = paidAmountKobo / 100;
            const expectedAmountGHSStr = verifyData.data.metadata?.topup_amount_ghs || sessionStorage.getItem('paystack_pending_amount_ghs');
            const expectedAmountGHS = parseFloat(expectedAmountGHSStr);

            // Webhook will handle balance crediting, just show success message
            console.log('Payment verified successfully via serverless API');
            showToast('Success!', `${formatCurrencyGHS(paidAmountGHS)} will be added to your wallet shortly. Refresh if not updated.`, 4000);

            // Optional: Record in user's top-up history for reference
            await addTopupToUserHistory(currentUser.uid, paidAmountGHS, 'completed', transactionReference, 'Paystack (Instant)', verifyData.data.reference);

        } else {
            console.error('Paystack verification failed:', verifyData);
            showToast('Error', verifyData.message || 'Paystack payment verification failed.', 4000, true);
            const failedAmountGHS = parseFloat(sessionStorage.getItem('paystack_pending_amount_ghs') || 0);
            await addTopupToUserHistory(currentUser.uid, failedAmountGHS, 'failed', transactionReference, 'Paystack (Verification Failed)', verifyData.data?.reference);
        }
    } catch (error) {
        console.error('Error verifying Paystack payment:', error);
        showToast('Error', 'Could not verify Paystack payment. Contact support if debited.', 5000, true);
    } finally {
        sessionStorage.removeItem('paystack_pending_ref');
        sessionStorage.removeItem('paystack_pending_amount_ghs');
        sessionStorage.removeItem('paystack_pending_user_id');
        showSpinner(false);

        // Reload balance after short delay
        setTimeout(async () => {
            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    currentUserData = userSnap.data();
                    updateAllWalletBalanceDisplays();
                }
            }
        }, 2000);
    }
}


if(DOMElements.momoCompletePaymentBtn) DOMElements.momoCompletePaymentBtn.addEventListener('click', async function() {
    const referenceCode = DOMElements.momoReferenceCodeDisplay ? DOMElements.momoReferenceCodeDisplay.firstChild.nodeValue.trim() : '';
    const amount = currentTopUpAmountForMomo;
    if (!currentUser || amount <= 0 || !referenceCode) {
        showToast('Error', 'Invalid top-up details. Please try again.', 3000, true);
        return;
    }
    showSpinner(true);
    await addTopupToUserHistory(currentUser.uid, amount, 'pending', referenceCode, 'Mobile Money');
    showSpinner(false);
    closeModal(DOMElements.momoPaymentDetailsModalOverlay);
    if(DOMElements.topUpAmountInput) DOMElements.topUpAmountInput.value = "";
    showToast('Info', `Top-up of ${formatCurrencyGHS(amount)} initiated. Please complete payment. Status is pending admin approval.`, 5000, false, true);
});

[DOMElements.momoAccountNameDisplay, DOMElements.momoAccountNumberDisplay, DOMElements.momoReferenceCodeDisplay].forEach(el => {
    if(el) el.addEventListener('click', function() {
        if(this.firstChild && this.firstChild.nodeValue){
             copyToClipboard(this.firstChild.nodeValue.trim(), this);
        }
    });
});

if(DOMElements.showAfaEntryModalBtn) DOMElements.showAfaEntryModalBtn.addEventListener('click', async () => {
    if(DOMElements.afaFeeDisplay) DOMElements.afaFeeDisplay.textContent = (siteSettings.afaFee ||5.00).toFixed(2); // Completed this line
    if(DOMElements.afaEntryForm) DOMElements.afaEntryForm.reset();
    openModal(DOMElements.afaEntryModalOverlay);
});
if(DOMElements.afaEntryForm) DOMElements.afaEntryForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const fullName = DOMElements.afaEntryForm.afaFullName.value.trim();
    const phoneNumber = DOMElements.afaEntryForm.afaPhoneNumber.value.trim();
    const ghanaCard = DOMElements.afaEntryForm.afaGhanaCard.value.trim();
    const occupation = DOMElements.afaEntryForm.afaOccupation.value.trim();
    const dob = DOMElements.afaEntryForm.afaDateOfBirth.value;
    const afaCurrentFee = siteSettings.afaFee || 5.00;

    if (!fullName || !phoneNumber || !ghanaCard || !dob ) { showToast('Error', 'Fill required AFA fields.', 3000, true); return; }

    if (!currentUserData || currentUserData.balance < afaCurrentFee) {
        showToast('Error', `Insufficient balance. Need ${formatCurrencyGHS(afaCurrentFee)}. Please top up.`, 4000, true); return;
    }

    // Process AFA registration directly (no cart)
    showSpinner(true);
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", currentUser.uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw new Error("User document not found.");
            }

            let currentBalance = userDoc.data().balance || 0;
            if (typeof currentBalance === 'string') currentBalance = parseFloat(currentBalance);

            const newBalance = currentBalance - afaCurrentFee;
            if (newBalance < 0) {
                throw new Error("Insufficient wallet balance. Please top up.");
            }

            transaction.update(userRef, { balance: newBalance });

            // Create AFA registration order
            const newOrderRef = doc(collection(db, "orders"));
            const displayId = generateNumericOrderId();
            const orderPayload = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: currentUserData.fullName,
                userMobile: currentUserData.mobile,
                orderId: newOrderRef.id,
                displayOrderId: displayId,
                orderType: 'afa_registration',
                description: `AFA Registration for ${fullName}`,
                name: 'AFA Registration',
                amount: parseFloat(afaCurrentFee),
                status: 'processing',
                createdAt: serverTimestamp(),
                smsSentInitiated: false,
                smsSentCompleted: false,
                network: 'AFA',
                phone: phoneNumber,
                afaFullName: fullName,
                afaGhanaCard: ghanaCard,
                afaOccupation: occupation,
                afaDateOfBirth: dob
            };

            transaction.set(newOrderRef, orderPayload);

            // Update local user data
            if (currentUserData) {
                currentUserData.balance = newBalance;
                updateAllWalletBalanceDisplays();
            }
        }, { maxAttempts: 5 });

        showToast('Success', `AFA Registration for ${fullName} processed successfully! Order ID: ${generateNumericOrderId()}`, 4000);
        closeModal(DOMElements.afaEntryModalOverlay);
        if (DOMElements.afaEntryForm) DOMElements.afaEntryForm.reset();
        updateDashboardStats();
        if (DOMElements.afaRegistrationPageContent && DOMElements.afaRegistrationPageContent.style.display === 'block') {
            renderAfaOrderHistoryTable();
        }
    } catch (error) {
        console.error("Error processing AFA registration:", error);
        let errorMessage = "AFA registration failed. Please try again.";
        if (error.message && error.message.includes("Insufficient wallet balance")) {
            errorMessage = "Your wallet balance is insufficient. Please top up.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        showToast('Error', errorMessage, 5000, true);
    } finally {
        showSpinner(false);
    }
});

function loadDashboardContent() {
    if(DOMElements.skeletonLoader) DOMElements.skeletonLoader.style.display = 'block';
    if(DOMElements.actualDashboardContent) DOMElements.actualDashboardContent.style.display = 'none';

    setTimeout(() => {
        if(DOMElements.skeletonLoader) DOMElements.skeletonLoader.style.display = 'none';
        if(DOMElements.actualDashboardContent) {
            DOMElements.actualDashboardContent.style.display = 'block';
            applyItemFadeUpAnimation(DOMElements.actualDashboardContent, 0.1, 0.05);
        }

        updateAllWalletBalanceDisplays();
        updateUserRoleUI();
        updateDashboardStats();
        
        finishLoadingAnimation();
    }, 700);
}

function applyStaggeredSidebarAnimation() {
    const delay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-item-animation-delay').trim()) || 0.05;
    DOMElements.sidebarNavItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * delay}s`;
    });
}
function toggleSidebar(forceOpen) {
    if (!DOMElements.sidebar || !DOMElements.overlay) return;
    const isOpen = DOMElements.sidebar.classList.contains('open');
    const bodyClassAction = (action) => document.body.classList[action]('sidebar-open');

    if (typeof forceOpen === 'boolean') {
        if (forceOpen && !isOpen) {
            DOMElements.sidebar.classList.add('open');
            if (!DOMElements.cartSidebar?.classList.contains('open')) DOMElements.overlay.classList.add('active');
            bodyClassAction('add');
            applyStaggeredSidebarAnimation();
        } else if (!forceOpen && isOpen) {
            DOMElements.sidebar.classList.remove('open');
            if (!DOMElements.cartSidebar?.classList.contains('open')) DOMElements.overlay.classList.remove('active');
            bodyClassAction('remove');
            DOMElements.sidebarNavItems.forEach(item => {
                item.style.opacity = ''; item.style.transform = ''; item.style.transitionDelay = '';
            });
        }
    } else {
        toggleSidebar(!isOpen);
    }
}
if(DOMElements.menuToggle) DOMElements.menuToggle.addEventListener('click', () => toggleSidebar());
if(DOMElements.overlay) DOMElements.overlay.addEventListener('click', () => {
    if (DOMElements.sidebar && DOMElements.sidebar.classList.contains('open')) toggleSidebar(false);
    if (DOMElements.cartSidebar && DOMElements.cartSidebar.classList.contains('open')) toggleCartSidebar(false);
});

// Navigation logic
document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();

        // Check if this is a parent menu item (has-submenu direct child)
        const parentLi = this.parentElement;
        const isParentMenuItem = parentLi.classList.contains('has-submenu') && this.parentElement === parentLi;

        // Check if this link is inside a submenu
        const isSubmenuItem = this.closest('.submenu') !== null;

        if (isParentMenuItem && !isSubmenuItem) {
            // This is a parent menu item, just toggle the submenu
            parentLi.classList.toggle('open');

            if (this.id === 'walletMenuLink') {
                 navigateToPage('wallet', showWalletPage, 'My Wallet');
            }
        } else {
            // This is either a regular menu item or a submenu item, navigate to the page
            const pageToLoad = this.dataset.page;
            switch(pageToLoad) {
                case "dashboard": navigateToPage('dashboard', showAppDashboard, 'Dashboard'); break;
                case "afa-registration": navigateToPage('afa-registration', showAfaRegistrationPage, 'AFA Orders'); break;
                case "history": navigateToPage('history', showHistoryPage, 'Order History'); break;
                case "results-checker": navigateToPage('results-checker', showResultsCheckerPage, 'Results Checker'); break;
                case "wallet-topup": DOMElements.dashboardTopUpBtn.click(); closeSidePanels(); break;
                case "wallet-transactions": navigateToPage('wallet', showWalletPage, 'My Wallet'); break;
                case "api-management": navigateToPage('api-management', showApiManagementPage, 'API Management'); break;
                case "packages": navigateToPage('packages', showPackagesPage, 'Data Packages'); break;
                case "store-setup": navigateToPage('store-setup', showStoreSetupPage, 'Store Setup'); break;
                case "store-orders": navigateToPage('store-orders', showStoreOrdersPage, 'Store Orders'); break;
                case "store-customers": navigateToPage('store-customers', showStoreCustomersPage, 'Store Customers'); break;
                case "add-product": navigateToPage('add-product', showAddProductPage, 'Add Product'); break;
                case "view-products": navigateToPage('view-products', showViewProductsPage, 'View Products'); break;
                case "payout": navigateToPage('payout', showPayoutPage, 'Payout'); break;
                default: navigateToPage('dashboard', showAppDashboard, 'Dashboard');
            }
        }
    });
});

if (DOMElements.userProfileAvatarLink) {
    DOMElements.userProfileAvatarLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage('profile', showProfileSettings, 'Profile Settings');
    });
}


function toggleCartSidebar(forceOpen) {
    if(!DOMElements.cartSidebar || !DOMElements.overlay) return;
    const isOpen = DOMElements.cartSidebar.classList.contains('open');
    const bodyClassAction = (action) => document.body.classList[action]('cart-open');

    if (typeof forceOpen === 'boolean') {
        if (forceOpen && !isOpen) {
            DOMElements.cartSidebar.classList.add('open');
            if (!DOMElements.sidebar?.classList.contains('open')) DOMElements.overlay.classList.add('active');
            bodyClassAction('add');
            if(DOMElements.cartItemsContainer) applyItemFadeUpAnimation(DOMElements.cartItemsContainer, 0.05, 0.03);
        } else if (!forceOpen && isOpen) {
            DOMElements.cartSidebar.classList.remove('open');
            if (!DOMElements.sidebar?.classList.contains('open')) DOMElements.overlay.classList.remove('active');
            bodyClassAction('remove');
        }
    } else {
        toggleCartSidebar(!isOpen);
    }
}

function addToCart(item) {
    if (!item.id || cartItems.some(ci => ci.id === item.id)) {
        item.id = `${item.orderType || 'data'}_${item.network || 'gen'}_${item.recipientPhone || 'no-phone'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    cartItems.push(item);
    showToast('Success', `${item.name || item.dataSize} added to cart.`, 2000);
    renderCartItems();
}

function removeFromCart(itemId) {
    cartItems = cartItems.filter(item => item.id !== itemId);
    renderCartItems();
    showToast('Removed', 'Item removed from cart.', 1500, false, true, 'fas fa-trash-alt');
}

function renderCartItems() {
    if (!DOMElements.cartItemsContainer || !DOMElements.cartEmptyMessage || !DOMElements.cartFooter) return;
    if (cartItems.length === 0) {
        DOMElements.cartItemsContainer.innerHTML = '';
        DOMElements.cartEmptyMessage.style.display = 'flex';
        DOMElements.cartFooter.style.display = 'none';
    } else {
        DOMElements.cartEmptyMessage.style.display = 'none';
        DOMElements.cartFooter.style.display = 'block';
        DOMElements.cartItemsContainer.innerHTML = cartItems.map((item, index) => {
            let itemTagHTML = '';
            let itemNameDisplay = item.name || item.dataSize || item.checkerType;
            let itemDetailsLine = '';

            if (item.orderType === 'afa_registration') {
                itemTagHTML = `<span class="cart-item-tag afa-tag">AFA Reg.</span>`;
                itemNameDisplay = item.name || "AFA Registration";
                itemDetailsLine = `<div class="cart-item-recipient"><i class="fas fa-id-card"></i> For: ${item.afaFullName || item.recipientPhone}</div>`;
            } else if (item.orderType === 'results_checker') {
                itemTagHTML = `<span class="cart-item-tag results-checker-tag">${item.checkerType}</span>`;
                itemNameDisplay = `${item.checkerType} Results Pin`;
                itemDetailsLine = '';
            } else if (item.orderType === 'mtnjust4u') {
                itemTagHTML = `<span class="cart-item-tag mtn-just4u-tag">MTN J4U</span>`;
                itemNameDisplay = item.description;
                itemDetailsLine = `<div class="cart-item-recipient"><i class="fas fa-mobile-alt"></i> Recipient: ${item.recipientPhone}</div>`;
            } else if (item.orderType === 'afa_mins') {
                itemTagHTML = `<span class="cart-item-tag afa-tag">AFA Mins</span>`;
                itemNameDisplay = item.name;
                itemDetailsLine = `<div class="cart-item-recipient"><i class="fas fa-mobile-alt"></i> Recipient: ${item.recipientPhone}</div>`;
            }
            else if (item.network) {
                const networkUpper = item.network.toUpperCase().replace('_', ' ');
                let tagBg = 'var(--text-muted)'; let tagColor = 'white';
                if (networkUpper === 'MTN') { tagBg = 'var(--mtn-yellow)'; tagColor = 'var(--mtn-blue)';}
                else if (networkUpper === 'TELECEL') { tagBg = 'var(--telecel-red)'; }
                else if (networkUpper === 'AT') { tagBg = 'var(--at-blue)'; }
                itemTagHTML = `<span class="cart-item-tag" style="background-color:${tagBg}; color:${tagColor};">${networkUpper}</span>`;
                itemDetailsLine = `<div class="cart-item-recipient"><i class="fas fa-user"></i> Recipient: ${item.recipientPhone}</div>`;
            }

            return `
            <div class="cart-item animated-item" data-item-id="${item.id}" style="animation-delay: ${index * 0.03}s">
                ${itemTagHTML}
                <div class="cart-item-details">
                    <div class="cart-item-name">${itemNameDisplay}</div>
                    ${itemDetailsLine}
                    <div class="cart-item-price">${formatCurrencyGHS(item.price)}</div>
                </div>
                <button class="cart-item-remove-btn" aria-label="Remove item"><i class="fas fa-trash-alt"></i></button>
            </div>`;
        }).join('');
        
        DOMElements.cartItemsContainer.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                removeFromCart(this.closest('.cart-item').dataset.itemId);
            });
        });
        applyItemFadeUpAnimation(DOMElements.cartItemsContainer, 0.05, 0.03);
    }
    updateCartTotalAndBadge();
}

function updateCartTotalAndBadge() {
    if (!DOMElements.cartTotalAmountEl || !DOMElements.cartFabBadge || !DOMElements.cartCheckoutBtn) return;
    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    DOMElements.cartTotalAmountEl.textContent = formatCurrencyGHS(total);
    DOMElements.cartFabBadge.textContent = cartItems.length;
    DOMElements.cartFabBadge.style.display = cartItems.length > 0 ? 'flex' : 'none';
    DOMElements.cartCheckoutBtn.disabled = cartItems.length === 0;
}

if(DOMElements.cartFab) DOMElements.cartFab.addEventListener('click', (e) => { e.preventDefault(); toggleCartSidebar(); });
if(DOMElements.cartCloseBtn) DOMElements.cartCloseBtn.addEventListener('click', () => toggleCartSidebar(false));

// =========================================================================
// === CODE FIX STARTS HERE (From previous response, ensuring it's included) ===
// =========================================================================
if(DOMElements.cartCheckoutBtn) {
    DOMElements.cartCheckoutBtn.addEventListener('click', async () => {
        if (DOMElements.cartCheckoutBtn.disabled || cartItems.length === 0) {
            return;
        }
        
        const originalButtonText = DOMElements.cartCheckoutBtn.innerHTML;
        DOMElements.cartCheckoutBtn.disabled = true;
        DOMElements.cartCheckoutBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

        const totalAmount = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

        if (!currentUserData || currentUserData.balance < totalAmount) {
            showToast('Error', `Insufficient balance. Need ${formatCurrencyGHS(totalAmount)}. Please top up.`, 4000, true);
            DOMElements.cartCheckoutBtn.disabled = false;
            DOMElements.cartCheckoutBtn.innerHTML = originalButtonText;
            return;
        }

        showSpinner(true);
        const orderDisplayIDs = [];

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", currentUser.uid);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists()) {
                    throw new Error("User document not found during checkout transaction.");
                }

                let currentBalance = userDoc.data().balance || 0;
                if (typeof currentBalance === 'string') currentBalance = parseFloat(currentBalance);

                const newBalance = currentBalance - totalAmount;
                if (newBalance < 0) {
                    throw new Error("Insufficient wallet balance during checkout transaction. Please top up.");
                }

                transaction.update(userRef, { balance: newBalance });

                for (const item of cartItems) {
                    const newOrderRef = doc(collection(db, "orders"));
                    const displayId = generateNumericOrderId();
                    orderDisplayIDs.push(displayId);
                    const orderPayload = {
                        userId: currentUser.uid, userEmail: currentUser.email, userName: currentUserData.fullName, userMobile: currentUserData.mobile,
                        orderId: newOrderRef.id, displayOrderId: displayId, orderType: item.orderType || 'data_bundle',
                        description: `${item.name || item.dataSize} (Cart Purchase)`,
                        name: item.name || item.dataSize, amount: parseFloat(item.price),
                        status: 'processing', createdAt: serverTimestamp(), smsSentInitiated: false, smsSentCompleted: false
                    };

                    if (item.orderType === 'afa_registration') {
                        orderPayload.network = 'AFA';
                        orderPayload.phone = item.recipientPhone;
                        orderPayload.afaFullName = item.afaFullName || item.name;
                        orderPayload.afaGhanaCard = item.afaGhanaCard || 'N/A';
                        orderPayload.afaOccupation = item.afaOccupation || 'N/A';
                        orderPayload.afaDateOfBirth = item.afaDateOfBirth || '';
                    } else if (item.orderType === 'results_checker') {
                        orderPayload.network = item.checkerType;
                        orderPayload.checkerType = item.checkerType;
                        orderPayload.serialNumber = item.serialNumber;
                        orderPayload.pin = item.pin;
                        orderPayload.status = 'completed';

                        const itemRef = doc(db, "resultsCheckerItems", item.checkerType, "items", item.originalItemId);
                        const rcItemDoc = await transaction.get(itemRef);
                        if (!rcItemDoc.exists() || rcItemDoc.data().isSold) {
                            throw new Error(`${item.checkerType} PIN with ID ${item.originalItemId} is no longer available.`);
                        }
                        transaction.update(itemRef, { isSold: true, soldTo: currentUser.uid, soldAt: serverTimestamp() });

                    } else if (item.orderType === 'mtnjust4u') {
                        orderPayload.network = 'MTNJUST4U';
                        orderPayload.phone = item.recipientPhone;
                        orderPayload.dataAmount = item.dataAmount || 'N/A';
                        orderPayload.callMinutes = item.callMinutes || 'N/A';
                        orderPayload.smsCount = item.smsCount || 'N/A';
                        orderPayload.packageId = item.packageId;

                    } else if (item.orderType === 'afa_mins') {
                        orderPayload.network = 'AFA_MINS';
                        orderPayload.phone = item.recipientPhone;
                        orderPayload.minutes = item.minutes || 'N/A';
                        orderPayload.packageId = item.packageId;
                        orderPayload.status = 'initiated';

                    } else {
                        orderPayload.network = item.network || 'N/A';
                        orderPayload.phone = item.recipientPhone || 'N/A';
                        orderPayload.dataSize = item.dataSize || 'N/A';
                        orderPayload.status = 'pending';
                    }
                    transaction.set(newOrderRef, orderPayload);
                }

                if (currentUserData) {
                    currentUserData.balance = newBalance;
                    updateAllWalletBalanceDisplays();
                }

            }, { maxAttempts: 5 });

            showOrderSuccessModal("Success!", `Checked out ${cartItems.length} item(s) for ${formatCurrencyGHS(totalAmount)}. Orders are processing. Check history for details.`, "general", orderDisplayIDs.join(', '));
            cartItems = []; renderCartItems(); toggleCartSidebar(false); updateDashboardStats();
            if (DOMElements.historyPageContent && DOMElements.historyPageContent.style.display === 'block') renderOrderHistoryTable();
            if (DOMElements.afaRegistrationPageContent && DOMElements.afaRegistrationPageContent.style.display === 'block') renderAfaOrderHistoryTable();
            if (DOMElements.packagesPageContent && DOMElements.packagesPageContent.style.display === 'block') {
                const activeTab = DOMElements.packagesPageContent.querySelector('.tab-button.active');
                const currentNetwork = activeTab ? activeTab.dataset.network : 'mtn';
                renderDataPackages(currentNetwork);
            }
            if (DOMElements.resultsCheckerPageContent.style.display === 'block') {
                fetchResultsCheckerItems();
                updateResultsCheckerPrice(DOMElements.resultsCheckerTypeSelect.value);
            }

        } catch (error) {
            console.error("Error during cart checkout batch commit:", error);
            let errorMessage = "Checkout process failed. Please try again.";
            if (error.message && error.message.includes("Insufficient wallet balance")) {
                errorMessage = "Your wallet balance is insufficient for this purchase. Please top up.";
            } else if (error.message && error.message.includes("is no longer available")) {
                errorMessage = "One or more items in your cart just went out of stock. Please remove it/them and try again.";
            } else if (error.code === 'permission-denied') {
                errorMessage = "Permission denied. Please check Firestore security rules or contact support.";
            } else if (error.code === 'resource-exhausted') { // This is Firebase's equivalent of HTTP 429
                errorMessage = "Too many requests. Please wait a moment and try again.";
            } else {
                errorMessage = error.message || errorMessage;
            }
            showToast('Error', errorMessage, 5000, true);

        } finally {
            showSpinner(false);
            // ALWAYS re-enable the button, regardless of success or failure
            DOMElements.cartCheckoutBtn.disabled = cartItems.length === 0;
            DOMElements.cartCheckoutBtn.innerHTML = originalButtonText;
        }
    });
}
// =========================================================================
// === CODE FIX ENDS HERE ===
// =========================================================================

async function updateDashboardStats() {
    if (!currentUser) {
        ['statTotalOrders', 'statCompletedOrders', 'statPendingOrders', 'statProcessingOrders'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        return;
    }
    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        let total = 0, completed = 0, pending = 0, processing = 0;
        querySnapshot.forEach(docSnap => {
            const order = docSnap.data();
            total++;
            if (order.status === 'completed') completed++;
            else if (order.status === 'pending') pending++;
            else if (['processing', 'wip', 'initiated'].includes(order.status)) processing++;
        });
        if(document.getElementById('statTotalOrders')) document.getElementById('statTotalOrders').textContent = total;
        if(document.getElementById('statCompletedOrders')) document.getElementById('statCompletedOrders').textContent = completed;
        if(document.getElementById('statPendingOrders')) document.getElementById('statPendingOrders').textContent = pending;
        if(document.getElementById('statProcessingOrders')) document.getElementById('statProcessingOrders').textContent = processing;
    } catch (error) { console.error("Error fetching dashboard stats:", error); }
}

async function cancelOrder(orderId) {
    if (!orderId || !currentUser) return;
    
    const confirmation = confirm("Are you sure you want to cancel this pending order?");
    if (!confirmation) return;

    showSpinner(true);
    const orderRef = doc(db, "orders", orderId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw new Error("Order not found.");
            }

            const orderData = orderDoc.data();

            if (orderData.userId !== currentUser.uid) {
                throw new Error("You do not have permission to cancel this order.");
            }

            if (orderData.status !== 'pending') {
                throw new Error("Only pending orders can be canceled.");
            }

            const userRef = doc(db, "users", currentUser.uid);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found for refund.");
            }

            const currentBalance = parseFloat(userDoc.data().balance || 0);
            const refundAmount = parseFloat(orderData.amount || 0);
            const newBalance = currentBalance + refundAmount;

            transaction.update(userRef, { balance: newBalance });
            transaction.update(orderRef, { status: 'cancelled' });
        });

        showToast("Success", "Order cancelled and amount refunded to your wallet.", 3000);
        updateAllWalletBalanceDisplays();
        renderOrderHistoryTable(); // Refresh the history view
        updateDashboardStats();

    } catch (error) {
        console.error("Error cancelling order:", error);
        showToast("Error", error.message || "Failed to cancel order.", 4000, true);
    } finally {
        showSpinner(false);
    }
}


async function renderOrderHistoryTable() {
    if (!DOMElements.orderHistoryTableBody || !DOMElements.historyOrdersListView || !DOMElements.historyNoOrdersView || !currentUser) return;
    DOMElements.orderHistoryTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Loading history...</td></tr>`;
    try {
        const ordersRef = collection(db, "orders");
        const q = query(
            ordersRef,
            where("userId", "==", currentUser.uid),
            where("orderType", "!=", "afa_registration"),
            orderBy("orderType"),
            orderBy("createdAt", "desc"),
            limit(50)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            DOMElements.historyOrdersListView.style.display = 'none';
            DOMElements.historyNoOrdersView.style.display = 'block';
            return;
        }
        DOMElements.historyOrdersListView.style.display = 'block'; DOMElements.historyNoOrdersView.style.display = 'none';
        DOMElements.orderHistoryTableBody.innerHTML = '';

        querySnapshot.forEach(docSnap => {
            const order = docSnap.data();
            const row = DOMElements.orderHistoryTableBody.insertRow();
            const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
            const formattedDate = date.toLocaleDateString('en-GB', { day:'2-digit',month:'short',year:'numeric' });
            const formattedTime = date.toLocaleTimeString('en-US', { hour:'2-digit',minute:'2-digit',hour12:true });
            const status = order.status || 'Unknown';

            let orderTypeDisplay = 'Data Bundle';
            if (order.orderType === 'afa_registration') orderTypeDisplay = 'AFA Registration';
            else if (order.orderType === 'results_checker') orderTypeDisplay = `${order.checkerType || 'Results'} PIN`;
            else if (order.orderType === 'mtnjust4u') orderTypeDisplay = 'MTN Just4U';
            else if (order.orderType === 'afa_mins') orderTypeDisplay = 'AFA Mins';
            else if (order.orderType === 'data_bundle') orderTypeDisplay = 'Data Bundle';


            const displayId = order.displayOrderId || order.orderId || docSnap.id;

            let statusHtml = status.toLowerCase() === 'processing' ?
                `<span class="status-badge status-processing">Processing<span class="dot-loader"><span></span><span></span><span></span></span></span>` :
                `<span class="status-badge status-${status.toLowerCase()}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;

            const isPending = status.toLowerCase() === 'pending';
            const reportButtonText = order.orderType === 'results_checker' ? 'View PIN' : 'Report';
            const recipientPhoneNumber = normalizePhoneForDisplay(order.phone || order.recipientPhone || 'N/A');

            // MODIFICATION: Disable Report button if status is pending
            let actionsHTML = `<button class="report-order-btn" data-order-details='${JSON.stringify(order)}' data-order-id="${displayId}" data-recipient-phone="${recipientPhoneNumber}" ${isPending ? 'disabled' : ''}>${reportButtonText}</button>`;
            
            if (order.orderType !== 'results_checker') {
                actionsHTML += `<button class="btn-cancel-order" data-order-id="${order.orderId}" ${!isPending ? 'disabled' : ''}>Cancel</button>`;
            }


            row.innerHTML = `
                <td class="order-id">${displayId}</td>
                <td>${orderTypeDisplay}</td>
                <td>${(order.network || 'N/A').toUpperCase()}</td>
                <td>${order.orderType === 'results_checker' ? 'N/A (Pin)' : normalizePhoneForDisplay(order.phone || 'N/A')}</td>
                <td>${order.orderType === 'results_checker' ? `*****` : (order.dataSize || order.minutes || 'N/A')}</td>
                <td>${formatCurrencyGHS(order.amount)}</td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>${statusHtml}</td>
                <td>${actionsHTML}</td>`;
        });

        DOMElements.orderHistoryTableBody.querySelectorAll('.report-order-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                 if (this.disabled) return;
                const orderDetails = JSON.parse(this.dataset.orderDetails);
                const orderId = this.dataset.orderId;
                const recipientPhone = this.dataset.recipientPhone;

                if (orderDetails.orderType === 'results_checker') {
                    showOrderSuccessModal(
                        `${orderDetails.checkerType} PIN Details`,
                        `Serial: ${orderDetails.serialNumber}\nPIN: ${orderDetails.pin}\nThis information is saved in your order history.`,
                        "results_checker_success",
                        orderId
                    );
                } else {
                    const whatsappMessage = `Problem with Order ID: ${orderId}\nType: ${orderDetails.name}\nNetwork: ${orderDetails.network}\nPhone: ${recipientPhone}\nAmount: ${formatCurrencyGHS(orderDetails.amount)}\nDetails: [Please describe the issue]`;
                    const whatsappLink = `https://wa.me/233552202292/?text=${encodeURIComponent(whatsappMessage)}`;
                    window.open(whatsappLink, '_blank');
                }
            });
        });

         DOMElements.orderHistoryTableBody.querySelectorAll('.btn-cancel-order').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                cancelOrder(this.dataset.orderId);
            });
        });

    } catch (error) { console.error("Error rendering order history:", error); DOMElements.orderHistoryTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">Error loading history.</td></tr>`; }
}

async function renderAfaOrderHistoryTable() {
    if (!DOMElements.afaHistoryTableBody || !DOMElements.afaHistoryTableContainer || !DOMElements.afaNoOrdersView || !currentUser) return;
    DOMElements.afaHistoryTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Loading AFA history...</td></tr>`;
    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", currentUser.uid), where("orderType", "==", "afa_registration"), orderBy("createdAt", "desc"), limit(30));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            DOMElements.afaHistoryTableContainer.style.display = 'none';
            DOMElements.afaNoOrdersView.style.display = 'block';
            return;
        }
        DOMElements.afaHistoryTableContainer.style.display = 'block'; DOMElements.afaNoOrdersView.style.display = 'none';
        DOMElements.afaHistoryTableBody.innerHTML = '';

        querySnapshot.forEach(docSnap => {
            const order = docSnap.data();
            const row = DOMElements.afaHistoryTableBody.insertRow();
            const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
            const formattedDate = date.toLocaleDateString('en-GB', { day:'2-digit',month:'short',year:'numeric' });
            const formattedTime = date.toLocaleTimeString('en-US', { hour:'2-digit',minute:'2-digit',hour12:true });
            const status = order.status || 'Unknown';
            const displayIdForAfa = order.displayOrderId || order.orderId || docSnap.id;

            let statusHtml = status.toLowerCase() === 'processing' ?
                `<span class="status-badge status-processing">Processing<span class="dot-loader"><span></span><span></span><span></span></span></span>` :
                `<span class="status-badge status-${status.toLowerCase()}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;

            row.innerHTML = `
                <td class="order-id">${displayIdForAfa}</td>
                <td>${order.afaFullName || 'N/A'}</td>
                <td>${order.phone}</td>
                <td>${order.afaGhanaCard || 'N/A'}</td>
                <td>${order.afaOccupation || 'N/A'}</td>
                <td>${formatCurrencyGHS(order.amount)}</td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>${statusHtml}</td>`;
        });
    } catch (error) { console.error("Error rendering AFA order history:", error); DOMElements.afaHistoryTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error loading AFA history.</td></tr>`; }
}

function openConfirmPurchaseModal(packageData) {
    // Check if stores are closed or Sunday purchases are disabled
    if (siteSettings.closeAllStores) {
        showToast('Store Closed', 'All stores are currently closed. Please try again later.', 4000, true);
        return;
    }

    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    if (siteSettings.disableSundayPurchases && today === 0) {
        showToast('Sunday Restriction', 'Purchases are not allowed on Sundays. Please come back tomorrow!', 4000, true);
        return;
    }

    confirmPurchaseState.package = packageData;

    if (!DOMElements.confirmPurchaseModalOverlay || !confirmPurchaseState.package || !currentUserData) return;

    console.log('📦 Opening confirm modal with package data:', packageData);
    console.log('📱 recipientPhone in package:', packageData.recipientPhone || 'NOT SET');

    DOMElements.confirmPurchasePackageName.textContent = `${packageData.name} (${packageData.network.toUpperCase()})`;
    DOMElements.confirmPurchaseTotalCost.textContent = `Total: ${formatCurrencyGHS(packageData.price)}`;

    // If phone is already provided (from Buy Data modal), populate the field
    if (packageData.recipientPhone) {
        // Ensure phone is in 0XXXXXXXXX format (convert from 233 if needed)
        let displayPhone = packageData.recipientPhone;

        console.log('🔄 Converting phone format:', {
            original: packageData.recipientPhone,
            startsWith233: displayPhone.startsWith('233'),
            length: displayPhone.length
        });

        if (displayPhone.startsWith('233') && displayPhone.length === 12) {
            displayPhone = '0' + displayPhone.substring(3);
            console.log('✅ Converted 233 to 0 format:', displayPhone);
        }

        DOMElements.confirmPurchaseRecipientNumber.value = displayPhone;
        DOMElements.confirmPurchaseRecipientNumber.readOnly = false; // Allow editing so user can fix if needed
        DOMElements.confirmPurchaseRecipientNumber.style.backgroundColor = '';
    } else {
        console.log('ℹ️ No recipientPhone in package - field will be empty');
        DOMElements.confirmPurchaseRecipientNumber.value = '';
        DOMElements.confirmPurchaseRecipientNumber.readOnly = false;
        DOMElements.confirmPurchaseRecipientNumber.style.backgroundColor = '';
    }

    updateAllWalletBalanceDisplays();

    const userBalance = currentUserData.balance || 0;
    if (userBalance < packageData.price) {
        DOMElements.confirmPurchaseBalanceWarning.style.display = 'block';
        if (DOMElements.confirmPurchaseBuyNowBtn) {
            DOMElements.confirmPurchaseBuyNowBtn.disabled = true;
            DOMElements.confirmPurchaseBuyNowBtn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
            DOMElements.confirmPurchaseBuyNowBtn.style.pointerEvents = 'none';
            DOMElements.confirmPurchaseBuyNowBtn.style.cursor = 'not-allowed';
            DOMElements.confirmPurchaseBuyNowBtn.removeAttribute('aria-disabled');
        }
    } else {
        DOMElements.confirmPurchaseBalanceWarning.style.display = 'none';
        if (DOMElements.confirmPurchaseBuyNowBtn) {
            DOMElements.confirmPurchaseBuyNowBtn.disabled = false;
            DOMElements.confirmPurchaseBuyNowBtn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
            DOMElements.confirmPurchaseBuyNowBtn.style.pointerEvents = 'auto';
            DOMElements.confirmPurchaseBuyNowBtn.style.cursor = 'pointer';
            DOMElements.confirmPurchaseBuyNowBtn.removeAttribute('aria-disabled');
        }
    }

    openModal(DOMElements.confirmPurchaseModalOverlay);
}

if (DOMElements.confirmPurchaseBuyNowBtn) {
    DOMElements.confirmPurchaseBuyNowBtn.addEventListener('click', async () => {
        // Prevent double-tapping: Check if button is already disabled
        if (DOMElements.confirmPurchaseBuyNowBtn.disabled) {
            return;
        }

        const pkg = confirmPurchaseState.package;
        if (!pkg) return;

        if (!currentUserData || currentUserData.balance < pkg.price) {
             showToast('Error', 'Your balance is insufficient for this item.', 4000, true);
             closeModal(DOMElements.confirmPurchaseModalOverlay);
             return;
        }

        let formattedPhoneNumber;

        // If phone is already in the package data (from Buy Data modal), use it
        if (pkg.recipientPhone) {
            formattedPhoneNumber = pkg.recipientPhone; // Already in correct format from Buy Data modal
        } else {
            // Otherwise, validate and format the phone from input field
            const rawPhoneNumber = DOMElements.confirmPurchaseRecipientNumber.value.trim();

            const phoneRegex = /^(02[0-9]|05[0-9])\d{7}$/;
            if (!phoneRegex.test(rawPhoneNumber)) {
                showToast('Error', 'Please enter a valid Ghana mobile number (e.g., 0241234567).', 4000, true);
                return;
            }

            // Keep phone number in 0XXXXXXXXX format (no conversion to 233)
            formattedPhoneNumber = rawPhoneNumber; // Keep as 0XXXXXXXXX
        }

        // ============ RATE LIMITING CHECK ============
        // Track purchase attempts to prevent abuse
        const now = Date.now();
        const purchaseKey = `purchase_${currentUser.uid}`;
        let purchaseAttempts = JSON.parse(localStorage.getItem(purchaseKey) || '[]');

        // Remove attempts older than 1 minute
        purchaseAttempts = purchaseAttempts.filter(timestamp => now - timestamp < 60000);

        // Check if too many purchases in short time (more than 10 in 1 minute)
        if (purchaseAttempts.length >= 10) {
            showToast('Error', 'Too many purchase attempts. Please wait a moment before trying again.', 4000, true);
            // Log suspicious activity for admin
            try {
                await addDoc(collection(db, 'securityLogs'), {
                    userId: currentUser.uid,
                    email: currentUser.email,
                    type: 'RATE_LIMIT_EXCEEDED',
                    action: 'data_purchase',
                    attempts: purchaseAttempts.length,
                    timestamp: serverTimestamp(),
                    userAgent: navigator.userAgent
                });
            } catch (e) {
                console.warn('Could not log security event:', e);
            }
            return;
        }

        // Add current attempt
        purchaseAttempts.push(now);
        localStorage.setItem(purchaseKey, JSON.stringify(purchaseAttempts));
        // ============================================

        // Disable button COMPLETELY to prevent double-tapping
        DOMElements.confirmPurchaseBuyNowBtn.disabled = true;
        DOMElements.confirmPurchaseBuyNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        DOMElements.confirmPurchaseBuyNowBtn.style.pointerEvents = 'none';
        DOMElements.confirmPurchaseBuyNowBtn.style.cursor = 'not-allowed';
        DOMElements.confirmPurchaseBuyNowBtn.setAttribute('aria-disabled', 'true');

        const orderData = {
            phone: formattedPhoneNumber, // Keep in 0XXXXXXXXX format
            packageValue: pkg.id,
            packageText: pkg.name || pkg.dataSize,
            price: pkg.price,
            network: pkg.network,
            dataSize: pkg.dataSize,
            minutes: pkg.minutes,
            name: pkg.name || pkg.dataSize,
            recipientPhone: formattedPhoneNumber, // Keep in 0XXXXXXXXX format
            description: `${pkg.name || pkg.dataSize} for ${formattedPhoneNumber}`
        };

        const orderType = pkg.network === 'afa_mins' ? 'afa_mins' : 'data_bundle';

        try {
            // Process order directly
            await addPurchaseToFirestore(orderData, orderType);

            // Deduct balance
            const newBalance = currentUserData.balance - pkg.price;
            await updateDoc(doc(db, 'users', currentUser.uid), {
                balance: newBalance
            });
            currentUserData.balance = newBalance;
            updateAllWalletBalanceDisplays();

            // Close modal
            closeModal(DOMElements.confirmPurchaseModalOverlay);

            // Show success popup
            showToast('Success', 'Your purchase was successful!', 4000, false);

            // Reset button
            DOMElements.confirmPurchaseBuyNowBtn.disabled = false;
            DOMElements.confirmPurchaseBuyNowBtn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
            DOMElements.confirmPurchaseBuyNowBtn.style.pointerEvents = 'auto';
            DOMElements.confirmPurchaseBuyNowBtn.style.cursor = 'pointer';
            DOMElements.confirmPurchaseBuyNowBtn.removeAttribute('aria-disabled');
        } catch (error) {
            console.error('Order processing error:', error);
            showToast('Error', 'Failed to process order. Please try again.', 4000, true);

            // Reset button
            DOMElements.confirmPurchaseBuyNowBtn.disabled = false;
            DOMElements.confirmPurchaseBuyNowBtn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
            DOMElements.confirmPurchaseBuyNowBtn.style.pointerEvents = 'auto';
            DOMElements.confirmPurchaseBuyNowBtn.style.cursor = 'pointer';
            DOMElements.confirmPurchaseBuyNowBtn.removeAttribute('aria-disabled');
        }
    });
}


function renderDataPackages(networkKey) {
    if (!DOMElements.packageOffersGrid || !DOMElements.noPackagesView || !currentUserData) return;

    const packagesToDisplay = networkPackages[networkKey] || [];

    if (packagesToDisplay.length === 0) {
        DOMElements.packageOffersGrid.innerHTML = '';
        DOMElements.noPackagesView.style.display = 'block';
        return;
    }

    DOMElements.noPackagesView.style.display = 'none';
    DOMElements.packageOffersGrid.innerHTML = packagesToDisplay.map((pkg, index) => {
        const userRoleNormalized = (currentUserData?.role || '').toLowerCase();
        const isAgent = userRoleNormalized === 'agent' || userRoleNormalized === 'super_agent' || currentUserData.isGoldenActivated;
        const displayPrice = isAgent && pkg.agentPrice !== undefined ? pkg.agentPrice : pkg.customerPrice;
        const packageName = pkg.name || `${pkg.dataSize || pkg.minutes || ''} Package`;
        const networkClass = `network-${pkg.network.toLowerCase().replace('_', '-')}`;

        // Calculate savings for agents
        let savingsBadge = '';
        if (isAgent && pkg.agentPrice !== undefined && pkg.customerPrice !== undefined && pkg.agentPrice < pkg.customerPrice) {
            const savings = pkg.customerPrice - pkg.agentPrice;
            const savingsPercent = Math.round((savings / pkg.customerPrice) * 100);
            savingsBadge = `
                <div style="position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 8px rgba(240, 147, 251, 0.4);">
                    Save ${savingsPercent}%
                </div>
                <div style="margin-top: 8px; font-size: 13px; color: #888;">
                    <span style="text-decoration: line-through;">GH₵ ${pkg.customerPrice.toFixed(2)}</span>
                    <span style="margin-left: 8px; color: #27ae60; font-weight: 600;">Agent Price</span>
                </div>
            `;
        }

        return `
            <div class="package-card animated-item ${networkClass}" data-package='${JSON.stringify(pkg)}' style="animation-delay: ${index * 0.07}s; position: relative;">
                ${savingsBadge}
                <h3>${packageName}</h3>
                <p>${pkg.description || `${pkg.dataSize || pkg.minutes || ''} for ${pkg.validity || 'N/A'}`}</p>
                <div class="price-display">${formatCurrencyGHS(displayPrice)}</div>
                <button class="buy-now-btn">Buy Now</button>
            </div>
        `;
    }).join('');

    DOMElements.packageOffersGrid.querySelectorAll('.package-card').forEach(card => {
        // Buy Now button handler
        const buyNowBtn = card.querySelector('.buy-now-btn');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click
                const packageData = JSON.parse(card.dataset.package);
                const userRoleNormalized = (currentUserData?.role || '').toLowerCase();
        const isAgent = userRoleNormalized === 'agent' || userRoleNormalized === 'super_agent' || currentUserData.isGoldenActivated;
                const finalPrice = isAgent && packageData.agentPrice !== undefined ? packageData.agentPrice : packageData.customerPrice;
                packageData.price = finalPrice;
                openConfirmPurchaseModal(packageData);
            });
        }
    });
    
    applyItemFadeUpAnimation(DOMElements.packagesPageContent, 0.1, 0.07);
}


if (DOMElements.packageCategoryTabs) {
    DOMElements.packageCategoryTabs.querySelectorAll('.tab-button').forEach(tabButton => {
        tabButton.addEventListener('click', function() {
            DOMElements.packageCategoryTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            renderDataPackages(this.dataset.network);
        });
    });
}


async function updateHistorySummaryCards() {
    if (!currentUser) return;
    try {
        const ordersRef = collection(db, "orders");
        // Simplified query - filter AFA registration in JavaScript instead of Firestore to avoid index requirement
        const q = query(ordersRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        let totalOrders = 0, totalAmount = 0, completedOrders = 0, completedAmount = 0;
        querySnapshot.forEach(docSnap => {
            const order = docSnap.data();
            // Skip AFA registration orders in the count
            if (order.orderType === 'afa_registration') return;

            totalOrders++;
            totalAmount += parseFloat(order.amount || 0);
            if (order.status === 'completed') {
                completedOrders++;
                completedAmount += parseFloat(order.amount || 0);
            }
        });

        if(DOMElements.historyTotalOrdersCountEl) DOMElements.historyTotalOrdersCountEl.textContent = totalOrders;
        if(DOMElements.historyTotalOrdersAmountEl) DOMElements.historyTotalOrdersAmountEl.textContent = formatCurrencyGHS(totalAmount);
        if(DOMElements.historyCompletedOrdersCountEl) DOMElements.historyCompletedOrdersCountEl.textContent = completedOrders;
        if(DOMElements.historyCompletedOrdersAmountEl) DOMElements.historyCompletedOrdersAmountEl.textContent = formatCurrencyGHS(completedAmount);

        const totalProgressEl = document.getElementById('historyTotalOrdersProgress');
        const completedProgressEl = document.getElementById('historyCompletedOrdersProgress');
        if(totalProgressEl) totalProgressEl.style.width = `100%`;
        if(completedProgressEl) completedProgressEl.style.width = totalOrders > 0 ? `${(completedOrders / totalOrders) * 100}%` : `0%`;

    } catch (error) { console.error("Error updating history summary cards:", error); }
}

async function updateWalletPageDisplays() {
    if (!DOMElements.walletPageContent || DOMElements.walletPageContent.style.display === 'none' || !currentUser) return;

    try {
        const topupsRef = collection(db, "topups");
        const q = query(topupsRef, where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        let pendingCount = 0, pendingAmount = 0, completedCount = 0, completedAmount = 0;
        const topupHistoryForList = [];
        querySnapshot.forEach(docSnap => {
            const topup = docSnap.data();
            topupHistoryForList.push(topup);
            if (topup.status === 'pending') {
                pendingCount++;
                pendingAmount += parseFloat(topup.amount);
            } else if (topup.status === 'completed') {
                completedCount++;
                completedAmount += parseFloat(topup.amount);
            }
        });

        if(DOMElements.walletPendingTopupsCountEl) DOMElements.walletPendingTopupsCountEl.textContent = pendingCount;
        if(DOMElements.walletPendingTopupsAmountEl) DOMElements.walletPendingTopupsAmountEl.textContent = formatCurrencyGHS(pendingAmount);
        if(DOMElements.walletCompletedTopupsCountEl) DOMElements.walletCompletedTopupsCountEl.textContent = completedCount;
        if(DOMElements.walletCompletedTopupsAmountEl) DOMElements.walletCompletedTopupsAmountEl.textContent = formatCurrencyGHS(completedAmount);

        const totalCount = pendingCount + completedCount;
        const pendingProgress = document.getElementById('walletPendingTopupsProgress');
        const completedProgress = document.getElementById('walletCompletedTopupsProgress');
        if (pendingProgress) pendingProgress.style.width = totalCount > 0 ? `${(pendingCount / totalCount) * 100}%` : '0%';
        if (completedProgress) completedProgress.style.width = totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%';

        renderTopupHistoryList(topupHistoryForList);

    } catch (error) { console.error("Error updating wallet page displays:", error); }
}

// Compatibility wrapper: updateWalletDisplay was referenced in a few places.
// Ensure older calls to `updateWalletDisplay()` don't fail — delegate to
// the more specific wallet update functions available in this file.
function updateWalletDisplay() {
    try {
        if (typeof updateAllWalletBalanceDisplays === 'function') {
            updateAllWalletBalanceDisplays();
        }
        if (typeof updateWalletPageDisplays === 'function') {
            // async but we don't await here to keep callers simple
            updateWalletPageDisplays();
        }
    } catch (err) {
        console.error('updateWalletDisplay error:', err);
    }
}
function renderTopupHistoryList(historyToRender) {
    if(!DOMElements.walletTopupHistoryListEl || !DOMElements.noWalletTopupHistoryView) return;

    const filterValue = DOMElements.walletTopupHistoryFilter?.value || 'today';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const sevenDaysAgo = new Date(now.getFullYear(),now.getMonth(),now.getDate()-7);
    const thirtyDaysAgo = new Date(now.getFullYear(),now.getMonth(),now.getDate()-30);

    const filteredHistory = historyToRender.filter(item => {
        const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(0);
        switch(filterValue){
            case 'today':return itemDate >= todayStart;
            case 'last_7_days':return itemDate >= sevenDaysAgo;
            case 'last_30_days':return itemDate >= thirtyDaysAgo;
            default:return true;
        }
    });

    if (filteredHistory.length === 0) {
        DOMElements.walletTopupHistoryListEl.innerHTML = '';
        DOMElements.noWalletTopupHistoryView.style.display = 'block';
    }
    else {
        DOMElements.noWalletTopupHistoryView.style.display = 'none';
        DOMElements.walletTopupHistoryListEl.innerHTML = filteredHistory.map(item => {
            const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(0);
            const formattedDate = date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric' });
            const formattedTime = date.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true });
            const status = item.status || 'Unknown';
            const reference = item.paymentMethod === 'Paystack' ? (item.paystackReference || item.referenceCode) : item.referenceCode;
            const displayRef = (reference || 'N/A').substring(0, 20) + ( (reference && reference.length > 20) ? '...' : '');

            return `
                <div class="topup-history-item">
                    <div class="date">${formattedDate} ${formattedTime}</div>
                    <div class="reference" title="${reference || ''}">${displayRef} (${item.paymentMethod || 'Manual'})</div>
                    <div class="amount">${formatCurrencyGHS(item.amount)}</div>
                    <div class="status status-${status.toLowerCase()}">${status.charAt(0).toUpperCase() + status.slice(1)}</div>
                </div>`;
        }).join('');
    }
}
if(DOMElements.walletTopupHistoryFilter) DOMElements.walletTopupHistoryFilter.addEventListener('change', updateWalletPageDisplays);


// --- Notification Center Modal Logic ---
function addSystemNotification(title, message, type = 'system', sender = 'Admin', targetUserId = null) {
    if (targetUserId && (!currentUser || currentUser.uid !== targetUserId)) return;

    const newNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: title,
        message: message,
        type: type,
        sender: sender,
        timestamp: Timestamp.now(),
        read: false,
        icon: type === 'welcome' ? 'fa-hands-helping' :
              (type === 'order_update' || type === 'order_status') ? 'fa-receipt' :
              (type === 'wallet_topup') ? 'fa-wallet' :
              (type === 'system_alert') ? 'fa-bullhorn' :
              'fa-info-circle'
    };

    notifications.unshift(newNotification);
    if (notifications.length > 50) notifications.pop();

    if(currentUser) {
        localStorage.setItem(`user_${currentUser.uid}_notifications_modal`, JSON.stringify(notifications));
    }
    renderNotificationsForModal();
}

function loadNotificationsForModal() {
    if (currentUser) {
        const storedNotifications = localStorage.getItem(`user_${currentUser.uid}_notifications_modal`);
        if (storedNotifications) {
            notifications = JSON.parse(storedNotifications).map(n => ({
                ...n,
                timestamp: n.timestamp && n.timestamp.seconds ? new Timestamp(n.timestamp.seconds, n.timestamp.nanoseconds) : new Date(n.timestamp || Date.now())
            }));
        } else {
            notifications = [];
        }
    } else {
        notifications = [];
    }
    renderNotificationsForModal();
}

function renderNotificationsForModal() {
    if (!DOMElements.notificationCenterBody || !DOMElements.notificationBadge || !DOMElements.notificationCenterNewCount || !DOMElements.notificationCenterMarkAllReadBtn) return;

    const unreadCount = notifications.filter(n => !n.read).length;
    DOMElements.notificationBadge.textContent = unreadCount;
    DOMElements.notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    DOMElements.notificationCenterNewCount.textContent = `${unreadCount} New`;

    if (notifications.length === 0) {
        DOMElements.notificationCenterBody.innerHTML = `<p class="no-notifications-message">No notifications yet.</p>`;
        DOMElements.notificationCenterMarkAllReadBtn.disabled = true;
    }
    else {
        DOMElements.notificationCenterBody.innerHTML = `
            <div class="notification-dropdown-list">
                ${notifications.map(n => `
                    <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                        <div class="notification-icon-col"><i class="fas ${n.icon || 'fa-info-circle'}"></i></div>
                        <div class="notification-content">
                            <h5>${n.title}</h5>
                            <p>${n.message}</p>
                            <span class="timestamp">${formatTimestamp(n.timestamp)} - by ${n.sender}</span>
                        </div>
                    </div>`).join('')
                }
            </div>`;
        DOMElements.notificationCenterMarkAllReadBtn.disabled = unreadCount === 0;

        DOMElements.notificationCenterBody.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', function() {
                const notifId = this.dataset.id;
                const notification = notifications.find(n => n.id === notifId);
                if (notification && !notification.read) {
                    notification.read = true;
                    if(currentUser) localStorage.setItem(`user_${currentUser.uid}_notifications_modal`, JSON.stringify(notifications));
                    renderNotificationsForModal();
                }
            });
        });
    }
}

if (DOMElements.notificationBellBtn) {
    DOMElements.notificationBellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(DOMElements.notificationCenterModalOverlay);
        loadNotificationsForModal();
    });
}

if (DOMElements.notificationCenterMarkAllReadBtn) {
    DOMElements.notificationCenterMarkAllReadBtn.addEventListener('click', () => {
        notifications.forEach(n => n.read = true);
        if(currentUser) localStorage.setItem(`user_${currentUser.uid}_notifications_modal`, JSON.stringify(notifications));
        renderNotificationsForModal();
    });
}


async function fetchResultsCheckerItems() {
    resultsCheckerItemsStore = { BECE: [], WAEC: [] };
    const types = ['BECE', 'WAEC'];
    try {
        for (const type of types) {
            const itemsColRef = collection(db, `resultsCheckerItems/${type}/items`);
            const q = query(itemsColRef, where("isSold", "==", false), orderBy("addedAt", "asc"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => {
                resultsCheckerItemsStore[type].push({ id: docSnap.id, ...docSnap.data(), type: type });
            });
        }
        console.log("Fetched Results Checker Items (available):", resultsCheckerItemsStore);
        if (DOMElements.resultsCheckerPageContent.style.display === 'block') {
            const selectedType = DOMElements.resultsCheckerTypeSelect.value;
            if (selectedType) updateResultsCheckerPrice(selectedType);
        }
    } catch (error) {
        console.error("Error fetching results checker items:", error);
    }
}

function updateResultsCheckerPrice(type) {
    if (!type || !DOMElements.resultsCheckerPriceInfo || !DOMElements.resultsCheckerPriceDisplay || !DOMElements.purchaseCheckerSerialBtn) return;

    const availableItems = resultsCheckerItemsStore[type] || [];
    if (availableItems.length > 0) {
        const item = availableItems[0];
        DOMElements.resultsCheckerPriceDisplay.textContent = formatCurrencyGHS(item.price);
        DOMElements.resultsCheckerPriceInfo.style.display = 'block';
        DOMElements.purchaseCheckerSerialBtn.disabled = false;
        DOMElements.purchaseCheckerSerialBtn.textContent = `Purchase ${type} PIN (${formatCurrencyGHS(item.price)})`;
    } else {
        DOMElements.resultsCheckerPriceDisplay.textContent = 'Out of Stock';
        DOMElements.resultsCheckerPriceInfo.style.display = 'block';
        DOMElements.purchaseCheckerSerialBtn.disabled = true;
        DOMElements.purchaseCheckerSerialBtn.textContent = `${type} PIN - Out of Stock`;
    }
}

if (DOMElements.resultsCheckerTypeSelect) {
    DOMElements.resultsCheckerTypeSelect.addEventListener('change', function() {
        updateResultsCheckerPrice(this.value);
    });
}

if (DOMElements.purchaseCheckerSerialBtn) {
    DOMElements.purchaseCheckerSerialBtn.addEventListener('click', async () => {
        const selectedType = DOMElements.resultsCheckerTypeSelect.value;
        if (!selectedType) {
            showToast('Error', 'Please select a checker type.', 3000, true); return;
        }
        if (!currentUserData) {
            showToast('Error', 'User not logged in.', 3000, true); return;
        }

        await fetchResultsCheckerItems();
        const availableItems = resultsCheckerItemsStore[selectedType] || [];

        if (availableItems.length === 0) {
            showToast('Error', `${selectedType} PINs are currently out of stock. Please try again later.`, 4000, true);
            updateResultsCheckerPrice(selectedType);
            return;
        }
        const itemToPurchase = availableItems[0];
        
        if(currentUserData.balance < itemToPurchase.price) {
            showToast('Error', `Insufficient balance to purchase ${selectedType} PIN. Please top up.`, 4000, true);
            return;
        }
        
        const cartItem = {
            id: `rc_${selectedType}_${itemToPurchase.id}`,
            orderType: 'results_checker',
            checkerType: selectedType,
            name: `${selectedType} PIN`,
            price: parseFloat(itemToPurchase.price),
            serialNumber: itemToPurchase.serialNumber,
            pin: itemToPurchase.pin,
            originalItemId: itemToPurchase.id
        };

        addToCart(cartItem);
        showToast('Success', `${cartItem.name} added to cart!`, 2000);
        
        if (DOMElements.resultsCheckerTypeSelect) DOMElements.resultsCheckerTypeSelect.value = "";
        if (DOMElements.resultsCheckerPriceInfo) DOMElements.resultsCheckerPriceInfo.style.display = 'none';
        if (DOMElements.purchaseCheckerSerialBtn) DOMElements.purchaseCheckerSerialBtn.disabled = true;
    });
}


// --- Import Excel / Input Orders Logic ---

// Input Orders (Text Import)
if (DOMElements.dashboardInputOrdersBtn) {
    DOMElements.dashboardInputOrdersBtn.addEventListener('click', () => {
        if (DOMElements.textImportNetworkSelect) DOMElements.textImportNetworkSelect.value = 'mtn';
        if (DOMElements.textImportDataOrders) DOMElements.textImportDataOrders.value = '';
        openModal(DOMElements.textImportModalOverlay);
    });
}

if (DOMElements.submitTextOrdersBtn) {
    DOMElements.submitTextOrdersBtn.addEventListener('click', async () => {
        const networkKey = DOMElements.textImportNetworkSelect.value;
        const ordersText = DOMElements.textImportDataOrders.value.trim();

        if (!ordersText) {
            showToast('Error', 'Please paste data orders in the text area.', 3000, true);
            return;
        }

        const lines = ordersText.split('\n').filter(line => line.trim() !== '');
        const newCartItems = [];
        const errors = [];
        const isAgent = currentUserData && (currentUserData.role === 'Agent' || currentUserData.role === 'super_agent' || currentUserData.isGoldenActivated);

        const pkgsForNetwork = networkPackages[networkKey] || [];
        
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length !== 2) {
                errors.push(`Invalid format: "${line}". Expected "phone_number data_size".`);
                continue;
            }

            const rawPhoneNumber = parts[0];
            const dataSizeValue = parts[1];

            const phoneNumberRegex = /^(02[0-9]|05[0-9])\d{7}$/;
            if (!phoneNumberRegex.test(rawPhoneNumber)) {
                errors.push(`Invalid phone number: "${rawPhoneNumber}" in line "${line}".`);
                continue;
            }
            const formattedPhoneNumber = `233${rawPhoneNumber.substring(1)}`;

            let matchedPackage = pkgsForNetwork.find(pkg => String(pkg.dataSize || '').replace(/GB/i, '').trim() === dataSizeValue);
            
            if (!matchedPackage) {
                errors.push(`Package for data size "${dataSizeValue}" not found for ${networkKey.toUpperCase()} (line: "${line}").`);
                continue;
            }

            const priceToCharge = isAgent && matchedPackage.agentPrice !== undefined
                                  ? matchedPackage.agentPrice
                                  : matchedPackage.customerPrice;

            newCartItems.push({
                id: `${networkKey}_${rawPhoneNumber}_${matchedPackage.id}_${Date.now()}`,
                phone: formattedPhoneNumber,
                packageValue: matchedPackage.id,
                packageText: matchedPackage.name,
                price: priceToCharge,
                network: networkKey,
                dataSize: matchedPackage.dataSize,
                name: matchedPackage.name,
                recipientPhone: formattedPhoneNumber,
                orderType: 'data_bundle'
            });
        }

        if (errors.length > 0) {
            showToast('Error', `Found ${errors.length} error(s): <br>${errors.slice(0, 3).join('<br>')}`, 7000, true);
            return;
        }

        if (newCartItems.length === 0) {
            showToast('Info', 'No valid orders found to add.', 3000);
            return;
        }

        const totalBulkCost = newCartItems.reduce((sum, item) => sum + item.price, 0);
        if (!currentUserData || currentUserData.balance < totalBulkCost) {
             showToast('Error', `Insufficient balance for these orders. Total cost: ${formatCurrencyGHS(totalBulkCost)}.`, 5000, true);
             return;
        }

        // Process bulk orders directly (no cart)
        showSpinner(true);
        const orderDisplayIDs = [];
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", currentUser.uid);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists()) {
                    throw new Error("User document not found.");
                }

                let currentBalance = userDoc.data().balance || 0;
                if (typeof currentBalance === 'string') currentBalance = parseFloat(currentBalance);

                const newBalance = currentBalance - totalBulkCost;
                if (newBalance < 0) {
                    throw new Error("Insufficient wallet balance. Please top up.");
                }

                transaction.update(userRef, { balance: newBalance });

                // Create orders for all bulk items
                for (const item of newCartItems) {
                    const newOrderRef = doc(collection(db, "orders"));
                    const displayId = generateNumericOrderId();
                    orderDisplayIDs.push(displayId);
                    const orderPayload = {
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        userName: currentUserData.fullName,
                        userMobile: currentUserData.mobile,
                        orderId: newOrderRef.id,
                        displayOrderId: displayId,
                        orderType: item.orderType || 'data_bundle',
                        description: `${item.name || item.dataSize} (Bulk Order)`,
                        name: item.name || item.dataSize,
                        amount: parseFloat(item.price),
                        status: 'pending',
                        createdAt: serverTimestamp(),
                        smsSentInitiated: false,
                        smsSentCompleted: false,
                        network: item.network || 'N/A',
                        phone: item.recipientPhone || 'N/A',
                        dataSize: item.dataSize || 'N/A'
                    };
                    transaction.set(newOrderRef, orderPayload);
                }

                // Update local user data
                if (currentUserData) {
                    currentUserData.balance = newBalance;
                    updateAllWalletBalanceDisplays();
                }
            }, { maxAttempts: 5 });

            showToast('Success', `${newCartItems.length} bulk orders processed successfully for ${formatCurrencyGHS(totalBulkCost)}!`, 4000);
            closeModal(DOMElements.textImportModalOverlay);
            if (DOMElements.textImportDataOrders) DOMElements.textImportDataOrders.value = '';
            updateDashboardStats();
            if (DOMElements.historyPageContent && DOMElements.historyPageContent.style.display === 'block') {
                renderOrderHistoryTable();
            }
        } catch (error) {
            console.error("Error processing bulk orders:", error);
            let errorMessage = "Bulk order processing failed. Please try again.";
            if (error.message && error.message.includes("Insufficient wallet balance")) {
                errorMessage = "Your wallet balance is insufficient. Please top up.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            showToast('Error', errorMessage, 5000, true);
        } finally {
            showSpinner(false);
        }
    });
}

// Import Excel (File Upload)
if (DOMElements.dashboardImportExcelBtn) {
    DOMElements.dashboardImportExcelBtn.addEventListener('click', () => {
        if (DOMElements.excelFileInput) DOMElements.excelFileInput.value = '';
        if (DOMElements.excelFileName) DOMElements.excelFileName.textContent = 'No file chosen';
        openModal(DOMElements.excelImportModalOverlay);
    });
}

if (DOMElements.selectExcelFileBtn) {
    DOMElements.selectExcelFileBtn.addEventListener('click', () => {
        DOMElements.excelFileInput.click();
    });
}

if (DOMElements.excelFileInput) {
    DOMElements.excelFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            DOMElements.excelFileName.textContent = this.files[0].name;
        } else {
            DOMElements.excelFileName.textContent = 'No file chosen';
        }
    });
}

if (DOMElements.uploadExcelOrdersBtn) {
    DOMElements.uploadExcelOrdersBtn.addEventListener('click', () => {
        showToast('Feature In Progress', 'Excel import functionality is coming soon!', 3000, false, true);
    });
}

// --- End Import Excel / Input Orders Logic ---

// Profile Settings Listeners
if(DOMElements.editProfileBtn) DOMElements.editProfileBtn.addEventListener('click', () => {
    if(DOMElements.profileViewMode) DOMElements.profileViewMode.style.display = 'none';
    if(DOMElements.profileEditMode) DOMElements.profileEditMode.style.display = 'block';
    updateProfileDisplay();
});

if(DOMElements.cancelProfileEditBtn) DOMElements.cancelProfileEditBtn.addEventListener('click', () => {
    if(DOMElements.profileViewMode) DOMElements.profileViewMode.style.display = 'block';
    if(DOMElements.profileEditMode) DOMElements.profileEditMode.style.display = 'none';
});

if(DOMElements.saveProfileChangesBtn) DOMElements.saveProfileChangesBtn.addEventListener('click', async () => {
    const newFullName = DOMElements.profileEditFullName.value.trim();
    const newPhoneNumber = DOMElements.profileEditPhoneNumber.value.trim();
    const phoneRegex = /^233\d{9}$/;

    if (!newFullName || !newPhoneNumber) { showToast('Error', 'Full name and phone number cannot be empty.', 3000, true); return; }
    if (!phoneRegex.test(newPhoneNumber)) { showToast('Error', 'Invalid phone number format. Use 233xxxxxxxxx.', 3000, true); return; }

    showSpinner(true);
    if (currentUser && currentUser.uid) {
        await updateUserFirestoreProfile(currentUser.uid, {
            fullName: newFullName,
            mobile: newPhoneNumber
        });
        showToast('Success', 'Profile updated successfully!', 2000);
        if(DOMElements.profileViewMode) DOMElements.profileViewMode.style.display = 'block';
        if(DOMElements.profileEditMode) DOMElements.profileEditMode.style.display = 'none';
    } else {
        showToast('Error', 'User not authenticated. Cannot save profile.', 3000, true);
    }
    showSpinner(false);
});

if(DOMElements.changePasswordBtn) DOMElements.changePasswordBtn.addEventListener('click', () => {
    if(DOMElements.changePasswordForm) DOMElements.changePasswordForm.reset();
    openModal(DOMElements.changePasswordModalOverlay);
});

if(DOMElements.saveNewPasswordBtn) DOMElements.saveNewPasswordBtn.addEventListener('click', async () => {
    const currentPass = DOMElements.currentPasswordInput.value;
    const newPass = DOMElements.newPasswordInput.value;
    const confirmPass = DOMElements.confirmNewPasswordInput.value;

    if (!currentPass || !newPass || !confirmPass) { showToast('Error', 'All password fields are required.', 3000, true); return; }
    if (newPass !== confirmPass) { showToast('Error', 'New passwords do not match.', 3000, true); return; }
    if (newPass.length < 6) { showToast('Error', 'New password must be at least 6 characters long.', 3000, true); return; }

    showSpinner(true);
    try {
        if (auth.currentUser) {
            await firebaseUpdatePassword(auth.currentUser, newPass);
            showToast('Success', 'Password changed successfully!', 2500);
            closeModal(DOMElements.changePasswordModalOverlay);
            if(DOMElements.changePasswordForm) DOMElements.changePasswordForm.reset();
        } else {
            showToast('Error', 'User not authenticated. Please log in again.', 3000, true);
        }
    } catch (error) {
        console.error("Change password error:", error);
         let friendlyMessage = "Failed to change password.";
        if (error.code === 'auth/weak-password') {
            friendlyMessage = "The new password is too weak.";
        } else if (error.code === 'auth/requires-recent-login') {
            friendlyMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in before changing your password.";
        }
        showToast('Error', friendlyMessage, 4000, true);
    }
    showSpinner(false);
});

// General Modal Close Listeners
document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal;
        const modalToClose = document.getElementById(modalId);
        if (modalToClose) {
            closeModal(modalToClose);
        }
    });
});
document.querySelectorAll('.modal-overlay').forEach(modalOverlayEl => {
    modalOverlayEl.addEventListener('click', (event) => {
        if (event.target === modalOverlayEl) {
            closeModal(modalOverlayEl);
        }
    });
});

// Footer Year
if(DOMElements.currentYear) DOMElements.currentYear.textContent = new Date().getFullYear();

// Initial load of notifications
loadNotificationsForModal();

// ==================== QUICK ACTIONS HANDLERS ====================
const quickActionTopUp = document.getElementById('quickActionTopUp');
const quickActionBuyData = document.getElementById('quickActionBuyData');
const quickActionOrders = document.getElementById('quickActionOrders');
const quickActionPayments = document.getElementById('quickActionPayments');

if (quickActionTopUp) {
    quickActionTopUp.addEventListener('click', () => {
        // Open top-up modal
        const topUpModal = document.getElementById('topUpModalOverlay');
        if (topUpModal) {
            openModal(topUpModal);
        }
    });
}

if (quickActionBuyData) {
    quickActionBuyData.addEventListener('click', () => {
        // Open buy data modal
        const buyDataModal = document.getElementById('buyDataModalOverlay');
        if (buyDataModal) {
            openModal(buyDataModal);
        }
    });
}

if (quickActionOrders) {
    quickActionOrders.addEventListener('click', () => {
        // Navigate to history page
        navigateToPage('history', showHistoryPage, 'Order History'); // Corrected navigation
    });
}

if (quickActionPayments) {
    quickActionPayments.addEventListener('click', () => {
        // Navigate to wallet transactions page
        navigateToPage('wallet', showWalletPage, 'My Wallet'); // Wallet page also shows transactions
    });
}

// ==================== MERCHANT STORE QUICK ACTIONS ====================
const merchantActionCards = document.querySelectorAll('.merchant-action-card');

// Keep store setup card visible - let users click it and see access denied on the page
merchantActionCards.forEach(card => {
    card.addEventListener('click', function() {
        const pageToLoad = this.getAttribute('data-page');

        // Allow navigation to all pages - access denied will show on the page itself
        switch(pageToLoad) {
            case "store-setup": navigateToPage('store-setup', showStoreSetupPage, 'Store Setup'); break;
            case "store-orders": navigateToPage('store-orders', showStoreOrdersPage, 'Store Orders'); break;
            case "store-customers": navigateToPage('store-customers', showStoreCustomersPage, 'Store Customers'); break;
            case "add-product": navigateToPage('add-product', showAddProductPage, 'Add Product'); break;
            case "view-products": navigateToPage('view-products', showViewProductsPage, 'View Products'); break;
            case "payout": navigateToPage('payout', showPayoutPage, 'Payout'); break;
        }
    });
});

// ==================== BUY DATA MODAL LOGIC ====================
const buyDataNetworkSelect = document.getElementById('buyDataNetworkSelect');
const buyDataPackageSelect = document.getElementById('buyDataPackageSelect');
const buyDataPhoneNumber = document.getElementById('buyDataPhoneNumber');
const buyDataPriceDisplay = document.getElementById('buyDataPriceDisplay');
const buyDataPriceValue = document.getElementById('buyDataPriceValue');
const buyDataSubmitBtn = document.getElementById('buyDataSubmitBtn');
const buyDataModalOverlay = document.getElementById('buyDataModalOverlay');

let selectedPackageData = null;

if (buyDataNetworkSelect) {
    buyDataNetworkSelect.addEventListener('change', async (e) => {
        const network = e.target.value;
        buyDataPackageSelect.disabled = true;
        buyDataPackageSelect.innerHTML = '<option value="">Loading packages...</option>';
        buyDataPriceDisplay.style.display = 'none';
        selectedPackageData = null;
        validateBuyDataForm();

        if (!network) {
            buyDataPackageSelect.innerHTML = '<option value="">-- Select network first --</option>';
            return;
        }

        try {
            // Use networkPackages data which is already fetched
            const packages = networkPackages[network] || [];

            if (packages.length === 0) {
                buyDataPackageSelect.innerHTML = '<option value="">No packages available</option>';
            } else {
                buyDataPackageSelect.innerHTML = '<option value="">-- Select Package --</option>';
                packages.forEach(pkg => {
                    const option = document.createElement('option');
                    option.value = pkg.id;
                    const userRoleNormalized = (currentUserData?.role || '').toLowerCase();
        const isAgent = userRoleNormalized === 'agent' || userRoleNormalized === 'super_agent' || currentUserData.isGoldenActivated;
                    const displayPrice = isAgent && pkg.agentPrice !== undefined ? pkg.agentPrice : pkg.customerPrice;
                    option.textContent = `${pkg.name || pkg.dataSize || pkg.minutes} - ${formatCurrencyGHS(displayPrice)}`;
                    option.dataset.packageData = JSON.stringify({ ...pkg, price: displayPrice }); // Store adjusted price
                    buyDataPackageSelect.appendChild(option);
                });
                buyDataPackageSelect.disabled = false;
            }
        } catch (error) {
            console.error('Error loading packages:', error);
            showToast('Error', 'Failed to load packages', 'error');
            buyDataPackageSelect.innerHTML = '<option value="">Error loading packages</option>';
        }
    });
}

if (buyDataPackageSelect) {
    buyDataPackageSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];

        if (selectedOption.dataset.packageData) {
            selectedPackageData = JSON.parse(selectedOption.dataset.packageData);
            buyDataPriceValue.textContent = formatCurrencyGHS(selectedPackageData.price);
            buyDataPriceDisplay.style.display = 'block';
        } else {
            selectedPackageData = null;
            buyDataPriceDisplay.style.display = 'none';
        }

        validateBuyDataForm();
    });
}

if (buyDataPhoneNumber) {
    buyDataPhoneNumber.addEventListener('input', validateBuyDataForm);
}

function validateBuyDataForm() {
    const network = buyDataNetworkSelect?.value;
    const packageId = buyDataPackageSelect?.value;
    const phone = buyDataPhoneNumber?.value;

    const isValid = network && packageId && selectedPackageData && phone && phone.match(/^0\d{9}$/);

    if (buyDataSubmitBtn) {
        buyDataSubmitBtn.disabled = !isValid;
    }
}

if (buyDataSubmitBtn) {
    buyDataSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!selectedPackageData) {
            showToast('Error', 'Please select a package', 'error');
            return;
        }

        const phoneNumber = buyDataPhoneNumber.value.trim();
        if (!phoneNumber.match(/^0\d{9}$/)) {
            showToast('Error', 'Please enter a valid Ghana mobile number (e.g., 0241234567)', 4000, true);
            return;
        }

        // Format phone number to 233XXXXXXXXX
        const formattedPhone = '233' + phoneNumber.substring(1);

        // Check balance before proceeding
        if (!currentUserData || currentUserData.balance < selectedPackageData.price) {
            showToast('Error', `Insufficient balance. Need ${formatCurrencyGHS(selectedPackageData.price)}. Please top up.`, 4000, true);
            return;
        }

        // Prepare package data with phone number
        const packageForConfirmation = {
            ...selectedPackageData,
            recipientPhone: formattedPhone,
            phone: formattedPhone,
            packageText: selectedPackageData.name || selectedPackageData.dataSize || selectedPackageData.minutes
        };

        // Close Buy Data modal
        closeModal(buyDataModalOverlay);

        // Reset form
        buyDataNetworkSelect.value = '';
        buyDataPackageSelect.innerHTML = '<option value="">-- Select network first --</option>';
        buyDataPackageSelect.disabled = true;
        buyDataPhoneNumber.value = '';
        buyDataPriceDisplay.style.display = 'none';
        selectedPackageData = null;

        // Open confirmation modal
        openConfirmPurchaseModal(packageForConfirmation);
    });
}

// ==================== CHART.JS ANALYTICS ====================
let ordersChartInstance = null;
const ordersChartCanvas = document.getElementById('ordersChart');

async function initializeOrdersChart(period = 'week') {
    if (!ordersChartCanvas) return;

    try {
        const ctx = ordersChartCanvas.getContext('2d');

        // Destroy existing chart if it exists
        if (ordersChartInstance) {
            ordersChartInstance.destroy();
        }

        // Fetch order data based on period
        const chartData = await getChartData(period);

        ordersChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Orders',
                    data: chartData.values,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#27ae60',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        borderRadius: 8,
                        titleFont: {
                            size: 13,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12
                        },
                        callbacks: {
                            label: function(context) {
                                return 'Orders: ' + context.parsed.y;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

async function getChartData(period) {
    try {
        const now = new Date();
        let startDate;
        let labels = [];
        let groupedData = {};

        // Determine time range based on period
        if (period === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            // Generate labels for last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const label = date.toLocaleDateString('en-US', { weekday: 'short' });
                labels.push(label);
                groupedData[label] = 0;
            }
        } else if (period === 'month') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            // Generate labels for last 4 weeks
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            labels.forEach(label => groupedData[label] = 0);
        } else if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
            // Generate labels for 12 months
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels.forEach(label => groupedData[label] = 0);
        }

        // Fetch orders from Firestore
        if (currentUser) {
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, where('userId', '==', currentUser.uid));
            const snapshot = await getDocs(q);

            snapshot.forEach(doc => {
                const order = doc.data();
                if (order.createdAt) {
                    const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);

                    if (orderDate >= startDate) {
                        if (period === 'week') {
                            const dayLabel = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
                            if (groupedData.hasOwnProperty(dayLabel)) {
                                groupedData[dayLabel]++;
                            }
                        } else if (period === 'month') {
                            const weekIndex = Math.floor((now - orderDate) / (7 * 24 * 60 * 60 * 1000));
                            if (weekIndex >= 0 && weekIndex < 4) {
                                groupedData[`Week ${4 - weekIndex}`]++;
                            }
                        } else if (period === 'year') {
                            const monthLabel = orderDate.toLocaleDateString('en-US', { month: 'short' });
                            if (groupedData.hasOwnProperty(monthLabel)) {
                                groupedData[monthLabel]++;
                            }
                        }
                    }
                }
            });
        }

        return {
            labels: labels,
            values: labels.map(label => groupedData[label] || 0)
        };
    } catch (error) {
        console.error('Error getting chart data:', error);
        // Return empty data on error
        return {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [0, 0, 0, 0, 0, 0, 0]
        };
    }
}

// Chart filter buttons
const chartFilterBtns = document.querySelectorAll('.chart-filter-btn');
chartFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        chartFilterBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Update chart with new period
        const period = btn.dataset.period;
        initializeOrdersChart(period);
    });
});

// Initialize chart when user is authenticated
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Initialize chart with default period (week)
        setTimeout(() => {
            initializeOrdersChart('week');
        }, 1000);
    }
});

// =========================================================================
// 🔐 TWO-FACTOR AUTHENTICATION (2FA) MANAGER
// =========================================================================

const TwoFAManager = {
    // Vercel deployment URL for 2FA API
    API_BASE_URL: 'https://api-snowy-eight.vercel.app', // Consistent with Vercel deployment
    pendingPhoneNumber: null,

    // Initialize 2FA UI based on user data
    init() {
        if (!currentUser || !currentUserData) return;

        const twoFAEnabled = currentUserData.twoFAEnabled || false;
        const twoFAPhone = currentUserData.twoFAPhone || null;

        // Set toggle state
        if (DOMElements.twoFAToggle) {
            DOMElements.twoFAToggle.checked = twoFAEnabled;
        }

        // Update status text
        if (DOMElements.twoFAStatusText) {
            DOMElements.twoFAStatusText.textContent = twoFAEnabled ? 'Enabled' : 'Disabled';
            DOMElements.twoFAStatusText.style.color = twoFAEnabled ? '#27ae60' : '#95a5a6';
        }

        // Show phone number if enabled
        if (twoFAEnabled && twoFAPhone && DOMElements.twoFAPhoneDisplay) {
            DOMElements.twoFAPhoneDisplay.style.display = 'block';
            if (DOMElements.twoFAPhoneNumber) {
                DOMElements.twoFAPhoneNumber.textContent = twoFAPhone;
            }
        } else if (DOMElements.twoFAPhoneDisplay) {
            DOMElements.twoFAPhoneDisplay.style.display = 'none';
        }
    },

    // Send verification code via API
    async sendCode(phoneNumber, userId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/send-2fa-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, userId })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return { success: true, message: data.message };
            } else {
                throw new Error(data.error || 'Failed to send code');
            }
        } catch (error) {
            console.error('Error sending 2FA code:', error);
            return { success: false, error: error.message };
        }
    },

    // Verify code via API
    async verifyCode(code, userId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/verify-2fa-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, userId })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return { success: true, phoneNumber: data.phoneNumber };
            } else {
                throw new Error(data.error || 'Invalid code');
            }
        } catch (error) {
            console.error('Error verifying 2FA code:', error);
            return { success: false, error: error.message };
        }
    },

    // Enable 2FA in Firestore
    async enable2FA(phoneNumber) {
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                twoFAEnabled: true,
                twoFAPhone: phoneNumber,
                twoFAEnabledAt: serverTimestamp()
            });

            // Update local data
            currentUserData.twoFAEnabled = true;
            currentUserData.twoFAPhone = phoneNumber;

            this.init(); // Refresh UI
            return { success: true };
        } catch (error) {
            console.error('Error enabling 2FA:', error);
            return { success: false, error: error.message };
        }
    },

    // Disable 2FA in Firestore
    async disable2FA() {
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                twoFAEnabled: false,
                twoFAPhone: null,
                twoFADisabledAt: serverTimestamp()
            });

            // Update local data
            currentUserData.twoFAEnabled = false;
            currentUserData.twoFAPhone = null;

            this.init(); // Refresh UI
            return { success: true };
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            return { success: false, error: error.message };
        }
    }
};

// 🔐 2FA Toggle Event Listener
if (DOMElements.twoFAToggle) {
    DOMElements.twoFAToggle.addEventListener('change', async (e) => {
        const isEnabling = e.target.checked;

        if (isEnabling) {
            // Show phone number modal
            openModal(DOMElements.twoFAPhoneModalOverlay);
            // Pre-fill with user's current phone if available (in 233XXXXXXXXX or 0XXXXXXXXX format)
            if (DOMElements.twoFAPhoneInput && currentUserData.mobile) {
                // Just use the mobile as-is (no + symbol)
                DOMElements.twoFAPhoneInput.value = currentUserData.mobile;
            }
        } else {
            // Disable 2FA
            const confirm = window.confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.');
            if (confirm) {
                showSpinner(true);
                const result = await TwoFAManager.disable2FA();
                showSpinner(false);

                if (result.success) {
                    showToast('2FA Disabled', 'Two-Factor Authentication has been disabled.', 3000);
                } else {
                    showToast('Error', result.error || 'Failed to disable 2FA', 3000, true);
                    e.target.checked = true; // Revert toggle
                }
            } else {
                e.target.checked = true; // Revert toggle
            }
        }
    });
}

// 🔐 Send 2FA Code Button
if (DOMElements.sendTwoFACodeBtn) {
    DOMElements.sendTwoFACodeBtn.addEventListener('click', async () => {
        const phoneNumber = DOMElements.twoFAPhoneInput.value.trim();

        // Validate phone number (233XXXXXXXXX or 0XXXXXXXXX format)
        if (!phoneNumber) {
            showToast('Error', 'Please enter a phone number', 3000, true);
            return;
        }

        // Accept Ghana formats: 233XXXXXXXXX or 0XXXXXXXXX
        const phoneRegex = /^(233\d{9}|0\d{9})$/;
        if (!phoneRegex.test(phoneNumber)) {
            showToast('Error', 'Invalid phone format. Use 233XXXXXXXXX or 0XXXXXXXXX', 3000, true);
            return;
        }

        showSpinner(true);
        const result = await TwoFAManager.sendCode(phoneNumber, currentUser.uid);
        showSpinner(false);

        if (result.success) {
            TwoFAManager.pendingPhoneNumber = phoneNumber;
            closeModal(DOMElements.twoFAPhoneModalOverlay);
            openModal(DOMElements.twoFAVerifyModalOverlay);

            // Show phone number in verify modal
            if (DOMElements.twoFAVerifyPhoneDisplay) {
                DOMElements.twoFAVerifyPhoneDisplay.textContent = phoneNumber;
            }

            // Clear code input
            if (DOMElements.twoFAVerifyCodeInput) {
                DOMElements.twoFAVerifyCodeInput.value = '';
            }

            showToast('Code Sent', 'Verification code sent to your phone', 3000);
        } else {
            showToast('Error', result.error || 'Failed to send code', 3000, true);
        }
    });
}

// 🔐 Verify 2FA Code Button
if (DOMElements.verifyTwoFACodeBtn) {
    DOMElements.verifyTwoFACodeBtn.addEventListener('click', async () => {
        const code = DOMElements.twoFAVerifyCodeInput.value.trim();

        if (!code || code.length !== 6) {
            showToast('Error', 'Please enter the 6-digit code', 3000, true);
            return;
        }

        showSpinner(true);
        const result = await TwoFAManager.verifyCode(code, currentUser.uid);

        if (result.success) {
            // Enable 2FA in database
            const enableResult = await TwoFAManager.enable2FA(TwoFAManager.pendingPhoneNumber);
            showSpinner(false);

            if (enableResult.success) {
                closeModal(DOMElements.twoFAVerifyModalOverlay);
                showToast('2FA Enabled', 'Two-Factor Authentication is now active!', 3000);
                TwoFAManager.pendingPhoneNumber = null;
            } else {
                showToast('Error', enableResult.error || 'Failed to enable 2FA', 3000, true);
            }
        } else {
            showSpinner(false);
            showToast('Error', result.error || 'Invalid code', 3000, true);
        }
    });
}

// 🔐 Resend 2FA Code Button
if (DOMElements.resendTwoFACodeBtn) {
    DOMElements.resendTwoFACodeBtn.addEventListener('click', async () => {
        if (!TwoFAManager.pendingPhoneNumber) {
            showToast('Error', 'No phone number found', 3000, true);
            return;
        }

        showSpinner(true);
        const result = await TwoFAManager.sendCode(TwoFAManager.pendingPhoneNumber, currentUser.uid);
        showSpinner(false);

        if (result.success) {
            showToast('Code Resent', 'New verification code sent', 3000);
        } else {
            showToast('Error', result.error || 'Failed to resend code', 3000, true);
        }
    });
}

// ============================================================================
// 🎫 GOLDEN TICKET / BECOME AGENT FUNCTIONALITY
// ============================================================================

// Show/Hide Become Agent Button based on user status
function updateBecomeAgentButtonVisibility() {
    if (!DOMElements.becomeAgentBtn) return;

    // Show button only if user is NOT already an agent and NOT pending approval
    if (currentUserData && !currentUserData.isGoldenActivated && currentUserData.goldenTicketStatus !== 'pending_approval') {
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
        if (DOMElements.goldenTicketPriceDisplay) {
            DOMElements.goldenTicketPriceDisplay.textContent = goldenTicketPrice.toFixed(2);
        }
        if (DOMElements.goldenTicketModalBalance) {
            DOMElements.goldenTicketModalBalance.textContent = (currentUserData.balance || 0).toFixed(2);
        }

        // Check if user has sufficient balance
        const hasSufficientBalance = (currentUserData.balance || 0) >= goldenTicketPrice;

        if (DOMElements.goldenTicketBalanceWarning) {
            DOMElements.goldenTicketBalanceWarning.style.display = hasSufficientBalance ? 'none' : 'block';
        }

        // Reset checkbox
        if (DOMElements.goldenTicketAgreeCheckbox) {
            DOMElements.goldenTicketAgreeCheckbox.checked = false;
        }
        if (DOMElements.goldenTicketPurchaseBtn) {
            DOMElements.goldenTicketPurchaseBtn.disabled = true;
        }

        openModal(DOMElements.goldenTicketModalOverlay);
    });
}

// Enable/Disable purchase button based on checkbox
if (DOMElements.goldenTicketAgreeCheckbox) {
    DOMElements.goldenTicketAgreeCheckbox.addEventListener('change', (e) => {
        if (!DOMElements.goldenTicketPurchaseBtn) return;
        const checked = !!e.target.checked;
        // Also ensure user has sufficient balance before enabling
        const goldenTicketPrice = (siteSettings && siteSettings.goldenTicketPrice) ? siteSettings.goldenTicketPrice : 40.00;
        const userBalance = (currentUserData && typeof currentUserData.balance === 'number') ? currentUserData.balance : 0;
        const canEnable = checked && (userBalance >= goldenTicketPrice);
        DOMElements.goldenTicketPurchaseBtn.disabled = !canEnable;
        // If not enabled because of balance, show a subtle hint in the modal warning
        if (!canEnable && checked) {
            if (DOMElements.goldenTicketBalanceWarning) DOMElements.goldenTicketBalanceWarning.style.display = 'block';
        } else {
            if (DOMElements.goldenTicketBalanceWarning) DOMElements.goldenTicketBalanceWarning.style.display = (userBalance >= goldenTicketPrice) ? 'none' : 'block';
        }
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
                role: 'agent', // ✅ SET ROLE TO AGENT (lowercase for consistency)
                isGoldenActivated: true, // ✅ ACTIVATED IMMEDIATELY
                isApproved: true, // ✅ APPROVED AUTOMATICALLY
                goldenTicketPurchasedAt: serverTimestamp(),
                goldenTicketPurchaseAmount: goldenTicketPrice,
                goldenTicketStatus: 'activated' // Changed from pending_approval
            });

            // Create transaction record
            await addDoc(collection(db, 'transactions'), {
                userId: currentUser.uid,
                type: 'golden_ticket_purchase',
                amount: goldenTicketPrice,
                balanceBefore: userBalance,
                balanceAfter: newBalance,
                status: 'completed',
                description: 'Golden Ticket Purchase - Agent Status Activated',
                createdAt: serverTimestamp()
            });

            // Create notification for user
            await addDoc(collection(db, 'notifications'), {
                userId: currentUser.uid,
                title: '🎉 Agent Status Activated!',
                message: 'Congratulations! You now have access to discounted agent prices on all data packages.',
                type: 'success',
                isRead: false,
                createdAt: serverTimestamp()
            });

            // Create notification for admin (for records)
            await addDoc(collection(db, 'adminNotifications'), {
                type: 'golden_ticket_purchase',
                userId: currentUser.uid,
                userEmail: currentUserData.email,
                userName: currentUserData.fullName || 'Unknown',
                amount: goldenTicketPrice,
                status: 'activated',
                isRead: false,
                createdAt: serverTimestamp()
            });

            // Update local user data
            currentUserData.balance = newBalance;
            currentUserData.role = 'agent'; // ✅ UPDATE LOCAL ROLE (lowercase for consistency)
            currentUserData.isGoldenActivated = true;
            currentUserData.isApproved = true;
            currentUserData.goldenTicketStatus = 'activated';

            showToast('🎉 Agent Activated!', 'You are now an Agent! Refresh to see your discounted prices.', 5000, false);
            closeModal(DOMElements.goldenTicketModalOverlay);

            // Update UI
            updateBecomeAgentButtonVisibility();
            updateWalletDisplay();
            updateUserRoleUI(); // Refresh role display in sidebar and profile
            updateProfileDisplay(); // Refresh profile page display

            // Reload packages to show agent prices
            if (typeof loadNetworkPackages === 'function') {
                loadNetworkPackages();
            }

        } catch (error) {
            console.error('Golden Ticket purchase error:', error);
            showToast('Purchase Failed', error.message || 'Failed to complete purchase.', 4000, true);
        } finally {
            toggleButtonLoading(DOMElements.goldenTicketPurchaseBtn, false);
        }
    });
}

// ========================================
// COMMUNITY POPUP FUNCTIONALITY
// ========================================
const communityPopupOverlay = document.getElementById('communityPopupOverlay');
const communityPopupClose = document.getElementById('communityPopupClose');
const communityMaybeLaterBtn = document.getElementById('communityMaybeLaterBtn');
const dontShowAgainCheckbox = document.getElementById('dontShowAgainCheckbox');
const joinWhatsAppBtn = document.getElementById('joinWhatsAppBtn');

function showCommunityPopup() {
    // Check if user has chosen not to show again
    const dontShowAgain = localStorage.getItem('communityPopupDontShow');
    if (dontShowAgain === 'true') {
        return;
    }

    // Show popup after 3 seconds
    setTimeout(() => {
        if (communityPopupOverlay) {
            communityPopupOverlay.classList.add('show');
        }
    }, 3000);
}

function hideCommunityPopup() {
    if (communityPopupOverlay) {
        communityPopupOverlay.classList.remove('show');

        // Save preference if checkbox is checked
        if (dontShowAgainCheckbox && dontShowAgainCheckbox.checked) {
            localStorage.setItem('communityPopupDontShow', 'true');
        }
    }
}

// Close popup when clicking close button
if (communityPopupClose) {
    communityPopupClose.addEventListener('click', hideCommunityPopup);
}

// Close popup when clicking "Maybe Later"
if (communityMaybeLaterBtn) {
    communityMaybeLaterBtn.addEventListener('click', hideCommunityPopup);
}

// Close popup when clicking outside
if (communityPopupOverlay) {
    communityPopupOverlay.addEventListener('click', (e) => {
        if (e.target === communityPopupOverlay) {
            hideCommunityPopup();
        }
    });
}

// Track WhatsApp click and close popup
if (joinWhatsAppBtn) {
    joinWhatsAppBtn.addEventListener('click', () => {
        // Mark as don't show again automatically when they join
        localStorage.setItem('communityPopupDontShow', 'true');
        hideCommunityPopup();
    });
}

// Show popup on page load, if not hidden already (now handled in handleAuthStateChange for new users)
// showCommunityPopup();

// =========================================================================
// NEW: BECOME AN AGENT LOGIC
// =========================================================================

// ✅ REMOVED: Duplicate "Become Agent" listener - Now using Golden Ticket system only

// =========================================================================
// NEW: STORE ORDERS PAGE FUNCTIONS
// =========================================================================
async function fetchStoreOrders() {
    if (!currentUser || !currentUserData || !currentUserData.storeConfig) {
        return { orders: [], stats: {} };
    }

    try {
        const ordersRef = collection(db, 'storeOrders'); // Assuming a 'storeOrders' collection
        const q = query(ordersRef, where('merchantId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        let totalOrders = 0;
        let pendingOrders = 0;
        let completedOrders = 0;
        let totalRevenue = 0;
        const orders = [];

        querySnapshot.forEach(docSnap => {
            const order = { id: docSnap.id, ...docSnap.data() };
            orders.push(order);
            totalOrders++;

            // Calculate revenue from profit (sellingPrice - costPrice) or use sellingPrice
            const orderRevenue = parseFloat(order.profit) || parseFloat(order.sellingPrice) || parseFloat(order.amount) || 0;
            totalRevenue += orderRevenue;

            if (order.status === 'pending') {
                pendingOrders++;
            } else if (order.status === 'completed') {
                completedOrders++;
            }
        });

        const stats = {
            totalOrders,
            pendingOrders,
            completedOrders,
            totalRevenue
        };

        return { orders, stats };

    } catch (error) {
        console.error("Error fetching store orders:", error);
        showToast("Error", "Failed to load store orders.", 3000, true);
        return { orders: [], stats: {} };
    }
}

async function renderStoreOrders() {
    if (!DOMElements.storeOrdersTableBody) return;

    DOMElements.storeOrdersTableBody.innerHTML = `<tr><td colspan="8" class="no-data-row"><div class="no-data-message"><i class="fas fa-spinner fa-spin"></i><p>Loading orders...</p></div></td></tr>`;
    showSpinner(true);

    try {
        const { orders, stats } = await fetchStoreOrders();

        if (DOMElements.storeOrdersTotal) DOMElements.storeOrdersTotal.textContent = stats.totalOrders;
        if (DOMElements.storeOrdersPending) DOMElements.storeOrdersPending.textContent = stats.pendingOrders;
        if (DOMElements.storeOrdersCompleted) DOMElements.storeOrdersCompleted.textContent = stats.completedOrders;
        if (DOMElements.storeOrdersRevenue) DOMElements.storeOrdersRevenue.textContent = formatCurrencyGHS(stats.totalRevenue);

        if (orders.length === 0) {
            DOMElements.storeOrdersTableBody.innerHTML = `<tr><td colspan="8" class="no-data-row"><div class="no-data-message"><i class="fas fa-inbox"></i><p>No orders yet</p></div></td></tr>`;
            return;
        }

        DOMElements.storeOrdersTableBody.innerHTML = orders.map(order => {
            const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
            const formattedDate = date.toLocaleDateString('en-GB');
            const statusClass = `status-${order.status.toLowerCase()}`;
            const profit = (order.amount || 0) - (order.costPrice || 0); // Assuming costPrice exists on order
            
            return `
                <tr>
                    <td>${order.displayOrderId || order.id.substring(0, 8)}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.productName || 'N/A'}</td>
                    <td>${order.customerPhone || 'N/A'}</td>
                    <td>${formatCurrencyGHS(order.amount)}</td>
                    <td>${formatCurrencyGHS(profit)}</td>
                    <td>${formattedDate}</td>
                    <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Error rendering store orders:", error);
        DOMElements.storeOrdersTableBody.innerHTML = `<tr><td colspan="8" class="no-data-row"><div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Error loading orders.</p></div></td></tr>`;
    } finally {
        showSpinner(false);
    }
}

// =========================================================================
// NEW: STORE CUSTOMERS PAGE FUNCTIONS
// =========================================================================
async function fetchStoreCustomers() {
    if (!currentUser || !currentUserData || !currentUserData.storeConfig) {
        return { customers: [], stats: {} };
    }

    try {
        const customersRef = collection(db, 'storeCustomers'); // Assuming a 'storeCustomers' collection
        const q = query(customersRef, where('merchantId', '==', currentUser.uid), orderBy('lastOrderAt', 'desc'));
        const querySnapshot = await getDocs(q);

        let totalCustomers = 0;
        let activeCustomers = 0; // Define based on recent orders, for now all
        let totalSpent = 0;
        let totalOrdersCount = 0;
        const customers = [];

        querySnapshot.forEach(docSnap => {
            const customer = { id: docSnap.id, ...docSnap.data() };
            customers.push(customer);
            totalCustomers++;
            totalSpent += customer.totalSpent || 0;
            totalOrdersCount += customer.totalOrders || 0;
            if (customer.status === 'active') activeCustomers++; // Assuming a status field for active
        });

        const averageOrderValue = totalOrdersCount > 0 ? totalSpent / totalOrdersCount : 0;

        const stats = {
            totalCustomers,
            activeCustomers,
            averageOrderValue: averageOrderValue,
        };

        return { customers, stats };

    } catch (error) {
        console.error("Error fetching store customers:", error);
        showToast("Error", "Failed to load store customers.", 3000, true);
        return { customers: [], stats: {} };
    }
}

async function renderStoreCustomers() {
    if (!DOMElements.storeCustomersTableBody) return;

    DOMElements.storeCustomersTableBody.innerHTML = `<tr><td colspan="6" class="no-data-row"><div class="no-data-message"><i class="fas fa-spinner fa-spin"></i><p>Loading customers...</p></div></td></tr>`;
    showSpinner(true);

    try {
        const { customers, stats } = await fetchStoreCustomers();

        if (DOMElements.storeCustomersTotal) DOMElements.storeCustomersTotal.textContent = stats.totalCustomers;
        if (DOMElements.storeCustomersActive) DOMElements.storeCustomersActive.textContent = stats.activeCustomers;
        if (DOMElements.storeCustomersAvgOrder) DOMElements.storeCustomersAvgOrder.textContent = formatCurrencyGHS(stats.averageOrderValue);

        if (customers.length === 0) {
            DOMElements.storeCustomersTableBody.innerHTML = `<tr><td colspan="6" class="no-data-row"><div class="no-data-message"><i class="fas fa-users-slash"></i><p>No customers yet</p></div><button class="btn-start-adding" id="startAddingCustomersBtn" style="display:none;">Add First Customer</button></td></tr>`;
            return;
        }

        DOMElements.storeCustomersTableBody.innerHTML = customers.map(customer => {
            const lastOrderDate = customer.lastOrderAt?.toDate ? customer.lastOrderAt.toDate().toLocaleDateString('en-GB') : 'N/A';
            const statusClass = `status-${customer.status?.toLowerCase() || 'inactive'}`;

            return `
                <tr>
                    <td>${customer.name || 'N/A'}</td>
                    <td>${customer.phone || 'N/A'}</td>
                    <td>${customer.totalOrders || 0}</td>
                    <td>${formatCurrencyGHS(customer.totalSpent || 0)}</td>
                    <td>${lastOrderDate}</td>
                    <td><span class="status-badge ${statusClass}">${customer.status || 'Inactive'}</span></td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Error rendering store customers:", error);
        DOMElements.storeCustomersTableBody.innerHTML = `<tr><td colspan="6" class="no-data-row"><div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Error loading customers.</p></div></td></tr>`;
    } finally {
        showSpinner(false);
    }
}

// =========================================================================
// NEW: ADD/VIEW PRODUCTS PAGE FUNCTIONS
// =========================================================================

// Event listener for product network tabs on "Add Product" page
if (DOMElements.addProductNetworkTabs) {
    DOMElements.addProductNetworkTabs.querySelectorAll('.product-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            DOMElements.addProductNetworkTabs.querySelectorAll('.product-tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderAvailableProducts(this.dataset.network);
        });
    });
}

async function renderAvailableProducts(networkKey) {
    if (!DOMElements.availablePackagesTableBody || !currentUserData) return;

    DOMElements.availablePackagesTableBody.innerHTML = `<tr><td colspan="6" class="no-data-row"><div class="no-data-message"><i class="fas fa-spinner fa-spin"></i><p>Loading packages...</p></div></td></tr>`;
    showSpinner(true);

    try {
        const availablePackages = networkPackages[networkKey] || [];
        const myStoreProducts = currentUserData.storeProducts || [];

        if (availablePackages.length === 0) {
            DOMElements.availablePackagesTableBody.innerHTML = `<tr><td colspan="6" class="no-data-row"><div class="no-data-message"><i class="fas fa-box-open"></i><p>No data packages available for this network.</p></div></td></tr>`;
            return;
        }

        const rowsHTML = availablePackages.map(pkg => {
            const isAdded = myStoreProducts.some(p => p.packageId === pkg.id && p.network === pkg.network);
            const addedProduct = myStoreProducts.find(p => p.packageId === pkg.id && p.network === pkg.network);

            // Use agent price if user is agent/super_agent, otherwise customer price
            const userRole = (currentUserData?.role || 'customer').toLowerCase();
            const isAgent = userRole === 'agent' || userRole === 'super_agent';
            const costPrice = isAgent ? (pkg.agentPrice || pkg.customerPrice) : pkg.customerPrice;

            // Debug logging
            if (pkg.id === availablePackages[0].id) { // Log once per render
                console.log('🔍 Role & Pricing Debug:', {
                    userRole: currentUserData?.role,
                    normalizedRole: userRole,
                    isAgent: isAgent,
                    samplePackage: pkg.name,
                    agentPrice: pkg.agentPrice,
                    customerPrice: pkg.customerPrice,
                    finalCostPrice: costPrice
                });
            }

            const sellingPrice = addedProduct?.sellingPrice || (costPrice * 1.1).toFixed(2); // Default 10% markup
            const profitMargin = (sellingPrice - costPrice).toFixed(2);

            return `
                <tr>
                    <td>${pkg.name || `${pkg.dataSize || pkg.minutes} Bundle`}</td>
                    <td>${pkg.network.toUpperCase()}</td>
                    <td>${formatCurrencyGHS(costPrice)}</td>
                    <td>
                        <input type="number" class="selling-price-input" value="${sellingPrice}"
                            data-package-id="${pkg.id}" data-network="${pkg.network}" data-cost-price="${costPrice}"
                            min="${costPrice}" step="0.01">
                    </td>
                    <td>${formatCurrencyGHS(profitMargin)}</td>
                    <td>
                        <button class="btn-add-product"
                            data-package='${JSON.stringify(pkg)}'
                            data-cost-price="${costPrice}"
                            ${isAdded ? 'disabled' : ''}>
                            ${isAdded ? 'Added' : 'Add to Store'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        DOMElements.availablePackagesTableBody.innerHTML = rowsHTML;

        // Add listeners for "Add to Store" buttons
        DOMElements.availablePackagesTableBody.querySelectorAll('.btn-add-product').forEach(button => {
            button.addEventListener('click', async function() {
                if (this.disabled) return;
                const pkgData = JSON.parse(this.dataset.package);
                const costPrice = parseFloat(this.dataset.costPrice); // Get the role-based cost price
                const input = this.closest('tr').querySelector('.selling-price-input');
                const sellingPrice = parseFloat(input.value);

                console.log('📦 Adding product to store:', {
                    packageId: pkgData.id,
                    packageName: pkgData.name,
                    network: pkgData.network,
                    userRole: currentUserData?.role,
                    isAgent: currentUserData?.role?.toLowerCase() === 'agent' || currentUserData?.role?.toLowerCase() === 'super_agent',
                    packageAgentPrice: pkgData.agentPrice,
                    packageCustomerPrice: pkgData.customerPrice,
                    calculatedCostPrice: costPrice,
                    userEnteredSellingPrice: sellingPrice,
                    profitMargin: (sellingPrice - costPrice).toFixed(2)
                });

                if (isNaN(sellingPrice) || sellingPrice < costPrice) {
                    showToast("Error", "Selling price must be valid and greater than or equal to cost price.", 3000, true);
                    return;
                }

                await addProductToStore(pkgData, sellingPrice, costPrice);
                // Re-render to update button state
                renderAvailableProducts(networkKey);
                renderMyStoreProducts(); // Also update view products page
            });
        });

        // Add listeners for selling price inputs to update profit margin in real-time
        DOMElements.availablePackagesTableBody.querySelectorAll('.selling-price-input').forEach(input => {
            // Real-time profit margin update (on input, not just on change)
            input.addEventListener('input', function() {
                const sellingPrice = parseFloat(this.value) || 0;
                const costPrice = parseFloat(this.dataset.costPrice) || 0;
                const profit = sellingPrice - costPrice;

                // Update the profit margin cell (next sibling's sibling)
                const profitCell = this.closest('tr').querySelector('td:nth-child(5)');
                if (profitCell) {
                    profitCell.textContent = formatCurrencyGHS(profit.toFixed(2));

                    // Visual feedback for invalid price
                    if (sellingPrice < costPrice) {
                        this.style.borderColor = '#e74c3c';
                        profitCell.style.color = '#e74c3c';
                    } else {
                        this.style.borderColor = '';
                        profitCell.style.color = '';
                    }
                }
            });

            // Handle updates for already-added products
            input.addEventListener('change', async function() {
                const packageId = this.dataset.packageId;
                const network = this.dataset.network;
                const costPrice = parseFloat(this.dataset.costPrice);
                const newSellingPrice = parseFloat(this.value);

                // Check if this product is already added
                const isProductAdded = currentUserData.storeProducts?.some(
                    p => p.packageId === packageId && p.network === network
                );

                if (!isProductAdded) {
                    // Not added yet, just validate
                    if (isNaN(newSellingPrice) || newSellingPrice < costPrice) {
                        showToast("Warning", "Selling price must be greater than or equal to cost price.", 3000, true);
                        this.value = (costPrice * 1.1).toFixed(2); // Reset to default
                        this.dispatchEvent(new Event('input')); // Update profit margin
                    }
                } else {
                    // Already added, update in Firestore
                    if (isNaN(newSellingPrice) || newSellingPrice < costPrice) {
                        showToast("Error", "Selling price must be valid and greater than cost price.", 3000, true);
                        this.value = this.min; // Revert to min
                        this.dispatchEvent(new Event('input')); // Update profit margin
                        return;
                    }
                    await updateStoreProductSellingPrice(packageId, network, newSellingPrice);
                    renderMyStoreProducts(); // Update view products page only
                }
            });
        });

    } catch (error) {
        console.error("Error rendering available products:", error);
        DOMElements.availablePackagesTableBody.innerHTML = `<tr><td colspan="6" class="no-data-row"><div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Error loading products.</p></div></td></tr>`;
    } finally {
        showSpinner(false);
    }
}

async function addProductToStore(packageData, sellingPrice, costPrice) {
    if (!currentUserData || !currentUser) {
        console.error('❌ Cannot add product - user not logged in');
        showToast("Error", "You must be logged in to add products.", 3000, true);
        return;
    }

    showSpinner(true);
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const newProduct = {
            packageId: packageData.id,
            network: packageData.network,
            costPrice: costPrice, // Use the role-based cost price passed in
            sellingPrice: parseFloat(sellingPrice),
            addedAt: Date.now(), // Use Date.now() instead of serverTimestamp() because this is inside an array
            isActive: true,
            name: packageData.name || `${packageData.dataSize || packageData.minutes} Bundle`,
            description: packageData.description || `${packageData.dataSize || packageData.minutes} for ${packageData.validity || 'N/A'}`,
        };

        console.log('💾 Saving product to Firestore:', newProduct);

        const currentStoreProducts = currentUserData.storeProducts || [];

        // Check if product already exists
        const existingProduct = currentStoreProducts.find(p =>
            p.packageId === newProduct.packageId && p.network === newProduct.network
        );

        if (existingProduct) {
            console.warn('⚠️ Product already exists in store');
            showToast("Warning", "This product is already in your store.", 3000, true);
            showSpinner(false);
            return;
        }

        const updatedStoreProducts = [...currentStoreProducts, newProduct];

        await updateDoc(userRef, { storeProducts: updatedStoreProducts });
        currentUserData.storeProducts = updatedStoreProducts; // Update local data

        console.log('✅ Product added successfully to store');
        showToast("Success", `${newProduct.name} added to your store!`, 2000);

    } catch (error) {
        console.error("❌ Error adding product to store:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        showToast("Error", `Failed to add product: ${error.message}`, 4000, true);
    } finally {
        showSpinner(false);
    }
}

async function updateStoreProductSellingPrice(packageId, network, newSellingPrice) {
    if (!currentUserData || !currentUser) return;
    showSpinner(true);
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const currentStoreProducts = currentUserData.storeProducts || [];

        const updatedStoreProducts = currentStoreProducts.map(p => {
            if (p.packageId === packageId && p.network === network) {
                return { ...p, sellingPrice: parseFloat(newSellingPrice) };
            }
            return p;
        });

        await updateDoc(userRef, { storeProducts: updatedStoreProducts });
        currentUserData.storeProducts = updatedStoreProducts; // Update local data
        showToast("Success", "Product selling price updated.", 1500);

    } catch (error) {
        console.error("Error updating product selling price:", error);
        showToast("Error", "Failed to update product price.", 3000, true);
    } finally {
        showSpinner(false);
    }
}

async function toggleStoreProductStatus(packageId, network, currentStatus) {
    if (!currentUserData || !currentUser) return;
    showSpinner(true);
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const currentStoreProducts = currentUserData.storeProducts || [];

        const updatedStoreProducts = currentStoreProducts.map(p => {
            if (p.packageId === packageId && p.network === network) {
                return { ...p, isActive: !currentStatus };
            }
            return p;
        });

        await updateDoc(userRef, { storeProducts: updatedStoreProducts });
        currentUserData.storeProducts = updatedStoreProducts; // Update local data
        showToast("Success", "Product status updated.", 1500);

    } catch (error) {
        console.error("Error toggling product status:", error);
        showToast("Error", "Failed to update product status.", 3000, true);
    } finally {
        showSpinner(false);
    }
}

async function removeStoreProduct(packageId, network) {
    if (!currentUserData || !currentUser) return;
    if (!confirm("Are you sure you want to remove this product from your store?")) return;

    showSpinner(true);
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const currentStoreProducts = currentUserData.storeProducts || [];

        const updatedStoreProducts = currentStoreProducts.filter(p => !(p.packageId === packageId && p.network === network));

        await updateDoc(userRef, { storeProducts: updatedStoreProducts });
        currentUserData.storeProducts = updatedStoreProducts; // Update local data
        showToast("Success", "Product removed from store.", 2000);

    } catch (error) {
        console.error("Error removing product from store:", error);
        showToast("Error", "Failed to remove product.", 3000, true);
    } finally {
        showSpinner(false);
        renderMyStoreProducts(); // Re-render the list
        const activeTab = DOMElements.addProductNetworkTabs.querySelector('.product-tab-btn.active');
        if (activeTab) renderAvailableProducts(activeTab.dataset.network); // Also refresh add products
    }
}


async function renderMyStoreProducts() {
    if (!DOMElements.viewProductsTableBody || !currentUserData) return;

    DOMElements.viewProductsTableBody.innerHTML = `<tr><td colspan="7" class="no-data-row"><div class="no-data-message"><i class="fas fa-spinner fa-spin"></i><p>Loading your products...</p></div></td></tr>`;
    showSpinner(true);

    try {
        const myStoreProducts = currentUserData.storeProducts || [];

        if (myStoreProducts.length === 0) {
            DOMElements.viewProductsTableBody.innerHTML = `<tr><td colspan="7" class="no-data-row"><div class="no-data-message"><i class="fas fa-box"></i><p>No products added yet</p><button class="btn-start-adding" id="startAddingBtn">Start Adding Products</button></div></td></tr>`;
            if (DOMElements.startAddingBtn) {
                DOMElements.startAddingBtn.addEventListener('click', () => navigateToPage('add-product', showAddProductPage, 'Add Product'));
            }
            return;
        }

        const rowsHTML = myStoreProducts.map(product => {
            const profit = (product.sellingPrice - product.costPrice).toFixed(2);
            const statusClass = product.isActive ? 'active' : 'inactive';
            const statusText = product.isActive ? 'Active' : 'Inactive';

            return `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.network.toUpperCase()}</td>
                    <td>${formatCurrencyGHS(product.costPrice)}</td>
                    <td>${formatCurrencyGHS(product.sellingPrice)}</td>
                    <td>${formatCurrencyGHS(profit)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn-edit" data-package-id="${product.packageId}" data-network="${product.network}" data-current-price="${product.sellingPrice}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-toggle-status" data-package-id="${product.packageId}" data-network="${product.network}" data-current-status="${product.isActive}"><i class="fas fa-toggle-${product.isActive ? 'on' : 'off'}"></i> ${product.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button class="btn-delete" data-package-id="${product.packageId}" data-network="${product.network}"><i class="fas fa-trash-alt"></i> Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        DOMElements.viewProductsTableBody.innerHTML = rowsHTML;

        // Add listeners for action buttons
        DOMElements.viewProductsTableBody.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', async function() {
                const packageId = this.dataset.packageId;
                const network = this.dataset.network;
                const currentPrice = this.dataset.currentPrice;

                const newPrice = prompt(`Enter new selling price for ${network.toUpperCase()} product (current: ${formatCurrencyGHS(currentPrice)}):`);
                if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
                    await updateStoreProductSellingPrice(packageId, network, parseFloat(newPrice));
                    renderMyStoreProducts(); // Re-render to reflect changes
                } else if (newPrice !== null) {
                    showToast("Error", "Invalid price entered.", 3000, true);
                }
            });
        });

        DOMElements.viewProductsTableBody.querySelectorAll('.btn-toggle-status').forEach(button => {
            button.addEventListener('click', async function() {
                const packageId = this.dataset.packageId;
                const network = this.dataset.network;
                const currentStatus = this.dataset.currentStatus === 'true';
                await toggleStoreProductStatus(packageId, network, currentStatus);
                renderMyStoreProducts(); // Re-render to reflect changes
            });
        });

        DOMElements.viewProductsTableBody.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async function() {
                const packageId = this.dataset.packageId;
                const network = this.dataset.network;
                await removeStoreProduct(packageId, network);
            });
        });


    } catch (error) {
        console.error("Error rendering my store products:", error);
        DOMElements.viewProductsTableBody.innerHTML = `<tr><td colspan="7" class="no-data-row"><div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Error loading your products.</p></div></td></tr>`;
    } finally {
        showSpinner(false);
    }
}

if (DOMElements.addMoreProductsBtn) {
    DOMElements.addMoreProductsBtn.addEventListener('click', () => {
        navigateToPage('add-product', showAddProductPage, 'Add Product');
    });
}

// =========================================================================
// STORE PURCHASE WITH PAYSTACK POPUP
// =========================================================================

/**
 * Initialize Paystack popup payment for store purchases
 * @param {Object} productData - The store product data
 * @param {Object} merchantData - The merchant/store owner data
 * @param {string} customerPhone - Customer's phone number
 * @param {string} customerEmail - Customer's email (optional)
 */
async function initiateStorePaystackPopup(productData, merchantData, customerPhone, customerEmail = null) {
    try {
        console.log('🛒 Initiating store purchase with Paystack popup:', {
            product: productData.name,
            price: productData.sellingPrice,
            merchant: merchantData.storeConfig?.brandName || 'Store',
            customerPhone: customerPhone
        });

        // Fetch store Paystack public key from Firestore
        const storeControlsRef = doc(db, 'config', 'storeControls');
        const storeControlsSnap = await getDoc(storeControlsRef);

        if (!storeControlsSnap.exists() || !storeControlsSnap.data().storePaystackPublicKey) {
            console.error('❌ Store Paystack public key not configured');
            showToast('Error', 'Payment system not configured. Please contact support.', 4000, true);
            return;
        }

        const paystackPublicKey = storeControlsSnap.data().storePaystackPublicKey;

        // Generate unique reference
        const reference = `STORE_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        // Convert price to kobo (Paystack uses kobo for GHS)
        const amountInKobo = Math.round(productData.sellingPrice * 100);

        console.log('💳 Opening Paystack popup with:', {
            reference: reference,
            amount: amountInKobo,
            email: customerEmail || `${customerPhone}@customer.local`
        });

        // Initialize Paystack Popup
        const handler = PaystackPop.setup({
            key: paystackPublicKey,
            email: customerEmail || `${customerPhone}@customer.local`,
            amount: amountInKobo,
            currency: 'GHS',
            ref: reference,
            metadata: {
                custom_fields: [
                    {
                        display_name: "Product",
                        variable_name: "product_name",
                        value: productData.name
                    },
                    {
                        display_name: "Merchant",
                        variable_name: "merchant_id",
                        value: merchantData.uid
                    },
                    {
                        display_name: "Customer Phone",
                        variable_name: "customer_phone",
                        value: customerPhone
                    }
                ]
            },
            onClose: function() {
                console.log('⚠️ Payment popup closed by user');
                showToast('Info', 'Payment cancelled.', 3000, false);
            },
            callback: async function(response) {
                console.log('✅ Payment successful! Reference:', response.reference);

                // Create store order in Firestore
                await createStoreOrder({
                    merchantId: merchantData.uid,
                    merchantName: merchantData.storeConfig?.brandName || 'Store',
                    productId: productData.packageId,
                    productName: productData.name,
                    network: productData.network,
                    customerPhone: customerPhone,
                    customerEmail: customerEmail,
                    beneficiaryNumber: customerPhone,
                    costPrice: productData.costPrice,
                    sellingPrice: productData.sellingPrice,
                    profit: productData.sellingPrice - productData.costPrice,
                    paymentReference: response.reference,
                    paymentStatus: 'paid',
                    status: 'Pending',
                    createdAt: serverTimestamp()
                });

                showToast('Success', 'Purchase successful! Your order is being processed.', 4000, false);
            }
        });

        handler.openIframe();

    } catch (error) {
        console.error('❌ Error initiating store Paystack popup:', error);
        showToast('Error', `Payment failed: ${error.message}`, 4000, true);
    }
}

/**
 * Create a store order in Firestore
 */
async function createStoreOrder(orderData) {
    try {
        console.log('📝 Creating store order:', orderData);

        // Generate display order ID
        const displayOrderId = `SO${Date.now().toString().slice(-8)}`;

        const orderWithId = {
            ...orderData,
            displayOrderId: displayOrderId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const orderRef = await addDoc(collection(db, 'storeOrders'), orderWithId);

        console.log('✅ Store order created successfully:', orderRef.id);

        // Update merchant's store metrics
        await updateMerchantStoreMetrics(orderData.merchantId, orderData.profit);

        return orderRef.id;

    } catch (error) {
        console.error('❌ Error creating store order:', error);
        throw error;
    }
}

/**
 * Update merchant's store metrics after a sale
 */
async function updateMerchantStoreMetrics(merchantId, profit) {
    try {
        const merchantRef = doc(db, 'users', merchantId);
        const merchantSnap = await getDoc(merchantRef);

        if (merchantSnap.exists()) {
            const currentMetrics = merchantSnap.data().storeMetrics || {
                totalOrders: 0,
                totalRevenue: 0,
                totalProfit: 0,
                availableBalance: 0
            };

            await updateDoc(merchantRef, {
                'storeMetrics.totalOrders': (currentMetrics.totalOrders || 0) + 1,
                'storeMetrics.totalRevenue': (currentMetrics.totalRevenue || 0) + profit,
                'storeMetrics.totalProfit': (currentMetrics.totalProfit || 0) + profit,
                'storeMetrics.availableForPayout': (currentMetrics.availableForPayout || 0) + profit,
                'storeMetrics.completedOrders': (currentMetrics.completedOrders || 0) + 1
            });

            console.log('✅ Merchant metrics updated');
        }
    } catch (error) {
        console.error('⚠️ Error updating merchant metrics:', error);
        // Don't throw - metrics update failure shouldn't block the order
    }
}


// =========================================================================
// NEW: PAYOUT PAGE FUNCTIONS
// =========================================================================
async function fetchPayoutData() {
    if (!currentUser || !currentUserData) {
        console.warn('⚠️ No user data available for payout fetch');
        return { metrics: {}, history: [] };
    }

    // Initialize storeMetrics if it doesn't exist
    const metrics = currentUserData.storeMetrics || {
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        availableBalance: 0,
        totalPayouts: 0,
        pendingPayouts: 0,
        availableForPayout: 0
    };

    console.log('📊 Fetching payout data for user:', currentUser.uid);
    console.log('Current store metrics:', metrics);

    try {
        const payoutHistoryRef = collection(db, 'payoutRequests');
        const q = query(
            payoutHistoryRef,
            where('merchantId', '==', currentUser.uid),
            orderBy('requestedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);

        const history = [];
        querySnapshot.forEach(docSnap => {
            history.push({ id: docSnap.id, ...docSnap.data() });
        });

        console.log('✅ Payout history loaded:', history.length, 'records');
        return { metrics, history };

    } catch (error) {
        console.error("❌ Error fetching payout data:", error);

        // Check if it's an index error
        if (error.message && error.message.includes('index')) {
            console.error('🔥 FIRESTORE INDEX REQUIRED!');

            // Extract the index creation link from error message if available
            // Silently log index error
            console.warn('Payout history index needed. See FIRESTORE_PAYOUT_INDEX.md');

            // Return metrics only (no history due to index error)
            return { metrics, history: [] };
        }

        // Other errors
        console.error('Error details:', error.message);
        showToast("Error", `Failed to load payout data: ${error.message}`, 4000, true);
        return { metrics, history: [] };
    }
}

async function renderPayoutPage() {
    if (!DOMElements.payoutAvailableBalance) return;

    DOMElements.payoutAvailableBalance.textContent = `GHS 0.00`;
    DOMElements.payoutTotalRevenue.textContent = `GHS 0.00`;
    DOMElements.payoutTotalWithdrawn.textContent = `GHS 0.00`;
    DOMElements.payoutPending.textContent = `GHS 0.00`;
    DOMElements.withdrawalHistoryTableBody.innerHTML = `<tr><td colspan="5" class="no-data-row"><div class="no-data-message"><i class="fas fa-spinner fa-spin"></i><p>Loading payout history...</p></div></td></tr>`;

    showSpinner(true);

    try {
        const { metrics, history } = await fetchPayoutData();

        if (DOMElements.payoutAvailableBalance) DOMElements.payoutAvailableBalance.textContent = formatCurrencyGHS(metrics.availableForPayout || 0);
        if (DOMElements.payoutTotalRevenue) DOMElements.payoutTotalRevenue.textContent = formatCurrencyGHS(metrics.totalRevenue || 0);
        if (DOMElements.payoutTotalWithdrawn) DOMElements.payoutTotalWithdrawn.textContent = formatCurrencyGHS(metrics.totalPayouts || 0);
        if (DOMElements.payoutPending) DOMElements.payoutPending.textContent = formatCurrencyGHS(metrics.pendingPayouts || 0);

        if (history.length === 0) {
            DOMElements.withdrawalHistoryTableBody.innerHTML = `<tr><td colspan="5" class="no-data-row"><div class="no-data-message"><i class="fas fa-receipt"></i><p>No withdrawal history</p></div></td></tr>`;
        } else {
            DOMElements.withdrawalHistoryTableBody.innerHTML = history.map(req => {
                const requestedDate = req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString('en-GB') : 'N/A';
                const paidDate = req.paidAt?.toDate ? req.paidAt.toDate().toLocaleDateString('en-GB') : 'N/A';
                const statusClass = `status-${req.status.toLowerCase()}`;
                return `
                    <tr>
                        <td>${req.id.substring(0, 8)}</td>
                        <td>${formatCurrencyGHS(req.amount)}</td>
                        <td>${requestedDate}</td>
                        <td><span class="status-badge ${statusClass}">${req.status}</span></td>
                        <td>${paidDate}</td>
                    </tr>
                `;
            }).join('');
        }

        // Enable/disable withdraw button based on balance
        const availableBalance = metrics.availableForPayout || 0;
        const minWithdrawal = 5.00; // Define minimum withdrawal amount
        if (DOMElements.requestWithdrawBtn) {
            DOMElements.requestWithdrawBtn.disabled = availableBalance < minWithdrawal;
        }
        if (DOMElements.balanceWarning) {
            DOMElements.balanceWarning.style.display = availableBalance < minWithdrawal ? 'flex' : 'none';
        }


    } catch (error) {
        console.error("Error rendering payout page:", error);
        DOMElements.withdrawalHistoryTableBody.innerHTML = `<tr><td colspan="5" class="no-data-row"><div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Error loading payout data.</p></div></td></tr>`;
    } finally {
        showSpinner(false);
    }
}

if (DOMElements.withdrawAmount) {
    DOMElements.withdrawAmount.addEventListener('input', function() {
        const amount = parseFloat(this.value);
        const availableBalance = parseFloat(DOMElements.payoutAvailableBalance?.textContent.replace('GHS ', '') || 0);
        const minWithdrawal = 5.00; // Needs to be consistent

        if (DOMElements.requestWithdrawBtn) {
            DOMElements.requestWithdrawBtn.disabled = isNaN(amount) || amount < minWithdrawal || amount > availableBalance;
        }
        if (DOMElements.balanceWarning) {
            DOMElements.balanceWarning.style.display = (isNaN(amount) || amount < minWithdrawal || amount > availableBalance) ? 'flex' : 'none';
        }
    });
}

// Request Withdrawal Button - Show Modal
if (DOMElements.requestWithdrawBtn) {
    DOMElements.requestWithdrawBtn.addEventListener('click', function() {
        const amount = parseFloat(DOMElements.withdrawAmount.value);
        const availableBalance = parseFloat(DOMElements.payoutAvailableBalance?.textContent.replace('GHS ', '') || 0);
        const minWithdrawal = 5.00;

        if (isNaN(amount) || amount < minWithdrawal || amount > availableBalance) {
            showToast("Error", "Invalid withdrawal amount. Please enter a valid amount.", 3000, true);
            return;
        }

        // Pre-fill the amount in modal
        const withdrawalAmountModal = document.getElementById('withdrawalAmountModal');
        if (withdrawalAmountModal) {
            withdrawalAmountModal.value = amount.toFixed(2);
        }

        // Clear other fields
        const momoName = document.getElementById('withdrawalMomoName');
        const phone = document.getElementById('withdrawalPhone');
        const network = document.getElementById('withdrawalNetwork');
        if (momoName) momoName.value = '';
        if (phone) phone.value = '';
        if (network) network.value = '';

        // Open modal
        openModal(document.getElementById('withdrawalDetailsModalOverlay'));
    });
}

// Handle Withdrawal Details Form Submission
const withdrawalDetailsForm = document.getElementById('withdrawalDetailsForm');
if (withdrawalDetailsForm) {
    withdrawalDetailsForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('withdrawalAmountModal').value);
        const momoName = document.getElementById('withdrawalMomoName').value.trim();
        const phone = document.getElementById('withdrawalPhone').value.trim();
        const network = document.getElementById('withdrawalNetwork').value;

        // Validation
        if (!momoName || !phone || !network) {
            showToast("Error", "Please fill in all fields.", 3000, true);
            return;
        }

        if (phone.length !== 10 || !phone.startsWith('0')) {
            showToast("Error", "Phone number must be 10 digits and start with 0.", 3000, true);
            return;
        }

        const submitBtn = document.getElementById('submitWithdrawalDetailsBtn');
        showSpinner(true);
        if (submitBtn) submitBtn.disabled = true;

        try {
            const payoutRequestRef = doc(collection(db, 'payoutRequests'));
            const userRef = doc(db, 'users', currentUser.uid);

            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User not found for payout.");

                const currentMetrics = userDoc.data().storeMetrics || {};
                const currentAvailable = currentMetrics.availableForPayout || 0;

                if (currentAvailable < amount) {
                    throw new Error("Insufficient available balance for this withdrawal.");
                }

                const newAvailable = currentAvailable - amount;
                const newPendingPayouts = (currentMetrics.pendingPayouts || 0) + amount;

                transaction.update(userRef, {
                    'storeMetrics.availableForPayout': newAvailable,
                    'storeMetrics.pendingPayouts': newPendingPayouts,
                });

                transaction.set(payoutRequestRef, {
                    merchantId: currentUser.uid,
                    merchantName: currentUserData.fullName,
                    merchantEmail: currentUserData.email,
                    amount: amount,
                    momoName: momoName,
                    momoPhone: phone,
                    momoNetwork: network,
                    status: 'pending',
                    requestedAt: serverTimestamp(),
                    paidAt: null,
                });
            });

            showToast("Success", `Withdrawal request for ${formatCurrencyGHS(amount)} submitted successfully!`, 5000);

            // Close modal
            closeModal(document.getElementById('withdrawalDetailsModalOverlay'));

            // Clear form
            DOMElements.withdrawAmount.value = '';
            withdrawalDetailsForm.reset();

            // Refresh data
            await fetchUserData(currentUser.uid);
            renderPayoutPage();

        } catch (error) {
            console.error("Error submitting payout request:", error);
            showToast("Error", error.message || "Failed to submit withdrawal request.", 4000, true);
        } finally {
            showSpinner(false);
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}


// =========================================================================
// NEW: STORE SETUP PAGE FUNCTIONS
// =========================================================================

// Add image preview functionality for brand logo upload
if (DOMElements.brandLogoFile) {
    DOMElements.brandLogoFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            if (DOMElements.logoPreview) DOMElements.logoPreview.style.display = 'none';
            return;
        }

        try {
            const base64String = await convertImageToBase64(file);
            if (DOMElements.logoPreviewImg) {
                DOMElements.logoPreviewImg.src = base64String;
            }
            if (DOMElements.logoPreview) {
                DOMElements.logoPreview.style.display = 'block';
            }
        } catch (error) {
            showToast("Error", error.message || "Failed to load image preview", 3000, true);
            e.target.value = ''; // Clear the file input
            if (DOMElements.logoPreview) DOMElements.logoPreview.style.display = 'none';
        }
    });
}

// Add preview functionality for network logos
const networkLogoHandlers = [
    { file: 'mtnLogoFile', preview: 'mtnLogoPreview', img: 'mtnLogoPreviewImg' },
    { file: 'telecelLogoFile', preview: 'telecelLogoPreview', img: 'telecelLogoPreviewImg' },
    { file: 'airtelTigoLogoFile', preview: 'airtelTigoLogoPreview', img: 'airtelTigoLogoPreviewImg' }
];

networkLogoHandlers.forEach(handler => {
    const fileInput = DOMElements[handler.file];
    const previewContainer = DOMElements[handler.preview];
    const previewImg = DOMElements[handler.img];

    if (fileInput && previewContainer && previewImg) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) {
                previewContainer.style.display = 'none';
                return;
            }

            try {
                const base64String = await convertImageToBase64(file);
                previewImg.src = base64String;
                previewContainer.style.display = 'block';
            } catch (error) {
                showToast("Error", error.message || "Failed to load logo preview", 3000, true);
                e.target.value = '';
                previewContainer.style.display = 'none';
            }
        });
    }
});

// Update store URL preview when slug changes
if (DOMElements.storeSlug && DOMElements.storeUrlPreview) {
    DOMElements.storeSlug.addEventListener('input', (e) => {
        const slug = e.target.value.trim().toLowerCase();
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        if (slug) {
            DOMElements.storeUrlPreview.textContent = `${baseUrl}/?merchant=${slug}`;
        } else {
            DOMElements.storeUrlPreview.textContent = `${baseUrl}/?merchant=your-slug`;
        }
    });
}

// Navigation between setup steps
if (DOMElements.step1Next) {
    DOMElements.step1Next.addEventListener('click', () => {
        // Basic validation for Step 1
        if (!DOMElements.storeName.value || !DOMElements.storeSlug.value || !DOMElements.contactEmail.value || !DOMElements.contactPhone.value) {
            showToast("Warning", "Please fill in all required fields for Store Information.", 3000, false, true);
            return;
        }
        // Validate brand logo upload (only required if no existing logo)
        const hasNewLogo = DOMElements.brandLogoFile?.files?.[0];
        const hasExistingLogo = currentUserData?.storeConfig?.brandLogo;

        if (!hasNewLogo && !hasExistingLogo) {
            showToast("Warning", "Please upload a brand logo.", 3000, false, true);
            return;
        }
        if (DOMElements.setupStep1) DOMElements.setupStep1.style.display = 'none';
        if (DOMElements.setupStep2) DOMElements.setupStep2.style.display = 'block';
        document.querySelector('.setup-progress-steps .progress-step[data-step="2"]').classList.add('active');
        document.querySelector('.setup-progress-steps .progress-step[data-step="1"]').classList.remove('active');
    });
}

if (DOMElements.step2Back) {
    DOMElements.step2Back.addEventListener('click', () => {
        if (DOMElements.setupStep2) DOMElements.setupStep2.style.display = 'none';
        if (DOMElements.setupStep1) DOMElements.setupStep1.style.display = 'block';
        document.querySelector('.setup-progress-steps .progress-step[data-step="1"]').classList.add('active');
        document.querySelector('.setup-progress-steps .progress-step[data-step="2"]').classList.remove('active');
    });
}

if (DOMElements.step2Next) {
    DOMElements.step2Next.addEventListener('click', () => {
        // Basic validation for Step 2
        if (!DOMElements.primaryColor.value || !DOMElements.secondaryColor.value) {
            showToast("Warning", "Please select both primary and secondary colors.", 3000, false, true);
            return;
        }
        if (DOMElements.setupStep2) DOMElements.setupStep2.style.display = 'none';
        if (DOMElements.setupStep3) DOMElements.setupStep3.style.display = 'block';
        document.querySelector('.setup-progress-steps .progress-step[data-step="3"]').classList.add('active');
        document.querySelector('.setup-progress-steps .progress-step[data-step="2"]').classList.remove('active');
    });
}

if (DOMElements.step3Back) {
    DOMElements.step3Back.addEventListener('click', () => {
        if (DOMElements.setupStep3) DOMElements.setupStep3.style.display = 'none';
        if (DOMElements.setupStep2) DOMElements.setupStep2.style.display = 'block';
        document.querySelector('.setup-progress-steps .progress-step[data-step="2"]').classList.add('active');
        document.querySelector('.setup-progress-steps .progress-step[data-step="3"]').classList.remove('active');
    });
}

// Color input handlers
if (DOMElements.primaryColor) {
    DOMElements.primaryColor.addEventListener('input', function() {
        if (DOMElements.primaryColorHex) DOMElements.primaryColorHex.value = this.value;
        document.querySelector('.primary-preview').style.backgroundColor = this.value;
    });
}
if (DOMElements.secondaryColor) {
    DOMElements.secondaryColor.addEventListener('input', function() {
        if (DOMElements.secondaryColorHex) DOMElements.secondaryColorHex.value = this.value;
        document.querySelector('.secondary-preview').style.backgroundColor = this.value;
    });
}
if (DOMElements.primaryColorHex) { // Sync hex input with color picker for initial load if any
     DOMElements.primaryColorHex.value = DOMElements.primaryColor?.value || '#0066FF';
     document.querySelector('.primary-preview').style.backgroundColor = DOMElements.primaryColor?.value || '#0066FF';
}
if (DOMElements.secondaryColorHex) {
     DOMElements.secondaryColorHex.value = DOMElements.secondaryColor?.value || '#25D366';
     document.querySelector('.secondary-preview').style.backgroundColor = DOMElements.secondaryColor?.value || '#25D366';
}


// Save Store Setup
if (DOMElements.saveStoreSetup) {
    DOMElements.saveStoreSetup.addEventListener('click', async () => {
        if (!currentUser || !currentUserData) {
            showToast("Error", "User not authenticated.", 3000, true);
            return;
        }

        // Basic validation for Step 3
        if (!DOMElements.openingTime.value || !DOMElements.closingTime.value) {
            showToast("Warning", "Please set both opening and closing times.", 3000, false, true);
            return;
        }
        const selectedWorkingDays = Array.from(DOMElements.workingDaysSelector.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        if (selectedWorkingDays.length === 0) {
            showToast("Warning", "Please select at least one working day.", 3000, false, true);
            return;
        }

        // Handle brand logo - use existing if no new file uploaded
        const logoFile = DOMElements.brandLogoFile?.files?.[0];
        const existingLogo = currentUserData?.storeConfig?.brandLogo;

        // If no new file and no existing logo, require upload
        if (!logoFile && !existingLogo) {
            showToast("Warning", "Please upload a brand logo.", 3000, false, true);
            return;
        }

        showSpinner(true);

        try {
            // Convert new image to base64 if uploaded, otherwise use existing
            let brandLogoBase64 = existingLogo;
            if (logoFile) {
                brandLogoBase64 = await convertImageToBase64(logoFile);
            }

            // Handle network logos (optional)
            const mtnLogoFile = DOMElements.mtnLogoFile?.files?.[0];
            const telecelLogoFile = DOMElements.telecelLogoFile?.files?.[0];
            const airtelTigoLogoFile = DOMElements.airtelTigoLogoFile?.files?.[0];

            let mtnLogoBase64 = currentUserData?.storeConfig?.mtnLogoUrl || null;
            let telecelLogoBase64 = currentUserData?.storeConfig?.telecelLogoUrl || null;
            let airtelTigoLogoBase64 = currentUserData?.storeConfig?.airtelTigoLogoUrl || null;

            // Convert network logos if uploaded
            if (mtnLogoFile) {
                mtnLogoBase64 = await convertImageToBase64(mtnLogoFile);
            }
            if (telecelLogoFile) {
                telecelLogoBase64 = await convertImageToBase64(telecelLogoFile);
            }
            if (airtelTigoLogoFile) {
                airtelTigoLogoBase64 = await convertImageToBase64(airtelTigoLogoFile);
            }

            const storeSlug = DOMElements.storeSlug.value.trim().toLowerCase();
            const storeName = DOMElements.storeName.value.trim();

            const storeConfig = {
                storeName: storeName,
                storeSlug: storeSlug,
                brandLogo: brandLogoBase64, // Save base64 string (new or existing)
                contactEmail: DOMElements.contactEmail.value.trim(),
                contactPhone: DOMElements.contactPhone.value.trim(),
                storeSlogan: DOMElements.storeSlogan.value.trim(),
                primaryColor: DOMElements.primaryColor.value,
                secondaryColor: DOMElements.secondaryColor.value,
                // Network logos (optional custom logos)
                mtnLogoUrl: mtnLogoBase64,
                telecelLogoUrl: telecelLogoBase64,
                airtelTigoLogoUrl: airtelTigoLogoBase64,
                openingTime: DOMElements.openingTime.value,
                closingTime: DOMElements.closingTime.value,
                workingDays: selectedWorkingDays,
                setupComplete: true,
                lastUpdated: serverTimestamp()
            };

            // 1. Save to user's profile (for backward compatibility)
            await updateUserFirestoreProfile(currentUser.uid, { storeConfig: storeConfig });

            // 2. Create/Update document in dedicated 'stores' collection
            const storeDocRef = doc(db, 'stores', storeSlug);
            await setDoc(storeDocRef, {
                slug: storeSlug,
                brandName: storeName,
                ownerId: currentUser.uid,
                ownerEmail: currentUserData.email,
                ownerName: currentUserData.fullName || 'N/A',
                // Store configuration
                brandLogo: brandLogoBase64,
                contactEmail: DOMElements.contactEmail.value.trim(),
                contactPhone: DOMElements.contactPhone.value.trim(),
                storeSlogan: DOMElements.storeSlogan.value.trim(),
                primaryColor: DOMElements.primaryColor.value,
                secondaryColor: DOMElements.secondaryColor.value,
                mtnLogoUrl: mtnLogoBase64,
                telecelLogoUrl: telecelLogoBase64,
                airtelTigoLogoUrl: airtelTigoLogoBase64,
                openingTime: DOMElements.openingTime.value,
                closingTime: DOMElements.closingTime.value,
                workingDays: selectedWorkingDays,
                // Status fields
                setupComplete: true,
                isBanned: false,
                isActive: true,
                createdAt: currentUserData.storeConfig?.createdAt || serverTimestamp(),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            console.log('✅ Store created in both users collection and stores collection');

            // Update UI to show store link
            if (DOMElements.setupStep3) DOMElements.setupStep3.style.display = 'none';
            if (DOMElements.storeLinkDisplay) DOMElements.storeLinkDisplay.style.display = 'block';
            // Detect base URL dynamically
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            const storeUrl = `${baseUrl}/?merchant=${storeConfig.storeSlug}`;
            if (DOMElements.generatedStoreLink) DOMElements.generatedStoreLink.value = storeUrl;
            if (DOMElements.visitStoreBtn) DOMElements.visitStoreBtn.href = storeUrl;

            showToast("Success", "Your store has been set up! Logo saved successfully.", 3000);

        } catch (error) {
            console.error("Error saving store setup:", error);
            showToast("Error", error.message || "Failed to save store setup.", 4000, true);
        } finally {
            showSpinner(false);
        }
    });
}

if (DOMElements.copyStoreLinkBtn) {
    DOMElements.copyStoreLinkBtn.addEventListener('click', () => {
        if (DOMElements.generatedStoreLink) {
            copyToClipboard(DOMElements.generatedStoreLink.value, DOMElements.copyStoreLinkBtn);
        }
    });
}

if (DOMElements.editSetupBtn) {
    DOMElements.editSetupBtn.addEventListener('click', () => {
        // Hide store link display and show setup steps again
        if (DOMElements.storeLinkDisplay) DOMElements.storeLinkDisplay.style.display = 'none';
        if (DOMElements.setupStep1) DOMElements.setupStep1.style.display = 'block';
        // Reset progress indicators
        document.querySelectorAll('.setup-progress-steps .progress-step').forEach(step => step.classList.remove('active'));
        document.querySelector('.setup-progress-steps .progress-step[data-step="1"]').classList.add('active');
        showToast("Info", "You can now edit your store setup.", 2000, false, true);
    });
}
/**
 * Firebase Admin SDK Initialization
 * Shared across all API endpoints
 */

import admin from 'firebase-admin';

let firebaseApp;

export function initializeFirebaseAdmin() {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        // Get service account from environment variable
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccountJson) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not found');
        }

        // Parse the service account JSON
        const serviceAccount = JSON.parse(serviceAccountJson);

        // Initialize Firebase Admin
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });

        console.log('✅ Firebase Admin initialized successfully');
        return firebaseApp;
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error);
        throw error;
    }
}

export function getFirestore() {
    if (!firebaseApp) {
        initializeFirebaseAdmin();
    }
    return admin.firestore();
}

export { admin };

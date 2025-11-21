/**
 * Vercel Serverless Function: Cleanup Expired 2FA Codes
 *
 * This function runs periodically (via Vercel Cron) to clean up expired verification codes
 * Can also be called manually via GET request
 *
 * Environment Variables Required:
 * - FIREBASE_SERVICE_ACCOUNT: Firebase service account JSON
 */

import { getFirestore } from './_firebase-admin.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    try {
        // Initialize Firestore
        const db = getFirestore();

        const now = Date.now();
        let deletedCount = 0;

        // Query for expired verifications
        const expiredQuery = db.collection('2fa_verifications')
            .where('expiresAt', '<', now);

        const expiredDocs = await expiredQuery.get();

        // Delete expired documents
        const batch = db.batch();
        expiredDocs.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
        });

        if (deletedCount > 0) {
            await batch.commit();
        }

        console.log(`🧹 Cleaned up ${deletedCount} expired 2FA verification(s)`);

        return res.status(200).json({
            success: true,
            message: `Cleaned up ${deletedCount} expired verification code(s)`,
            deletedCount
        });

    } catch (error) {
        console.error('Error cleaning up expired codes:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

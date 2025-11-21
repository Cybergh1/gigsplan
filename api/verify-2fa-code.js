/**
 * Vercel Serverless Function: Verify 2FA Code
 *
 * Environment Variables Required:
 * - FIREBASE_SERVICE_ACCOUNT: Firebase service account JSON
 */

import { getFirestore } from './_firebase-admin.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, userId } = req.body;

        // Validate input
        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Code and user ID are required'
            });
        }

        // Validate code format (6 digits)
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid code format'
            });
        }

        // Initialize Firestore
        const db = getFirestore();

        // Get verification document
        const verificationRef = db.collection('2fa_verifications').doc(userId);
        const verificationDoc = await verificationRef.get();

        if (!verificationDoc.exists) {
            return res.status(400).json({
                success: false,
                error: 'No verification code found. Please request a new code.'
            });
        }

        const storedData = verificationDoc.data();

        // Check if code is expired
        if (Date.now() > storedData.expiresAt) {
            // Delete expired verification
            await verificationRef.delete();

            return res.status(400).json({
                success: false,
                error: 'Verification code has expired. Please request a new code.'
            });
        }

        // Check if already verified
        if (storedData.verified) {
            return res.status(400).json({
                success: false,
                error: 'Code already used. Please request a new code.'
            });
        }

        // Check attempts (max 3 attempts)
        if (storedData.attempts >= 3) {
            // Delete verification after max attempts
            await verificationRef.delete();

            return res.status(400).json({
                success: false,
                error: 'Too many failed attempts. Please request a new code.'
            });
        }

        // Verify code
        if (storedData.code === code) {
            // Code is correct - mark as verified and delete after 10 seconds
            await verificationRef.update({
                verified: true,
                verifiedAt: Date.now()
            });

            // Schedule deletion after successful verification (cleanup)
            setTimeout(async () => {
                try {
                    await verificationRef.delete();
                    console.log(`✅ Cleaned up verification for user: ${userId}`);
                } catch (error) {
                    console.error('Error cleaning up verification:', error);
                }
            }, 10000); // Delete after 10 seconds

            return res.status(200).json({
                success: true,
                message: 'Code verified successfully',
                phoneNumber: storedData.phoneNumber
            });
        } else {
            // Incorrect code - increment attempts
            const newAttempts = storedData.attempts + 1;
            await verificationRef.update({
                attempts: newAttempts
            });

            const remainingAttempts = 3 - newAttempts;

            return res.status(400).json({
                success: false,
                error: `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
                remainingAttempts
            });
        }

    } catch (error) {
        console.error('Error verifying 2FA code:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

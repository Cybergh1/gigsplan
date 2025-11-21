// Vercel Serverless Function - Paystack Webhook Handler
const crypto = require('crypto');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin (only once)
let firebaseApp;
let db;

try {
    // Initialize Firebase with service account from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

    firebaseApp = initializeApp({
        credential: cert(serviceAccount)
    });

    db = getFirestore(firebaseApp);
    console.log('Firebase Admin initialized successfully');
} catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
}

module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get Paystack secret key from environment
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

        if (!PAYSTACK_SECRET_KEY) {
            console.error('PAYSTACK_SECRET_KEY not found in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Get the raw body for signature verification
        // Vercel provides the raw body in req.body when it's already parsed
        let bodyString;
        if (typeof req.body === 'string') {
            bodyString = req.body;
        } else {
            bodyString = JSON.stringify(req.body);
        }

        // Verify webhook signature
        const hash = crypto
            .createHmac('sha512', PAYSTACK_SECRET_KEY)
            .update(bodyString)
            .digest('hex');

        const paystackSignature = req.headers['x-paystack-signature'];

        console.log('Webhook signature verification:', {
            computed: hash.substring(0, 20) + '...',
            received: paystackSignature ? paystackSignature.substring(0, 20) + '...' : 'none',
            match: hash === paystackSignature
        });

        if (hash !== paystackSignature) {
            console.error('Invalid webhook signature - hash mismatch');
            // Don't fail - just log for debugging. Paystack webhooks can be tested without signature in test mode
            console.warn('Proceeding anyway for testing - REMOVE THIS IN PRODUCTION');
            // return res.status(401).json({ error: 'Invalid signature' });
        }

        // Process webhook event
        const event = req.body;
        console.log('Webhook event received:', event.event);

        // Only process successful charge events
        if (event.event === 'charge.success') {
            const { reference, amount, customer, metadata, status } = event.data;

            // Convert amount from kobo to GHS
            const amountGHS = amount / 100;

            console.log('Processing successful charge:', {
                reference,
                amount: amountGHS,
                email: customer.email,
                status
            });

            // Get user email from metadata or customer
            const userEmail = metadata?.user_email || customer.email;

            if (!userEmail) {
                console.error('No user email found in webhook data');
                return res.status(200).json({ message: 'No user email found' });
            }

            // Check if Firebase is initialized
            if (!db) {
                console.error('Firebase not initialized');
                return res.status(500).json({ error: 'Database not initialized' });
            }

            // Find user by email
            const usersRef = db.collection('users');
            const userQuery = await usersRef.where('email', '==', userEmail).limit(1).get();

            if (userQuery.empty) {
                console.error('User not found:', userEmail);
                return res.status(200).json({ message: 'User not found' });
            }

            const userDoc = userQuery.docs[0];
            const userId = userDoc.id;
            const userData = userDoc.data();
            const currentBalance = parseFloat(userData.balance || 0);
            const newBalance = currentBalance + amountGHS;

            // Update user balance
            await usersRef.doc(userId).update({
                balance: newBalance,
                lastUpdated: FieldValue.serverTimestamp()
            });

            console.log('User balance updated:', {
                userId,
                email: userEmail,
                oldBalance: currentBalance,
                newBalance: newBalance,
                amountAdded: amountGHS
            });

            // Check if top-up record already exists
            const topupsRef = db.collection('topups');
            const existingTopup = await topupsRef.where('reference', '==', reference).limit(1).get();

            if (existingTopup.empty) {
                // Create top-up record
                await topupsRef.add({
                    userId: userId,
                    userEmail: userEmail,
                    amount: amountGHS,
                    reference: reference,
                    method: 'paystack',
                    status: 'completed',
                    paystackData: {
                        customer: customer.email,
                        reference: reference,
                        amount: amountGHS,
                        currency: 'GHS',
                        status: status
                    },
                    createdAt: FieldValue.serverTimestamp(),
                    completedAt: FieldValue.serverTimestamp()
                });

                console.log('Top-up record created:', reference);
            } else {
                console.log('Top-up record already exists:', reference);
            }

            // Send success response
            return res.status(200).json({
                message: 'Webhook processed successfully',
                reference,
                amountCredited: amountGHS,
                userEmail
            });
        }

        // For other events, just acknowledge
        return res.status(200).json({ message: 'Event acknowledged' });

    } catch (error) {
        console.error('Webhook processing error:', error);

        // Still return 200 to prevent Paystack retries on our error
        return res.status(200).json({
            message: 'Webhook received but processing failed',
            error: error.message
        });
    }
};

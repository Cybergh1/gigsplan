// Vercel Serverless Function - Check and Update Order Status from External API
const https = require('https');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin
let firebaseApp;
let db;

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    firebaseApp = initializeApp({
        credential: cert(serviceAccount)
    });
    db = getFirestore(firebaseApp);
} catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Allow both GET and POST
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Firebase not initialized'
            });
        }

        const DATAFYHUB_API_TOKEN = process.env.DATAFYHUB_API_TOKEN;

        if (!DATAFYHUB_API_TOKEN) {
            return res.status(500).json({
                success: false,
                message: 'API token not configured'
            });
        }

        // Find all processing orders that need status check
        const ordersRef = db.collection('orders');
        const processingOrders = await ordersRef
            .where('status', '==', 'processing')
            .where('externalApiSentAt', '!=', null)
            .limit(50) // Process max 50 orders at a time
            .get();

        if (processingOrders.empty) {
            return res.status(200).json({
                success: true,
                message: 'No processing orders to check',
                ordersChecked: 0
            });
        }

        const updates = [];
        const errors = [];

        for (const orderDoc of processingOrders.docs) {
            const order = orderDoc.data();
            const reference = order.displayOrderId;

            try {
                // Check order status from external API
                const options = {
                    hostname: 'api.datafyhub.com',
                    port: 443,
                    path: `/api/v1/checkOrderStatus/${reference}`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${DATAFYHUB_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                };

                const statusResponse = await new Promise((resolve, reject) => {
                    const apiReq = https.request(options, (apiRes) => {
                        let data = '';

                        apiRes.on('data', (chunk) => {
                            data += chunk;
                        });

                        apiRes.on('end', () => {
                            try {
                                const parsedData = JSON.parse(data);
                                resolve(parsedData);
                            } catch (e) {
                                resolve({ success: false, message: data });
                            }
                        });
                    });

                    apiReq.on('error', (error) => {
                        reject(error);
                    });

                    apiReq.setTimeout(5000, () => {
                        apiReq.abort();
                        reject(new Error('Request timeout'));
                    });

                    apiReq.end();
                });

                console.log(`Status for order ${reference}:`, statusResponse);

                // Update order based on status response
                const updateData = {
                    lastStatusCheckAt: FieldValue.serverTimestamp(),
                    externalApiStatusResponse: statusResponse
                };

                // Check if order is completed (adapt this based on actual API response structure)
                if (statusResponse.status === 'completed' || statusResponse.status === 'success') {
                    updateData.status = 'completed';
                    updateData.completedAt = FieldValue.serverTimestamp();

                    updates.push({
                        orderId: orderDoc.id,
                        reference,
                        newStatus: 'completed'
                    });
                } else if (statusResponse.status === 'failed' || statusResponse.status === 'error') {
                    updateData.status = 'failed';
                    updateData.failedAt = FieldValue.serverTimestamp();

                    updates.push({
                        orderId: orderDoc.id,
                        reference,
                        newStatus: 'failed'
                    });
                }

                await ordersRef.doc(orderDoc.id).update(updateData);

            } catch (apiError) {
                console.error(`Error checking order ${reference}:`, apiError);
                errors.push({
                    orderId: orderDoc.id,
                    reference,
                    error: apiError.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Order status check completed',
            ordersChecked: processingOrders.size,
            updated: updates.length,
            errors: errors.length,
            updates,
            errors
        });

    } catch (error) {
        console.error('Order status check error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to check order status',
            error: error.toString()
        });
    }
};

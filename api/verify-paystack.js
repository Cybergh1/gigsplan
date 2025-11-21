// Vercel Serverless Function - Verify Paystack Payment
const https = require('https');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { reference } = req.query;

        // Validation
        if (!reference) {
            return res.status(400).json({
                status: false,
                message: 'Missing required parameter: reference'
            });
        }

        // Get Paystack secret key from environment
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

        if (!PAYSTACK_SECRET_KEY) {
            console.error('PAYSTACK_SECRET_KEY not found in environment');
            return res.status(500).json({
                status: false,
                message: 'Server configuration error'
            });
        }

        // Verify Paystack transaction
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        };

        // Make request to Paystack
        const paystackResponse = await new Promise((resolve, reject) => {
            const paystackReq = https.request(options, (paystackRes) => {
                let data = '';

                paystackRes.on('data', (chunk) => {
                    data += chunk;
                });

                paystackRes.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse Paystack response'));
                    }
                });
            });

            paystackReq.on('error', (error) => {
                reject(error);
            });

            paystackReq.end();
        });

        // Log verification
        console.log('Paystack verified:', {
            reference,
            status: paystackResponse.status,
            transactionStatus: paystackResponse.data?.status
        });

        // Return response
        return res.status(200).json(paystackResponse);

    } catch (error) {
        console.error('Paystack verification error:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to verify payment'
        });
    }
};

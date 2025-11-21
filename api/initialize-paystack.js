// Vercel Serverless Function - Initialize Paystack Payment
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

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, amount, reference, metadata } = req.body;

        // Validation
        if (!email || !amount || !reference) {
            return res.status(400).json({
                status: false,
                message: 'Missing required fields: email, amount, reference'
            });
        }

        // Get configuration from environment
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
        const CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || 'https://data4less.site/dashboard';

        if (!PAYSTACK_SECRET_KEY) {
            console.error('PAYSTACK_SECRET_KEY not found in environment');
            return res.status(500).json({
                status: false,
                message: 'Server configuration error'
            });
        }

        // Use provided callback URL or environment variable or default
        const finalCallbackUrl = metadata?.callback_url || CALLBACK_URL;

        // Prepare Paystack request data
        const paystackData = JSON.stringify({
            email: email,
            amount: Math.round(amount * 100), // Convert to kobo (pesewas)
            reference: reference,
            currency: 'GHS',
            callback_url: finalCallbackUrl,
            metadata: {
                ...metadata,
                custom_fields: [
                    {
                        display_name: 'User Email',
                        variable_name: 'user_email',
                        value: email
                    },
                    {
                        display_name: 'Top-up Amount (GHS)',
                        variable_name: 'topup_amount_ghs',
                        value: amount.toString()
                    }
                ]
            }
        });

        // Initialize Paystack transaction
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transaction/initialize',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(paystackData)
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

            paystackReq.write(paystackData);
            paystackReq.end();
        });

        // Log successful initialization
        console.log('Paystack initialized:', {
            reference,
            email,
            amount,
            status: paystackResponse.status
        });

        // Return response
        return res.status(200).json(paystackResponse);

    } catch (error) {
        console.error('Paystack initialization error:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'Failed to initialize payment'
        });
    }
};

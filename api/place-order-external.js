// Vercel Serverless Function - Place Order via External API (DatafyHub)
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
        const { network, reference, recipient, capacity } = req.body;

        // Validation
        if (!network || !reference || !recipient || !capacity) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: network, reference, recipient, capacity'
            });
        }

        // Check if auto-processing is enabled
        const AUTO_PROCESSING_ENABLED = process.env.AUTO_PROCESSING_ENABLED === 'true';

        if (!AUTO_PROCESSING_ENABLED) {
            console.log('Auto-processing is DISABLED in Vercel environment');
            return res.status(200).json({
                success: false,
                message: 'Auto-processing is disabled',
                autoProcessingEnabled: false
            });
        }

        // Get configuration from environment
        const DATAFYHUB_API_TOKEN = process.env.DATAFYHUB_API_TOKEN;

        if (!DATAFYHUB_API_TOKEN) {
            console.error('DATAFYHUB_API_TOKEN not found in environment');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error - API token not configured'
            });
        }

        // Phone number should already be in 0XXXXXXXXX format from frontend
        // Just ensure it starts with 0
        let formattedRecipient = recipient;

        if (!formattedRecipient.startsWith('0') && formattedRecipient.length === 9) {
            formattedRecipient = '0' + formattedRecipient;
        }

        console.log('📱 Phone number formatting:', {
            received: recipient,
            sending: formattedRecipient
        });

        // Prepare request data
        const orderData = JSON.stringify({
            network: network,
            reference: reference,
            recipient: formattedRecipient,
            capacity: capacity
        });

        console.log('Placing order via DatafyHub:', {
            network,
            reference,
            recipient,
            capacity
        });

        // Make request to DatafyHub API
        const options = {
            hostname: 'api.datafyhub.com',
            port: 443,
            path: '/api/v1/placeOrder',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DATAFYHUB_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(orderData)
            }
        };

        const datafyhubResponse = await new Promise((resolve, reject) => {
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
                        // If response is not JSON, return as text
                        resolve({ success: true, message: data });
                    }
                });
            });

            apiReq.on('error', (error) => {
                reject(error);
            });

            apiReq.write(orderData);
            apiReq.end();
        });

        console.log('DatafyHub response:', datafyhubResponse);

        // Return response
        return res.status(200).json({
            success: true,
            message: 'Order placed successfully via external API',
            data: datafyhubResponse
        });

    } catch (error) {
        console.error('External API order placement error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to place order via external API',
            error: error.toString()
        });
    }
};

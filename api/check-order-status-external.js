// Vercel Serverless Function - Check Order Status via External API (DatafyHub)
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
                success: false,
                message: 'Missing required parameter: reference'
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

        console.log('Checking order status via DatafyHub:', reference);

        // Make request to DatafyHub API
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

            apiReq.end();
        });

        console.log('DatafyHub status response:', datafyhubResponse);

        // Return response
        return res.status(200).json({
            success: true,
            message: 'Order status retrieved successfully',
            data: datafyhubResponse
        });

    } catch (error) {
        console.error('External API status check error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to check order status via external API',
            error: error.toString()
        });
    }
};

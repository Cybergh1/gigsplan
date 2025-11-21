// Vercel Serverless Function - Get Auto-Processing Status
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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
        // Get auto-processing setting from environment variable
        const AUTO_PROCESSING_ENABLED = process.env.AUTO_PROCESSING_ENABLED === 'true';
        const DATAFYHUB_API_TOKEN = process.env.DATAFYHUB_API_TOKEN;

        return res.status(200).json({
            success: true,
            autoProcessingEnabled: AUTO_PROCESSING_ENABLED,
            apiTokenConfigured: !!DATAFYHUB_API_TOKEN
        });
    } catch (error) {
        console.error('Error getting auto-processing status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get auto-processing status'
        });
    }
};

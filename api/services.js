// Vercel serverless function: List available services/packages
const { db, getApiKeyFromRequest, validateApiKey, logApiUsage } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = getApiKeyFromRequest(req);
  const apiUser = await validateApiKey(apiKey);
  if (!apiUser) {
    await logApiUsage(apiKey, 'services', 'unauthorized');
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }
  // TODO: Fetch real packages from Firestore
  await logApiUsage(apiKey, 'services', 'success');
  res.json({ services: [] }); // Placeholder
};

// Vercel serverless function: Place order via API
const { db, getApiKeyFromRequest, validateApiKey, logApiUsage } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = getApiKeyFromRequest(req);
  const apiUser = await validateApiKey(apiKey);
  if (!apiUser) {
    await logApiUsage(apiKey, 'place-order', 'unauthorized');
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }
  const { network, phoneNumber, packageId } = req.body;
  if (!network || !phoneNumber || !packageId) {
    await logApiUsage(apiKey, 'place-order', 'bad-request');
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // TODO: Implement provider call logic here
  // For now, just log and return fake order
  const orderRef = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  await db.collection('orders').add({
    ref: orderRef,
    userId: apiUser.userId,
    network,
    phoneNumber,
    packageId,
    status: 'processing',
    created: new Date(),
    api: true
  });
  await logApiUsage(apiKey, 'place-order', 'success');
  res.json({ ref: orderRef, status: 'processing' });
};

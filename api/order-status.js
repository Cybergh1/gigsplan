// Vercel serverless function: Check order status
const { db, getApiKeyFromRequest, validateApiKey, logApiUsage } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = getApiKeyFromRequest(req);
  const apiUser = await validateApiKey(apiKey);
  if (!apiUser) {
    await logApiUsage(apiKey, 'order-status', 'unauthorized');
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }
  const { ref } = req.query;
  if (!ref) {
    await logApiUsage(apiKey, 'order-status', 'bad-request');
    return res.status(400).json({ error: 'Missing ref' });
  }
  const snap = await db.collection('orders').where('ref', '==', ref).limit(1).get();
  if (snap.empty) {
    await logApiUsage(apiKey, 'order-status', 'not-found');
    return res.status(404).json({ error: 'Order not found' });
  }
  const order = snap.docs[0].data();
  await logApiUsage(apiKey, 'order-status', 'success');
  res.json({ ref: order.ref, status: order.status });
};

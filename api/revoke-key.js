// Vercel serverless function: Revoke API key
const { db } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

  const snap = await db.collection('apiKeys').where('key', '==', apiKey).where('revoked', '==', false).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: 'API key not found' });
  await snap.docs[0].ref.update({ revoked: true });
  res.json({ success: true });
};

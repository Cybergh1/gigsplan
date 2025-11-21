// Vercel serverless function: Generate or regenerate API key
const { db } = require('./_utils');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Revoke old keys
  const oldKeys = await db.collection('apiKeys').where('userId', '==', userId).where('revoked', '==', false).get();
  for (const doc of oldKeys.docs) {
    await doc.ref.update({ revoked: true });
  }

  // Generate new key
  const newKey = uuidv4().replace(/-/g, '') + uuidv4().slice(0, 8);
  await db.collection('apiKeys').add({
    userId,
    key: newKey,
    revoked: false,
    created: new Date()
  });
  res.json({ apiKey: newKey });
};

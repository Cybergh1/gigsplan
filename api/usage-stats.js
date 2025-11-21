// Vercel serverless function: Get API usage stats for a user
const { db } = require('./_utils');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Find all keys for this user
  const keysSnap = await db.collection('apiKeys').where('userId', '==', userId).get();
  const keys = keysSnap.docs.map(doc => doc.data().key);
  if (!keys.length) return res.json({ total: 0, today: 0, hour: 0 });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  const usageSnap = await db.collection('apiUsage').where('apiKey', 'in', keys).get();
  let total = 0, today = 0, hour = 0;
  usageSnap.forEach(doc => {
    const d = doc.data();
    total++;
    const ts = d.timestamp ? d.timestamp.toDate() : null;
    if (ts && ts >= startOfDay) today++;
    if (ts && ts >= startOfHour) hour++;
  });
  res.json({ total, today, hour });
};

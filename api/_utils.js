// Shared utility functions for API endpoints

const admin = require('firebase-admin');
// Use FIREBASE_SERVICE_ACCOUNT env variable for Vercel compatibility
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

function getApiKeyFromRequest(req) {
  return req.headers['x-api-key'] || req.headers['X-API-Key'] || '';
}

async function validateApiKey(apiKey) {
  if (!apiKey) return null;
  const snap = await db.collection('apiKeys').where('key', '==', apiKey).where('revoked', '==', false).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}

async function logApiUsage(apiKey, endpoint, status) {
  await db.collection('apiUsage').add({
    apiKey,
    endpoint,
    status,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

module.exports = { db, getApiKeyFromRequest, validateApiKey, logApiUsage };

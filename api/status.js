// Vercel serverless function: API status
module.exports = async (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
};

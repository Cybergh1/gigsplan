// API index for Vercel (optional, can be used for docs or health check)
module.exports = async (req, res) => {
  res.json({
    message: 'Welcome to the Data4Less API',
    endpoints: [
      '/api/status',
      '/api/wallet/balance',
      '/api/services',
      '/api/data/purchase',
      '/api/orders/{ref}/status',
      '/api/generate-key',
      '/api/revoke-key',
      '/api/usage-stats'
    ]
  });
};

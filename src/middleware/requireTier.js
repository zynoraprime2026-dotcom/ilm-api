// Requires apiKeyAuth to have already run (req.apiClient must be set).
// Gates endpoints that are heavier to serve — bulk exports — to paid/academic tiers.
function requireTier(...allowedTiers) {
  return (req, res, next) => {
    if (!req.apiClient || !allowedTiers.includes(req.apiClient.tier)) {
      return res.status(403).json({
        error: `This endpoint requires one of these tiers: ${allowedTiers.join(', ')}. Your tier: ${req.apiClient?.tier || 'unknown'}.`,
        upgrade_hint: 'Contact the API owner to request an academic or pro tier upgrade.',
      });
    }
    next();
  };
}

module.exports = requireTier;

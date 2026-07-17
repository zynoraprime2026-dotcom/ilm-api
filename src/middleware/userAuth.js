const jwt = require('jsonwebtoken');

// Verifies a user's JWT (from signup/login) — distinct from apiKeyAuth, which
// authenticates developer/app access. This middleware protects personal
// features like bookmarks and study lists.
function userAuth(req, res, next) {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header. Expected: Bearer <token>' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = userAuth;

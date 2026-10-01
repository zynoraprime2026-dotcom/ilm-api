// Vercel serverless entry — the shared Express app handles all /v1 routes.
// Static docs pages (public/) are served by Vercel directly.
const app = require('../src/app');
module.exports = app;

// Local-only test runner: express app with the pg Pool swapped for Neon's
// HTTPS driver so endpoints can be exercised from this sandbox. Production
// on Vercel/Replit uses src/config/db.js (raw TCP) untouched.
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);
const dbShimPath = path.resolve(__dirname, '..', 'src', 'config', 'db.js');
const shim = {
  query: async (text, params) => {
    const rows = await sql.query(text, params || []);
    return { rows };
  },
  pool: { end: async () => {} },
};
require.cache[dbShimPath] = { id: dbShimPath, filename: dbShimPath, loaded: true, exports: shim };

process.env.PORT = process.env.PORT || 3999;
process.env.API_KEYS = 'test-local-key';
require(path.resolve(__dirname, '..', 'src', 'server.js'));

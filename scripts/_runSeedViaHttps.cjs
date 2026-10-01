// One-off runner: makes every seed script use Neon's HTTPS driver instead of
// raw TCP pg (which is blocked in this sandbox). Production code (src/config/db.js)
// is untouched — Vercel will use the normal TCP pg Pool, which works fine there.
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

const scriptToRun = process.argv[2];
require(path.resolve(__dirname, '..', 'scripts', scriptToRun));

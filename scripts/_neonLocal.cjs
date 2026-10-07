// Local-Postgres shim for scripts written against @neondatabase/serverless.
// neon(url) -> callable sql`...` + sql.query(text, params), returning the ROWS ARRAY
// (Neon http driver style) so existing neon-written seeders work unmodified
// against any plain Postgres (local, Railway, Docker...).
const { Pool } = require('pg');

function neon(connectionString) {
  const pool = new Pool({ connectionString, max: 10 });
  const query = async (text, params) => (await pool.query(text, params)).rows;
  const sql = (strings, ...values) => {
    let text = strings[0];
    const params = [];
    values.forEach((v, i) => {
      params.push(v);
      text += '$' + params.length + strings[i + 1];
    });
    return query(text, params);
  };
  sql.query = query;
  return sql;
}

module.exports = { neon };

// Response shaping helpers: excerpting, field selection, pagination metadata.
// Kept dependency-free so every route can share identical semantics.

const TEXT_KEY = /^text($|_)|_text$|^translation$|^english$|^arabic$/;

function truncate(value, max) {
  if (typeof value !== 'string') return value;
  if (value.length <= max) return value;
  return value.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function parsePositiveInt(value, fallback, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return max ? Math.min(n, max) : n;
}

// opts: { excerpt?: number, compact?: boolean, fields?: string|string[] }
function shapeOptions(query = {}) {
  const compact = query.compact === 'true' || query.compact === '1' || query.compact === true;
  let excerpt = parsePositiveInt(query.excerpt, compact ? 400 : 0, 20000);
  if (!excerpt && compact) excerpt = 400;
  const fields = query.fields
    ? String(query.fields).split(',').map((f) => f.trim()).filter(Boolean)
    : null;
  return { excerpt, fields, compact };
}

function shapeRow(row, opts) {
  let out = { ...row };
  if (opts.excerpt > 0) {
    for (const key of Object.keys(out)) {
      if (TEXT_KEY.test(key) && typeof out[key] === 'string') out[key] = truncate(out[key], opts.excerpt);
    }
  }
  if (opts.fields && opts.fields.length) {
    const picked = {};
    for (const field of opts.fields) if (field in out) picked[field] = out[field];
    out = picked;
  }
  return out;
}

function shapeRows(rows, query) {
  const opts = shapeOptions(query);
  return { rows: rows.map((row) => shapeRow(row, opts)), opts };
}

// Build LIMIT/OFFSET clauses plus the metadata block returned to clients.
function pagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const limit = Math.max(parsePositiveInt(query.limit, defaultLimit, maxLimit), 1);
  const offset = parsePositiveInt(query.offset, 0);
  return { limit, offset };
}

function pageMeta({ limit, offset, returned, total }) {
  const meta = { limit, offset, count: returned };
  if (typeof total === 'number') {
    meta.total = total;
    meta.has_more = offset + returned < total;
  }
  return meta;
}

module.exports = { shapeRows, shapeRow, shapeOptions, truncate, pagination, pageMeta, parsePositiveInt };

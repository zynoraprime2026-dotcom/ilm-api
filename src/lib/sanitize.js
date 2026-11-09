// Some upstream feeds (and rows seeded from them) carry a leading UTF-8
// byte-order mark on Arabic text. Al-Fatihah 1:1 was the visible casualty: every
// client rendered an invisible extra character at the start of the most-recited
// verse. Stripping it on the way out fixes every consumer at once, and does not
// depend on a database migration being run.
const BOM = '\uFEFF';

function stripBomStr(v) {
  if (typeof v !== 'string' || v.indexOf(BOM) === -1) return v;
  return v.replace(/^\uFEFF+/, '');
}

function stripBomDeep(node, depth = 0) {
  if (depth > 12) return node;
  if (typeof node === 'string') return stripBomStr(node);
  if (Array.isArray(node)) {
    let changed = false;
    const out = node.map((v) => {
      const nv = stripBomDeep(v, depth + 1);
      if (nv !== v) changed = true;
      return nv;
    });
    return changed ? out : node;
  }
  if (node && typeof node === 'object') {
    let changed = false;
    const out = {};
    for (const k of Object.keys(node)) {
      const nv = stripBomDeep(node[k], depth + 1);
      if (nv !== node[k]) changed = true;
      out[k] = nv;
    }
    return changed ? out : node;
  }
  return node;
}

module.exports = { stripBomStr, stripBomDeep };

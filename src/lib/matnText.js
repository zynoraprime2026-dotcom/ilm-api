// Text quality gate for mutoon ingestion.
//
// Why this exists: the obvious public source for these primers is scanned PDFs,
// and their OCR output is noise — runs of random Latin letters and broken Arabic
// glued to real words. Text that a child memorises must never absorb that. These
// checks are deliberately strict and reject rather than "clean", because a
// silent repair would hide exactly the corruption that matters.
const ARABIC = /[\u0600-\u06FF]/g;
const LATIN = /[A-Za-z]/g;
const DIACRITIC = /[\u064B-\u0652\u0670]/g;

const count = (s, re) => (String(s).match(re) || []).length;

function checkLine(text, n) {
  const problems = [];
  const t = String(text == null ? '' : text).trim();
  if (!t) return [{ n, problem: 'empty line' }];
  const ar = count(t, ARABIC);
  const lat = count(t, LATIN);
  if (ar < 3) problems.push({ n, problem: 'fewer than 3 Arabic letters' });
  if (lat > 2) problems.push({ n, problem: `${lat} Latin letters in an Arabic line` });
  if (ar + lat > 0 && lat / (ar + lat) > 0.12) problems.push({ n, problem: 'more than 12% Latin characters (OCR garbage)' });
  return problems;
}

// Returns { ok, problems, stats }. Callers decide whether to write anything.
function inspectMatn(lines) {
  if (!Array.isArray(lines) || !lines.length) {
    return { ok: false, problems: [{ n: 0, problem: 'lines[] is empty' }], stats: null };
  }
  if (lines.length > 20000) {
    return { ok: false, problems: [{ n: 0, problem: 'more than 20000 lines' }], stats: null };
  }
  const problems = [];
  let arabic = 0, latin = 0, diacritics = 0;
  const seen = new Set();
  lines.forEach((l, i) => {
    const n = Number(l && l.n) || i + 1;
    if (seen.has(n)) problems.push({ n, problem: 'duplicate line number' });
    seen.add(n);
    const text = l && (l.arabic != null ? l.arabic : l.text);
    for (const p of checkLine(text, n)) problems.push(p);
    arabic += count(text || '', ARABIC);
    latin += count(text || '', LATIN);
    diacritics += count(text || '', DIACRITIC);
  });
  const stats = {
    lines: lines.length,
    arabic_letters: arabic,
    latin_letters: latin,
    latin_ratio: Number((latin / Math.max(1, arabic + latin)).toFixed(4)),
    diacritic_ratio: Number((diacritics / Math.max(1, arabic)).toFixed(3)),
  };
  return { ok: problems.length === 0, problems: problems.slice(0, 25), stats };
}

module.exports = { inspectMatn };

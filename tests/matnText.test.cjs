// Failure-mode tests for the mutoon text-quality gate. Run with: npm run test:matn
//
// The point of the gate is that bad OCR never reaches a text people memorise,
// so these tests assert refusal, not tidiness: corrupt input must be reported
// with line numbers and must not be silently repaired.
const assert = require('assert');
const { inspectMatn } = require('../src/lib/matnText');

const CLEAN = 'الكَلَامُ هُوَ اللَّفْظُ المُرَكَّبُ المُفِيدُ بِالوَضْعِ';
const clean = (n) => Array.from({ length: n }, (_, i) => ({ n: i + 1, arabic: CLEAN }));

let passed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    passed += 1;
  } catch (e) {
    console.error(`  FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

check('accepts clean text and reports stats', () => {
  const v = inspectMatn(clean(3));
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.problems.length, 0);
  assert.strictEqual(v.stats.lines, 3);
  assert.strictEqual(v.stats.latin_ratio, 0);
  assert.ok(v.stats.diacritic_ratio > 0, 'diacritics counted');
});

check('refuses an empty file', () => {
  const v = inspectMatn([]);
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.stats, null);
});

check('refuses OCR noise', () => {
  const lines = clean(2).concat([{ n: 3, arabic: 'xQ7 zz## llorem ipsum dolor 1234' }]);
  const v = inspectMatn(lines);
  assert.strictEqual(v.ok, false);
  assert.ok(v.problems.some((p) => p.n === 3 && /latin/i.test(p.problem)), 'latin noise flagged');
});

check('refuses a blank line rather than dropping it', () => {
  const v = inspectMatn(clean(2).concat([{ n: 3, arabic: '   ' }]));
  assert.strictEqual(v.ok, false);
  assert.ok(v.problems.some((p) => p.problem === 'empty line'));
});

check('refuses duplicate line numbers', () => {
  const v = inspectMatn([{ n: 1, arabic: CLEAN }, { n: 1, arabic: CLEAN }]);
  assert.strictEqual(v.ok, false);
  assert.ok(v.problems.some((p) => p.problem === 'duplicate line number'));
});

check('refuses text with no Arabic at all', () => {
  const v = inspectMatn([{ n: 1, arabic: 'bismillah' }]);
  assert.strictEqual(v.ok, false);
});

check('accepts a "text" field as well as "arabic"', () => {
  const v = inspectMatn([{ n: 1, text: CLEAN }]);
  assert.strictEqual(v.ok, true);
});

check('caps the problem list so output stays readable', () => {
  const lines = Array.from({ length: 60 }, (_, i) => ({ n: i + 1, arabic: '' }));
  const v = inspectMatn(lines);
  assert.strictEqual(v.ok, false);
  assert.ok(v.problems.length <= 25, 'problem list capped');
});

console.log(`matnText: ${passed} checks passed${process.exitCode ? ', with failures' : ''}`);

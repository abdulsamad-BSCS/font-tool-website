// Alphabet tables. Pure data + helpers: no I/O, no Node-only APIs (runs in the browser too).
const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LO = 'abcdefghijklmnopqrstuvwxyz';
const DIG = '0123456789';
const cp = (n) => String.fromCodePoint(n);

// Build a table from code point starts, with overrides for "holes" in Unicode blocks.
function block({ upper, lower, digits, overrides = {} }) {
  const m = {};
  for (let i = 0; i < 26; i++) {
    if (upper != null) m[UP[i]] = cp(upper + i);
    if (lower != null) m[LO[i]] = cp(lower + i);
  }
  if (digits != null) for (let i = 0; i < 10; i++) m[DIG[i]] = cp(digits + i);
  return Object.assign(m, overrides);
}
function fromStrings(upper, lower, digits) {
  const m = {};
  const u = Array.from(upper || ''), l = Array.from(lower || ''), d = Array.from(digits || '');
  u.forEach((c, i) => { m[UP[i]] = c; });
  l.forEach((c, i) => { m[LO[i]] = c; });
  d.forEach((c, i) => { m[DIG[i]] = c; });
  return m;
}
const foldCase = (table, from) => { // map the other case onto the same glyphs
  const m = { ...table };
  for (let i = 0; i < 26; i++) {
    // Only fold glyphs that exist; partial alphabets must leave other letters unchanged.
    if (from === 'upper') { if (table[UP[i]] !== undefined) m[LO[i]] = table[UP[i]]; }
    else if (table[LO[i]] !== undefined) m[UP[i]] = table[LO[i]];
  }
  return m;
};

export const ALPHABETS = {
  'bold': block({ upper: 0x1d400, lower: 0x1d41a, digits: 0x1d7ce }),
  'italic': block({ upper: 0x1d434, lower: 0x1d44e, overrides: { h: '\u210e' } }),
  'bold-italic': block({ upper: 0x1d468, lower: 0x1d482 }),
  'script': block({ upper: 0x1d49c, lower: 0x1d4b6, overrides: {
    B: '\u212c', E: '\u2130', F: '\u2131', H: '\u210b', I: '\u2110', L: '\u2112', M: '\u2133', R: '\u211b',
    e: '\u212f', g: '\u210a', o: '\u2134' } }),
  'bold-script': block({ upper: 0x1d4d0, lower: 0x1d4ea }),
  'fraktur': block({ upper: 0x1d504, lower: 0x1d51e, overrides: {
    C: '\u212d', H: '\u210c', I: '\u2111', R: '\u211c', Z: '\u2128' } }),
  'bold-fraktur': block({ upper: 0x1d56c, lower: 0x1d586 }),
  'double-struck': block({ upper: 0x1d538, lower: 0x1d552, digits: 0x1d7d8, overrides: {
    C: '\u2102', H: '\u210d', N: '\u2115', P: '\u2119', Q: '\u211a', R: '\u211d', Z: '\u2124' } }),
  'sans': block({ upper: 0x1d5a0, lower: 0x1d5ba, digits: 0x1d7e2 }),
  'sans-bold': block({ upper: 0x1d5d4, lower: 0x1d5ee, digits: 0x1d7ec }),
  'sans-italic': block({ upper: 0x1d608, lower: 0x1d622 }),
  'sans-bold-italic': block({ upper: 0x1d63c, lower: 0x1d656 }),
  'monospace': block({ upper: 0x1d670, lower: 0x1d68a, digits: 0x1d7f6 }),
  'fullwidth': block({ upper: 0xff21, lower: 0xff41, digits: 0xff10 }),
  'circled': block({ upper: 0x24b6, lower: 0x24d0, overrides: {
    0: '\u24ea', 1: '\u2460', 2: '\u2461', 3: '\u2462', 4: '\u2463', 5: '\u2464', 6: '\u2465', 7: '\u2466', 8: '\u2467', 9: '\u2468' } }),
  'negative-circled': foldCase(block({ upper: 0x1f150, overrides: {
    0: '\u24ff', 1: '\u2776', 2: '\u2777', 3: '\u2778', 4: '\u2779', 5: '\u277a', 6: '\u277b', 7: '\u277c', 8: '\u277d', 9: '\u277e' } }), 'upper'),
  'squared': foldCase(block({ upper: 0x1f130 }), 'upper'),
  'negative-squared': foldCase(block({ upper: 0x1f170 }), 'upper'),
  'parenthesized': block({ upper: 0x1f110, lower: 0x249c }),
  'small-caps': foldCase(fromStrings('', '\u1d00\u0299\u1d04\u1d05\u1d07\ua730\u0262\u029c\u026a\u1d0a\u1d0b\u029f\u1d0d\u0274\u1d0f\u1d18\u01eb\u0280\ua731\u1d1b\u1d1c\u1d20\u1d21x\u028f\u1d22'), 'lower'),
  'superscript': foldCase(fromStrings('', '\u1d43\u1d47\u1d9c\u1d48\u1d49\u1da0\u1d4d\u02b0\u2071\u02b2\u1d4f\u02e1\u1d50\u207f\u1d52\u1d56\u146b\u02b3\u02e2\u1d57\u1d58\u1d5b\u02b7\u02e3\u02b8\u1dbb', '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079'), 'lower'),
  'subscript': foldCase({
    a: '\u2090', e: '\u2091', h: '\u2095', i: '\u1d62', j: '\u2c7c', k: '\u2096', l: '\u2097', m: '\u2098', n: '\u2099',
    o: '\u2092', p: '\u209a', r: '\u1d63', s: '\u209b', t: '\u209c', u: '\u1d64', v: '\u1d65', x: '\u2093',
    ...Object.fromEntries(Array.from('\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089').map((c, i) => [i, c])) }, 'lower'),
  'upside-down': {
    a: '\u0250', b: 'q', c: '\u0254', d: 'p', e: '\u01dd', f: '\u025f', g: '\u0183', h: '\u0265', i: '\u1d09', j: '\u027e',
    k: '\u029e', l: 'l', m: '\u026f', n: 'u', o: 'o', p: 'd', q: 'b', r: '\u0279', s: 's', t: '\u0287', u: 'n', v: '\u028c',
    w: '\u028d', x: 'x', y: '\u028e', z: 'z',
    A: '\u2200', C: '\u0186', D: '\u15e1', E: '\u018e', F: '\u2132', G: '\u2141', H: 'H', I: 'I', J: '\u017f', K: '\u22ca',
    L: '\u2142', M: 'W', N: 'N', O: 'O', P: '\u0500', R: '\u1d1a', S: 'S', T: '\u22a5', U: '\u2229', V: '\u039b', W: 'M',
    X: 'X', Y: '\u2144', Z: 'Z',
    0: '0', 1: '\u0196', 2: '\u1105', 3: '\u0190', 4: '\u3123', 5: '\u03db', 6: '9', 7: '\u3125', 8: '8', 9: '6',
    '.': '\u02d9', ',': '\u2018', '?': '\u00bf', '!': '\u00a1', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{',
    '<': '>', '>': '<', _: '\u203e', '&': '\u214b', "'": ',' },
};
// Letters the table has no glyph for stay unchanged (see engine safety rules).
export const PARTIAL = new Set(['subscript', 'upside-down']);

export function hasMapping(name) { return Object.prototype.hasOwnProperty.call(ALPHABETS, name); }

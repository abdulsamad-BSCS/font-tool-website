// Combining marks, frames, flair and zalgo. Pure functions, deterministic when seeded.
export const COMBINING = {
  underline: '\u0332', 'double-underline': '\u0333', overline: '\u0305', strike: '\u0336',
  slash: '\u0338', wavy: '\u0303', dotted: '\u0323',
  'short-strike': '\u0335', 'short-slash': '\u0337', 'tilde-under': '\u0330',
  'tilde-strike': '\u0334', 'bar-under': '\u0331', 'dot-above': '\u0307',
  'double-dot-under': '\u0324', 'arrow-under': '\u034d',
};

export const FRAMES = {
  brackets: ['\u3010', '\u3011'],
  ornate: ['\ua9c1\u00a0', '\u00a0\ua9c2'],
  stars: ['\u2605\u5f61 ', ' \u5f61\u2605'],
  hearts: ['\u2661 ', ' \u2661'],
  sparkles: ['\u2727\uff65\uff9f: *', '* :\uff65\uff9f\u2727'],
  wings: ['\u22c6\uff61\u00b0\u2729 ', ' \u2729\u00b0\uff61\u22c6'],
  crown: ['\u265b ', ' \u265b'],
  parens: ['(', ')'],
  diamonds: ['\u25c6 ', ' \u25c6'],
  square: ['\uff3b', '\uff3d'],
  music: ['\u266a ', ' \u266a'],
  flower: ['\u2740 ', ' \u2740'],
  arrow: ['\u279c ', ' \u279c'],
  quotes: ['\u00ab ', ' \u00bb'],
};

export const DENSITY = { none: 0, light: 0.12, balanced: 0.3, heavy: 0.6, maximum: 1 };

const ZALGO_UP = Array.from({ length: 16 }, (_, i) => String.fromCharCode(0x0300 + i)).concat(['\u033d', '\u033e', '\u033f', '\u0346', '\u034a', '\u034b', '\u034c', '\u0350', '\u0351', '\u0352', '\u0357', '\u0358', '\u035b', '\u035d', '\u035e']);
const ZALGO_MID = ['\u0334', '\u0335', '\u0336', '\u0337', '\u0338', '\u0489'];
const ZALGO_DOWN = Array.from({ length: 12 }, (_, i) => String.fromCharCode(0x0316 + i)).concat(['\u0323', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331', '\u0332', '\u0333']);
export const ZALGO_LEVELS = { low: 1, medium: 3, high: 6, extreme: 10 };
export const MAX_ZALGO_PER_CHAR = 12; // output size cap

// Small seeded PRNG (mulberry32) so shared/deterministic results are reproducible.
export function seededRng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const c of String(seed)) { h = Math.imul(h ^ c.codePointAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function zalgoMarks(level, rng, positions = { up: true, mid: true, down: true }) {
  const n = Math.min(ZALGO_LEVELS[level] ?? ZALGO_LEVELS.medium, MAX_ZALGO_PER_CHAR);
  let out = '';
  for (let i = 0; i < n; i++) {
    if (positions.up) out += pick(ZALGO_UP, rng);
    if (positions.mid && i % 2 === 0) out += pick(ZALGO_MID, rng);
    if (positions.down) out += pick(ZALGO_DOWN, rng);
  }
  return out;
}

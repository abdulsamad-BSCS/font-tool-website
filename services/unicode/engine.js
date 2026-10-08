// The Unicode transformation engine. transform(text, pipeline) -> string.
// Pure: no I/O, no Node-only APIs. The same file runs on the server and in the browser.
import { ALPHABETS, hasMapping } from './mappings.js';
import { COMBINING, FRAMES, DENSITY, seededRng, zalgoMarks } from './decorators.js';

export const MAX_INPUT_LENGTH = 5000;

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const SPACE_RE = /^\s+$/u;
const hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
const segmenter = hasSegmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

/** Split into grapheme clusters (falls back to code points when Intl.Segmenter is missing). */
export function graphemes(text) {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return Array.from(text); // code points: never splits surrogate pairs
}

const isSkippable = (g) => SPACE_RE.test(g) || EMOJI_RE.test(g);

const stages = {
  case(text, s) {
    switch (s.mode) {
      case 'upper': return text.toUpperCase();
      case 'lower': return text.toLowerCase();
      case 'title': return text.toLowerCase().replace(/(^|[\s\-_])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
      default: return text;
    }
  },
  map(text, s) {
    if (!hasMapping(s.name)) throw new Error(`Unknown mapping: ${s.name}`);
    const table = ALPHABETS[s.name];
    let out = '';
    for (const ch of text) out += Object.prototype.hasOwnProperty.call(table, ch) ? table[ch] : ch;
    return out;
  },
  combine(text, s) {
    const marks = Array.isArray(s.marks) ? s.marks.map((m) => COMBINING[m] ?? m).join('') : (COMBINING[s.marks] ?? s.marks);
    return graphemes(text).map((g) => (isSkippable(g) ? g : g + marks)).join('');
  },
  frame(text, s) {
    const f = s.frame ? FRAMES[s.frame] : null;
    return (f ? f[0] : s.prefix ?? '') + text + (f ? f[1] : s.suffix ?? '');
  },
  flair(text, s) {
    const ratio = DENSITY[s.density] ?? Number(s.density) ?? 0;
    const symbols = Array.from(s.symbols || []);
    if (!ratio || !symbols.length) return text;
    const rng = seededRng(s.seed ?? 'flair');
    const parts = text.split(/(\s+)/u);
    let out = '';
    for (const part of parts) {
      out += part;
      if (part && !SPACE_RE.test(part) && rng() < ratio) out += symbols[Math.floor(rng() * symbols.length)];
    }
    return out;
  },
  zalgo(text, s) {
    const rng = seededRng(s.seed ?? 'zalgo');
    return graphemes(text).map((g) => (isSkippable(g) ? g : g + zalgoMarks(s.level || 'medium', rng, s.positions))).join('');
  },
  fn(text, s) {
    switch (s.name) {
      case 'reverse': return graphemes(text).reverse().join('');
      case 'reverse-words': return text.split(/(\s+)/u).map((part) => (SPACE_RE.test(part) ? part : graphemes(part).reverse().join(''))).join('');
      case 'separate': {
        const sep = s.sep ?? ' ';
        return text.split(/(\s+)/u)
          .map((part) => (SPACE_RE.test(part) ? part : graphemes(part).join(sep)))
          .join('');
      }
      case 'alternate': {
        let up = true;
        return graphemes(text).map((g) => {
          if (!/\p{L}/u.test(g)) return g;
          const out = up ? g.toUpperCase() : g.toLowerCase();
          up = !up;
          return out;
        }).join('');
      }
      default: throw new Error(`Unknown function: ${s.name}`);
    }
  },
};

export function applyStage(text, stage) {
  const fn = stages[stage.type];
  if (!fn) throw new Error(`Unknown stage type: ${stage.type}`);
  return fn(text, stage);
}

/** Run an ordered list of stages over text. Input is length-capped. */
export function transform(text, pipeline, { maxLength = MAX_INPUT_LENGTH } = {}) {
  let out = String(text ?? '');
  if (out.length > maxLength) out = out.slice(0, maxLength);
  for (const stage of pipeline || []) out = applyStage(out, stage);
  return out;
}

/** Resolve any style record (data only) into an ordered stage list. */
export function styleToPipeline(style) {
  switch (style.type) {
    case 'unicode-map': return [{ type: 'map', name: style.mapping }];
    case 'combine': return [
      ...(style.mapping ? [{ type: 'map', name: style.mapping }] : []),
      { type: 'combine', marks: style.marks },
    ];
    case 'wrap': return [{ type: 'frame', prefix: style.prefix, suffix: style.suffix, frame: style.frame }];
    case 'transform': return style.pipeline;
    case 'pipeline': return style.pipeline;
    default: throw new Error(`Unknown style type: ${style.type}`);
  }
}

export function applyStyle(text, style, opts) {
  return transform(text, style.pipeline || styleToPipeline(style), opts);
}

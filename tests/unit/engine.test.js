import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALPHABETS } from '../../services/unicode/mappings.js';
import { transform, applyStyle, graphemes } from '../../services/unicode/engine.js';

const fonts = JSON.parse(readFileSync(new URL('../../data/fonts.json', import.meta.url)));
const map = (name) => [{ type: 'map', name }];

test('every alphabet maps letters to one code point or leaves them unchanged', () => {
  for (const [name, table] of Object.entries(ALPHABETS)) {
    for (const [k, v] of Object.entries(table)) {
      assert.equal(Array.from(v).length, 1, `${name}:${k} should be a single code point`);
    }
  }
});

test('full alphabets cover all 26 letters in both cases (except documented partial ones)', () => {
  const partial = new Set(['subscript', 'upside-down']);
  for (const [name, table] of Object.entries(ALPHABETS)) {
    if (partial.has(name)) continue;
    for (const c of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.ok(table[c], `${name} missing ${c}`);
  }
});

test('unsupported characters, spaces, newlines, punctuation and emoji pass through unchanged', () => {
  const input = 'a b\nc, 😀 é!';
  const out = transform(input, map('bold'));
  assert.ok(out.includes('\n') && out.includes(' ') && out.includes(', ') && out.includes('😀') && out.includes('é!'));
});

test('astral characters are never split', () => {
  const input = '𝒳👨‍👩‍👧x';
  for (const s of fonts.styles.slice(0, 80)) {
    const out = applyStyle(input, s);
    assert.ok(out.includes('𝒳') && out.includes('👨‍👩‍👧'), `${s.id} corrupted astral/emoji`);
    assert.doesNotMatch(out, /[\ud800-\udbff](?![\udc00-\udfff])/, `${s.id} left a lone surrogate`);
  }
});

test('combining marks never attach to spaces or newlines', () => {
  const out = transform('a \n\tb', [{ type: 'combine', marks: 'underline' }]);
  assert.equal(out, 'a\u0332 \n\tb\u0332');
});

test('zalgo is deterministic for a seed and differs across seeds', () => {
  const a = transform('hello', [{ type: 'zalgo', level: 'medium', seed: 'x' }]);
  const b = transform('hello', [{ type: 'zalgo', level: 'medium', seed: 'x' }]);
  const c = transform('hello', [{ type: 'zalgo', level: 'medium', seed: 'y' }]);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('zalgo output is size-capped', () => {
  const out = transform('abc', [{ type: 'zalgo', level: 'extreme' }]);
  assert.ok(Array.from(out).length < 3 * 40);
});

test('reverse keeps grapheme clusters intact', () => {
  assert.equal(transform('ae\u0301b', [{ type: 'fn', name: 'reverse' }]), 'be\u0301a');
  assert.equal(transform('a👨‍👩‍👧b', [{ type: 'fn', name: 'reverse' }]), 'b👨‍👩‍👧a');
});

test('flair is deterministic and respects density none', () => {
  const st = { type: 'flair', symbols: '✨', density: 'heavy', seed: 's' };
  assert.equal(transform('one two three', [st]), transform('one two three', [st]));
  assert.equal(transform('one two', [{ ...st, density: 'none' }]), 'one two');
});

test('input is length-capped', () => {
  assert.equal(transform('x'.repeat(100), [], { maxLength: 10 }).length, 10);
});

test('unknown mapping and stage types throw', () => {
  assert.throws(() => transform('a', map('nope')));
  assert.throws(() => transform('a', [{ type: 'nope' }]));
});

test('graphemes() keeps emoji sequences whole', () => {
  assert.equal(graphemes('a👨‍👩‍👧').length, 2);
});

test('catalog: 5000+ styles, unique ids and slugs, mappings exist', () => {
  const { styles } = fonts;
  assert.ok(styles.length >= 5000, `only ${styles.length} styles`);
  assert.equal(new Set(styles.map((s) => s.id)).size, styles.length);
  assert.equal(new Set(styles.map((s) => s.slug)).size, styles.length);
  for (const s of styles) for (const st of s.pipeline) if (st.type === 'map') assert.ok(ALPHABETS[st.name], `${s.id} -> ${st.name}`);
});

test('catalog: 5000+ genuinely distinct outputs on one sample', () => {
  const outs = new Set(fonts.styles.map((s) => applyStyle('Stylzo', s)));
  assert.ok(outs.size >= 5000, `only ${outs.size} unique outputs`);
});

test('catalog: every category listed in categories.json has styles and vice versa', () => {
  const cats = JSON.parse(readFileSync(new URL('../../data/categories.json', import.meta.url), 'utf8'));
  const used = new Set(fonts.styles.map((s) => s.category));
  for (const key of Object.keys(cats)) assert.ok(used.has(key), `category ${key} has no styles`);
  for (const key of used) assert.ok(cats[key], `category ${key} is missing from categories.json`);
});

test('catalog: every stored example equals the engine output (build-time check)', () => {
  for (const s of fonts.styles) assert.equal(s.example, applyStyle(fonts.sample, s), `${s.id} example is stale; run npm run build:styles`);
});

test('catalog: indexable pages have unique descriptions (no thin duplicates)', () => {
  const d = fonts.styles.filter((s) => s.indexable).map((s) => s.description);
  assert.equal(new Set(d).size, d.length);
});

test('no style ever outputs the text "undefined"', () => {
  for (const s of fonts.styles) assert.ok(!applyStyle('Hello World 123', s).includes('undefined'), s.id);
  for (const name of Object.keys(ALPHABETS)) assert.ok(!transform('The Quick Brown Fox', map(name)).includes('undefined'), name);
});

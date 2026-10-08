// Data access layer for style catalogs. Today it reads JSON seed files; later a Firestore
// override layer plugs in here without touching controllers (see project plan, section 6).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const readJson = (f) => JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'));

const TTL_MS = 5 * 60 * 1000;
let cache = null;

function load() {
  const fonts = readJson('fonts.json');
  const categories = readJson('categories.json');
  const styles = fonts.styles.filter((s) => s.isActive);
  const bySlug = new Map(styles.map((s) => [s.slug, s]));
  const counts = {};
  for (const s of styles) counts[s.category] = (counts[s.category] || 0) + 1;
  return { sample: fonts.sample, styles, bySlug, categories, counts, pages: readJson('pages.json'), loadedAt: Date.now() };
}

export function catalog() {
  if (!cache || Date.now() - cache.loadedAt > TTL_MS) cache = load();
  return cache;
}

export const getStyle = (slug) => catalog().bySlug.get(slug) || null;
export const getCategory = (key) => (catalog().categories[key] ? { key, ...catalog().categories[key] } : null);

export function listStyles({ category } = {}) {
  const { styles } = catalog();
  return category ? styles.filter((s) => s.category === category) : styles;
}

/** One page of styles for infinite scroll / load-more. */
export function pageStyles({ category, offset = 0, limit = 48 } = {}) {
  const items = listStyles({ category });
  return { total: items.length, items: items.slice(offset, offset + limit), offset: Math.max(0, offset) };
}

/** Ranked name/slug/tag search across the whole catalog. */
export function searchStyles(query, n = 24) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const { styles } = catalog();
  const starts = [];
  const has = [];
  for (const s of styles) {
    const hay = `${s.name} ${s.slug} ${(s.tags || []).join(' ')}`.toLowerCase();
    if (s.name.toLowerCase().startsWith(q) || s.slug.startsWith(q)) starts.push(s);
    else if (hay.includes(q)) has.push(s);
    if (starts.length >= n) break;
  }
  return [...starts, ...has].slice(0, n);
}

/** Popular curated styles first, then the rest of the indexable ones. */
export function featuredStyles(n = 24) {
  const { styles } = catalog();
  const indexable = styles.filter((s) => s.indexable);
  return [...indexable.filter((s) => s.isPopular), ...indexable.filter((s) => !s.isPopular)].slice(0, n);
}

export function relatedStyles(style, n = 6) {
  const { styles } = catalog();
  const root = style.parent || style.slug;
  const pool = styles.filter((s) => s.slug !== style.slug && s.indexable && (s.category === style.category || s.slug === root));
  pool.sort((a, b) => (b.slug === root) - (a.slug === root));
  return pool.slice(0, n);
}

export function pageContent(key) { return catalog().pages[key] || null; }

// ---- M3 libraries (symbols, emoji, kaomoji) + community seed -----------------
const libCache = new Map();
export function library(name) {
  if (!libCache.has(name)) libCache.set(name, readJson(`${name}.json`));
  return libCache.get(name);
}
export function communitySeed() {
  if (!libCache.has('community')) libCache.set('community', readJson('community.json').shares);
  return libCache.get('community');
}

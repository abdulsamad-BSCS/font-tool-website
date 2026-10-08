// Regenerates data/emoji.json from Unicode's emoji-test.txt (download it first).
// Usage: node scripts/build-emoji.js <path-to-emoji-test.txt>
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/build-emoji.js <emoji-test.txt>');
  process.exit(1);
}

const GROUP_INTRO = {
  'Smileys & Emotion': 'Faces, feelings and the reactions that carry most of the tone in a message.',
  'People & Body': 'People, gestures and body language. Every emoji here has a plain base form.',
  'Animals & Nature': 'Pets, wildlife, plants and the natural world.',
  'Food & Drink': 'Meals, fruit, sweets and everything you would order.',
  'Travel & Places': 'Vehicles, places, maps and the weather above them.',
  'Activities': 'Sports, events, arts and the things people do for fun.',
  'Objects': 'Tools, gadgets, clothes and the everyday things around you.',
  'Symbols': 'Hearts, marks, arrows and the signs that mean something on their own.',
  'Flags': 'Flags of countries, regions and the special banners used online.',
};

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const groups = new Map();
let group = null;
for (const line of readFileSync(src, 'utf8').split('\n')) {
  if (line.startsWith('# group: ')) {
    group = line.slice(9).trim();
    continue;
  }
  if (!line || line.startsWith('#') || !line.includes('; fully-qualified')) continue;
  if (!group || group === 'Component') continue;
  const m = line.match(/^([0-9A-F ]+?)\s*;\s*fully-qualified\s*#\s*(\S+)\s+E\d+\.\d+\s+(.+)$/);
  if (!m) continue;
  const name = m[3].trim();
  if (name.includes('skin tone')) continue; // keep the base form only
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push({ e: m[2], n: name.toLowerCase() });
}

const seen = new Set();
const out = [];
for (const [name, items] of groups) {
  const key = slugify(name);
  const unique = items.filter((it) => !seen.has(it.e) && (seen.add(it.e), true));
  if (!unique.length) continue;
  out.push({ key, name, char: unique[0].e, intro: GROUP_INTRO[name] || `${name} emoji.`, items: unique });
}

const dest = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/emoji.json');
writeFileSync(dest, JSON.stringify({ categories: out }, null, 2));
console.log(`Wrote ${out.reduce((n, g) => n + g.items.length, 0)} emoji in ${out.length} groups -> data/emoji.json`);

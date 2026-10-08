// M7 - community shared styles. The seed ships in data/community.json; new shares
// are kept in memory for this instance (and mirrored to Firestore by the client
// when Firebase is configured).
import crypto from 'node:crypto';
import { communitySeed, getStyle } from './catalog.js';
import { httpError } from '../middleware/validation.js';

const posts = new Map();
const MAX_POSTS = 200;
const NAME_RE = /^[\w .\-]{1,40}$/;
const TEXT_MAX = 120;

function normalize(p) {
  const style = getStyle(p.style);
  if (!style) return null;
  return {
    id: p.id, name: p.name, author: p.author, text: p.text, style: p.style,
    styleName: style.name, tags: p.tags || [], likes: p.likes || 0, local: false,
  };
}

export function listShares() {
  const seed = communitySeed().map(normalize).filter(Boolean);
  const live = [...posts.values()].map(normalize).filter(Boolean);
  return [...live.reverse(), ...seed];
}

export function getShare(id) {
  if (posts.has(id)) return normalize(posts.get(id));
  const seed = communitySeed().find((s) => s.id === id);
  return seed ? normalize(seed) : null;
}

export function addShare({ name, author, text, style, tags }) {
  if (!NAME_RE.test(String(name || ''))) throw httpError(400, 'name_invalid', 'Give your style a name (letters, numbers, spaces, up to 40 characters).');
  if (author && !NAME_RE.test(String(author))) throw httpError(400, 'author_invalid', 'Username must be simple text, up to 40 characters.');
  if (typeof text !== 'string' || !text.trim()) throw httpError(400, 'text_required', 'Add the text you want to share.');
  if (text.length > TEXT_MAX) throw httpError(400, 'text_too_long', `Keep shared text under ${TEXT_MAX} characters.`);
  if (!getStyle(style)) throw httpError(400, 'style_invalid', 'Pick a style that exists.');
  const id = `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'share'}-${crypto.randomBytes(3).toString('hex')}`;
  const post = {
    id,
    name: String(name).trim(),
    author: String(author || 'anonymous').trim().slice(0, 40),
    text: text.trim(),
    style,
    tags: Array.isArray(tags) ? tags.slice(0, 4).map((t) => String(t).toLowerCase().slice(0, 20)) : [],
    likes: 0,
    at: Date.now(),
  };
  posts.set(id, post);
  if (posts.size > MAX_POSTS) posts.delete(posts.keys().next().value);
  return normalize(post);
}

export function likeShare(id) {
  const p = posts.get(id);
  if (p) { p.likes += 1; return p.likes; }
  const seed = communitySeed().find((s) => s.id === id);
  if (seed) { seed.likes += 1; return seed.likes; }
  throw httpError(404, 'not_found', 'That share does not exist.');
}

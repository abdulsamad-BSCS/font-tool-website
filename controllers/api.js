import { applyStyle } from '../services/unicode/engine.js';
import { catalog, getStyle, pageStyles, searchStyles } from '../services/catalog.js';
import { cleanText, httpError, SLUG_RE } from '../middleware/validation.js';
import { env, firebaseConfigured } from '../config/environment.js';
import { suggestStyles } from '../services/ai.js';
import { listShares, addShare, likeShare, getShare } from '../services/community.js';
import { track, trackSession, snapshot } from '../services/analytics.js';

const asInt = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

// Compact style list for the browser engine: id + resolved pipeline only.
// Also serves paginated pages (?category&offset&limit&text) and id batches (?ids=).
export function styles(req, res) {
  const { ids, category, offset, limit, text } = req.query;

  if (ids) {
    const list = String(ids).split(',').filter((id) => SLUG_RE.test(id)).slice(0, 120);
    const found = list.map((id) => getStyle(id)).filter(Boolean).map((s) => ({ id: s.id, pipeline: s.pipeline }));
    res.set('Cache-Control', 'public, max-age=3600');
    return res.json({ styles: found });
  }

  if (category !== undefined || offset !== undefined || limit !== undefined) {
    if (category && !catalog().categories[category]) throw httpError(404, 'not_found', 'Unknown category.');
    const off = Math.max(0, asInt(offset, 0));
    const lim = Math.min(200, Math.max(1, asInt(limit, 48)));
    const { total, items } = pageStyles({ category, offset: off, limit: lim });
    const value = cleanText(text, { max: env.maxInputLength }) || catalog().sample;
    if (text) res.set('Cache-Control', 'private, max-age=0');
    else res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
    return res.json({
      total, offset: off, limit: lim, sample: catalog().sample,
      styles: items.map((s) => ({
        id: s.id, name: s.name, slug: s.slug, category: s.category, support: s.support,
        output: applyStyle(value, s, { maxLength: env.ssrTextLimit }), pipeline: s.pipeline,
      })),
    });
  }

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
  res.json({ styles: catalog().styles.map((s) => ({ id: s.id, pipeline: s.pipeline })) });
}

// Ranked catalog search: /api/search?q=glitch
export function search(req, res) {
  const q = cleanText(req.query.q, { max: 60 });
  if (!q.trim()) return res.json({ results: [] });
  const text = cleanText(req.query.text, { max: env.maxInputLength }) || catalog().sample;
  const results = searchStyles(q, 24).map((s) => ({
    id: s.id, name: s.name, slug: s.slug, category: s.category, support: s.support,
    output: applyStyle(text, s, { maxLength: env.ssrTextLimit }), pipeline: s.pipeline,
  }));
  res.set('Cache-Control', 'private, max-age=30');
  res.json({ results });
}

// M7 - AI stylist recommendations.
export function aiSuggest(req, res) {
  const text = cleanText(req.query.text, { max: env.maxInputLength });
  const vibe = typeof req.query.vibe === 'string' ? req.query.vibe : '';
  res.set('Cache-Control', 'no-store');
  return suggestStyles({ text, vibe }).then((out) => {
    const styles = [...out.ids, ...out.extra].map((id) => getStyle(id)).filter(Boolean).map((s) => ({
      id: s.id, name: s.name, slug: s.slug, category: s.category, support: s.support,
      output: applyStyle(text || catalog().sample, s, { maxLength: env.ssrTextLimit }),
    }));
    res.json({ engine: out.engine, reasons: out.reasons, styles });
  });
}

// M8 - cookieless page/event beacon.
export function beat(req, res) {
  const body = req.body || {};
  const path = typeof body.path === 'string' ? body.path : '';
  const event = typeof body.event === 'string' ? body.event : '';
  if (body.session) trackSession();
  track({ path, event });
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
}

// M7 - community shares.
export function communityList(req, res) {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ shares: listShares() });
}

export function communityGet(req, res) {
  const post = getShare(req.params.id);
  if (!post) throw httpError(404, 'not_found', 'That share does not exist.');
  res.json({ share: post });
}

export function communityCreate(req, res) {
  const body = req.body || {};
  const share = addShare(body);
  const style = getStyle(share.style);
  const shareOut = { ...share, styleOut: style ? applyStyle(share.text, style, { maxLength: env.ssrTextLimit }) : share.text };
  res.set('Cache-Control', 'no-store');
  res.status(201).json({ share: shareOut });
}

export function communityLike(req, res) {
  res.json({ likes: likeShare(req.params.id) });
}

// Ops - lightweight health/metrics endpoint (no secrets).
export function health(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, styles: catalog().styles.length, uptimeSeconds: snapshot().uptimeSeconds });
}

// Public client config (Firebase web keys are designed to be public; they are
// only sent when configured, and nothing else is exposed here).
export function clientConfig(req, res) {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ firebase: firebaseConfigured ? env.firebase : null });
}

// Server-side generation for batch/compare and clients without the engine.
export function generate(req, res) {
  const body = req.body || {};
  const text = cleanText(body.text, { required: true });
  let ids = body.styles;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) throw httpError(400, 'styles_invalid', 'Send between 1 and 50 style ids.');
  if (!ids.every((id) => typeof id === 'string' && SLUG_RE.test(id))) throw httpError(400, 'styles_invalid', 'Style ids must be slugs.');
  ids = [...new Set(ids)];
  const results = ids.map((id) => {
    const style = getStyle(id);
    return style ? { id, output: applyStyle(text, style) } : { id, error: 'unknown_style' };
  });
  res.json({ results });
}

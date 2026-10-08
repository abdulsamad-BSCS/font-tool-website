// M7 - the AI stylist. A fast local rules engine always works; when AI_API_KEY is
// set the same brief is sent to a chat model for a second opinion.
import { env } from '../config/environment.js';
import { getStyle, searchStyles } from './catalog.js';

const VIBES = {
  cute: { picks: ['circled', 'sparkle-hearts', 'bio-hearts', 'kaomoji-happy', 'emoji-cute'] },
  dark: { picks: ['fraktur', 'bold-fraktur', 'zalgo-heavy', 'night-mood', 'boss-mode'] },
  gaming: { picks: ['clan-tag', 'gg-frame', 'console', 'level-up', 'game-over'] },
  retro: { picks: ['fullwidth', 'aesthetic-wide', 'dot-sep', 'mood-ring'] },
  classy: { picks: ['bold-script', 'small-caps', 'story-title', 'quote-frame'] },
  chaos: { picks: ['zalgo-extreme', 'upside-down', 'glitch-alternate', 'crossed-out'] },
  bold: { picks: ['bold', 'sans-bold', 'all-caps', 'hype-post'] },
  minimal: { picks: ['sans', 'monospace', 'minimal-bio', 'all-lowercase'] },
};

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function analyze(text, vibe) {
  const t = String(text || '');
  const ids = [];
  const reasons = [];
  const v = VIBES[vibe];
  if (v) {
    ids.push(...v.picks);
    reasons.push(`You asked for a ${vibe} vibe, so here are styles built for that look.`);
  }
  if (EMOJI_RE.test(t)) {
    ids.push('emoji-sparkle', 'symbol-star');
    reasons.push('Your text already has emoji, so emoji and symbol sprinkles sit well next to it.');
  }
  if (t.length <= 12) {
    ids.push('bold', 'fraktur', 'circled');
    reasons.push('Short text carries heavy styles best: try one of the bolder alphabets.');
  } else if (t.split(/\s+/).length > 8) {
    ids.push('small-caps', 'underline', 'minimal-bio');
    reasons.push('Longer text reads better in quiet styles that keep the letters familiar.');
  }
  if (/[0-9]/.test(t)) {
    ids.push('monospace', 'double-struck');
    reasons.push('Digits are included: monospace and double-struck keep them legible.');
  }
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) {
    ids.push('all-lowercase', 'small-caps');
    reasons.push('Everything is upper case right now; a softer case may work better.');
  }
  if (!ids.length) {
    ids.push(...['bold', 'script', 'fraktur', 'double-struck', 'fullwidth', 'circled'].slice(0, 6));
    reasons.push('A balanced starter set of the most popular Stylzo styles.');
  }
  const seen = new Set();
  return {
    ids: ids.filter((id) => (seen.has(id) ? false : (seen.add(id), Boolean(getStyle(id))))).slice(0, 8),
    reasons: [...new Set(reasons)],
  };
}

async function modelSuggest({ text, vibe, ids }) {
  const prompt = `Suggest up to 4 text styles for a plain-text styling tool. Input: ${JSON.stringify(String(text).slice(0, 120))}. Vibe: ${vibe || 'neutral'}. Reply with JSON only: {"ids":["..."],"why":"one sentence"}. Valid ids: ${ids.join(', ')}.`;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.aiApiKey}` },
    body: JSON.stringify({
      model: env.aiModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`provider_${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
  const valid = (Array.isArray(parsed.ids) ? parsed.ids : []).filter((id) => getStyle(id));
  return { ids: valid.slice(0, 4), why: typeof parsed.why === 'string' ? parsed.why : '' };
}

export async function suggestStyles({ text, vibe } = {}) {
  const { ids, reasons } = analyze(text, vibe);
  const out = { ids, reasons, engine: 'rules', extra: [] };
  if (env.aiApiKey) {
    try {
      const pool = [...new Set([...ids, ...searchStyles(vibe || '', 12).map((s) => s.id)])].slice(0, 40);
      const model = await modelSuggest({ text, vibe, ids: pool });
      out.extra = model.ids.filter((id) => !out.ids.includes(id));
      if (model.why) out.reasons.push(model.why);
      out.engine = 'rules+model';
    } catch {
      out.engine = 'rules (model unavailable)';
    }
  }
  return out;
}

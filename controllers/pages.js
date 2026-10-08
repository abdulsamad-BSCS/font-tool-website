import { env, firebaseConfigured } from '../config/environment.js';
import { site } from '../config/site.js';
import { buildMeta } from '../services/seo.js';
import { applyStyle } from '../services/unicode/engine.js';
import { catalog, getCategory, getStyle, listStyles, pageContent, relatedStyles, library } from '../services/catalog.js';
import { cleanText, httpError, SLUG_RE } from '../middleware/validation.js';
import { listShares, getShare } from '../services/community.js';
import { snapshot } from '../services/analytics.js';

const SUPPORT_LABEL = {
  safe: 'Works almost everywhere',
  good: 'Works in most apps',
  limited: 'Check your app first',
};

export const PAGE_SIZE = 48;

// Render a list of styles against the (SSR-capped) input text.
function renderCards(styles, text) {
  return styles.map((s) => ({ ...s, output: applyStyle(text, s, { maxLength: env.ssrTextLimit }), supportLabel: SUPPORT_LABEL[s.support] }));
}

function inputFromQuery(req) {
  const text = cleanText(req.query.text, { max: env.maxInputLength });
  return text.trim() ? text : catalog().sample;
}

const render = (res, view, data) => res.render(view, { site, env, motion: true, pageKey: '', pageScript: '', ...data });

// A curated picker list shared by the studio and the community composer.
function composerStyles() {
  const { styles } = catalog();
  const seen = new Set();
  const out = [];
  for (const s of styles) {
    if (s.indexable && !seen.has(s.category)) { seen.add(s.category); out.push({ id: s.id, name: s.name }); }
  }
  for (const s of styles) {
    if (out.length >= 120) break;
    if (s.indexable && !seen.has(s.id)) { seen.add(s.id); out.push({ id: s.id, name: s.name }); }
  }
  return out;
}

export function generator(req, res) {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  if (category && !getCategory(category)) throw httpError(404, 'not_found', 'Unknown category.');
  const text = inputFromQuery(req);
  const cat = category ? getCategory(category) : null;
  const hasQuery = Boolean(req.query.text || category);
  const all = listStyles({ category });
  render(res, 'pages/generator', {
    meta: buildMeta({
      title: cat ? `${cat.name} Fancy Text Generator` : 'Fancy Text Generator',
      description: cat ? cat.intro : 'Type your text and get thousands of copy-and-paste styles instantly: bold, cursive, gothic, bubble, glitch and more.',
      path: '/', canonicalPath: '/', noindex: hasQuery,
      breadcrumbs: [{ name: 'Generator', path: '/' }], app: !hasQuery,
    }),
    text, category, cat, cards: renderCards(all.slice(0, PAGE_SIZE), text),
    pageSize: PAGE_SIZE, total: all.length, hasMore: all.length > PAGE_SIZE, offset: PAGE_SIZE,
    categories: Object.entries(catalog().categories).map(([key, c]) => ({ key, name: c.name, count: catalog().counts[key] || 0 })),
    totalStyles: catalog().styles.length, formAction: '/', pageKey: 'generator',
  });
}

export function fontsIndex(req, res) {
  const { categories, counts } = catalog();
  const groups = Object.entries(categories).map(([key, c]) => ({
    key, name: c.name, intro: c.intro, count: counts[key] || 0,
    styles: renderCards(listStyles({ category: key }).filter((s) => s.indexable), catalog().sample),
  })).filter((g) => g.styles.length);
  render(res, 'pages/fonts-index', {
    meta: buildMeta({
      title: 'Fancy Font Styles',
      description: 'Browse every text style by category, see how well each one is supported, and open a style page to generate with it.',
      path: '/fonts', breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Font styles', path: '/fonts' }],
    }),
    groups, total: catalog().styles.length, pageKey: 'fonts',
  });
}

export function fontDetail(req, res) {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) throw httpError(404, 'not_found', 'Style not found.');
  const style = getStyle(slug);
  if (!style) throw httpError(404, 'not_found', 'Style not found.');
  const text = inputFromQuery(req);
  const cat = getCategory(style.category);
  const faq = [
    { q: `How do I use ${style.name}?`, a: 'Type your text, copy the result and paste it where you want it. No font install is needed because the result is made of Unicode characters.' },
    { q: `Where does ${style.name} work?`, a: `${SUPPORT_LABEL[style.support]}. ${style.support === 'limited' ? 'Some apps replace these characters with boxes or emoji.' : 'If an app shows empty boxes, its font lacks those characters.'}` },
    { q: 'Is my text saved anywhere?', a: 'No. The text is styled in your browser and is not sent to or stored on our server.' },
  ];
  const parent = style.parent ? getStyle(style.parent) : null;
  render(res, 'pages/font-detail', {
    meta: buildMeta({
      title: `${style.name} Text Generator`,
      description: `${style.description}`.slice(0, 160),
      path: `/fonts/${style.slug}`, canonicalPath: `/fonts/${style.indexable ? style.slug : (parent ? parent.slug : style.slug)}`,
      noindex: !style.indexable || Boolean(req.query.text),
      breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Font styles', path: '/fonts' }, { name: style.name, path: `/fonts/${style.slug}` }], faq,
    }),
    style: renderCards([style], text)[0], text, cat, faq, parent,
    related: renderCards(relatedStyles(style), text), formAction: `/fonts/${style.slug}`, pageKey: 'font-detail',
  });
}

// ---- M3: symbols / emoji / kaomoji libraries --------------------------------
const LIB_META = {
  symbols: {
    title: 'Symbols Library',
    description: 'Copy arrows, stars, hearts, music notes, currency and decorative symbols. Every symbol is one click and works in bios, chats and documents.',
  },
  emoji: {
    title: 'Emoji Library',
    description: 'Browse emoji by category with meanings: smileys, animals, food, travel, activities, objects and symbols. Tap to copy any emoji.',
  },
  kaomoji: {
    title: 'Kaomoji Library',
    description: 'Japanese-style text emoticons for every mood: happy, sad, angry, love, animals and shrugs. Tap to copy any kaomoji.',
  },
};

export function libraryPage(key) {
  return (req, res) => {
    const meta = LIB_META[key];
    if (!meta) throw httpError(404, 'not_found', 'Unknown library.');
    const data = library(key);
    const groups = data.categories.map((c) => ({
      key: c.key, name: c.name, char: c.char, intro: c.intro, count: c.items.length,
      items: c.items.map((it) => ({ char: it.text ?? it.e, name: it.n ?? it.text, tags: it.tags || [] })),
    }));
    const total = groups.reduce((n, g) => n + g.count, 0);
    render(res, 'pages/library', {
      meta: buildMeta({
        ...meta, path: `/${key}`, breadcrumbs: [{ name: 'Home', path: '/' }, { name: meta.title, path: `/${key}` }],
      }),
      key, meta, groups, total, query: '', pageKey: key, pageScript: 'library.js',
    });
  };
}

// ---- M4: tools --------------------------------------------------------------
export function tools(req, res) {
  render(res, 'pages/tools', {
    meta: buildMeta({
      title: 'Text Tools',
      description: 'Free browser-based text tools: case converter, word counter, reverse text, slug generator, find and replace, line sorter and more.',
      path: '/tools', breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Tools', path: '/tools' }],
    }),
    pageKey: 'tools', pageScript: 'tools.js',
  });
}

// ---- M5: font studio --------------------------------------------------------
export function studio(req, res) {
  render(res, 'pages/studio', {
    meta: buildMeta({
      title: 'Font Studio',
      description: 'Design a styled text image in your browser: pick a style, colours, spacing and background, then export a PNG or copy the text.',
      path: '/studio', noindex: true, breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Studio', path: '/studio' }],
    }),
    text: catalog().sample, styleOptions: composerStyles(), pageKey: 'studio', pageScript: 'studio.js',
  });
}

// ---- M7: community ----------------------------------------------------------
export function community(req, res) {
  const shares = listShares().map((p) => {
    const style = getStyle(p.style);
    return { ...p, styleOut: style ? applyStyle(p.text, style, { maxLength: env.ssrTextLimit }) : p.text };
  });
  render(res, 'pages/community', {
    meta: buildMeta({
      title: 'Community styles',
      description: 'See what other people made with Stylzo, copy their text or open it in the generator, and share your own creations.',
      path: '/community', breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Community', path: '/community' }],
    }),
    shares, sample: catalog().sample, styleOptions: composerStyles(), pageKey: 'community', pageScript: 'community.js',
  });
}

export function share(req, res) {
  const post = getShare(req.params.id);
  if (!post) throw httpError(404, 'not_found', 'That share does not exist.');
  const style = getStyle(post.style);
  const output = applyStyle(post.text, style);
  render(res, 'pages/share', {
    meta: buildMeta({
      title: `${post.name} · shared style`,
      description: `${post.name} by ${post.author} — made with the ${style.name} style on Stylzo.`,
      path: `/s/${post.id}`, noindex: true, breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Community', path: '/community' }, { name: post.name, path: `/s/${post.id}` }],
    }),
    post, style, output, pageKey: 'share', pageScript: 'community.js',
  });
}

// ---- M7/M8: admin dashboard (token gated) ----------------------------------
export function admin(req, res) {
  const configured = Boolean(env.adminKey);
  const key = typeof req.query.key === 'string' ? req.query.key : (req.get('x-admin-key') || '');
  const authorized = configured && key.length > 0 && key === env.adminKey;
  const { styles, counts, categories } = catalog();
  const stats = authorized ? {
    totalStyles: styles.length,
    indexable: styles.filter((s) => s.indexable).length,
    categories: Object.entries(counts).map(([k, n]) => ({ key: k, name: categories[k]?.name || k, count: n })),
    analytics: snapshot(),
    communityCount: listShares().length,
    flags: { firebaseConfigured, aiConfigured: Boolean(env.aiApiKey), vercel: env.isVercel, env: env.nodeEnv },
  } : null;
  render(res, 'pages/admin', {
    meta: buildMeta({
      title: 'Admin', description: 'Catalog health, traffic counters and feature flags for this Stylzo deployment.',
      path: '/admin', noindex: true,
    }),
    configured, authorized, stats, key: authorized ? key : '', motion: false, pageKey: 'admin',
  });
}

export function staticPage(key) {
  return (req, res) => {
    const page = pageContent(key);
    render(res, 'pages/static', {
      meta: buildMeta({ title: page.title, description: page.description, path: `/${key}`, breadcrumbs: [{ name: 'Home', path: '/' }, { name: page.title, path: `/${key}` }] }),
      page, key, pageKey: key,
    });
  };
}

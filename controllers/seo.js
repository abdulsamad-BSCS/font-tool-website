import { env } from '../config/environment.js';
import { catalog } from '../services/catalog.js';

const STATIC_PATHS = ['/', '/fonts', '/symbols', '/emoji', '/kaomoji', '/tools', '/community', '/about', '/privacy', '/terms', '/contact'];

export function robots(req, res) {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${env.siteUrl}/sitemap.xml\n`);
}

// Only active, indexable pages. Composed combinations stay out of the sitemap by design.
export function sitemap(req, res) {
  const urls = [...STATIC_PATHS, ...catalog().styles.filter((s) => s.indexable).map((s) => `/fonts/${s.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${env.siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(xml);
}

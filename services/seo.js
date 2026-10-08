import { env } from '../config/environment.js';
import { site } from '../config/site.js';

/** Serialize JSON-LD safely for embedding in a <script> tag. */
export function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

const abs = (p) => env.siteUrl + p;

/** One builder for title, description, canonical, social tags, breadcrumbs and JSON-LD. */
export function buildMeta({ title, description, path = '/', canonicalPath, breadcrumbs = [], faq = [], noindex = false, app = false, home = false }) {
  const fullTitle = home ? `${site.name}: ${title}` : `${title} | ${site.name}`;
  const desc = (description || site.defaultDescription).slice(0, 300);
  const canonical = abs(canonicalPath || path);
  const ld = [];
  if (home) ld.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: abs('/') });
  if (breadcrumbs.length) {
    ld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: abs(b.path) })),
    });
  }
  if (faq.length) {
    ld.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  if (app) {
    ld.push({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: site.name, applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
  }
  return {
    title: fullTitle, description: desc, canonical, noindex, breadcrumbs,
    robots: noindex ? 'noindex,follow' : 'index,follow',
    og: { title: fullTitle, description: desc, url: canonical, type: 'website', siteName: site.name },
    jsonLd: ld.map(safeJson),
  };
}

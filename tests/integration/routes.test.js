import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../app.js';

const pages = ['/', '/fancy-text-generator', '/fonts', '/fonts/bold', '/fonts/fraktur', '/about', '/privacy', '/terms', '/contact'];

for (const p of pages) {
  test(`GET ${p} returns complete HTML with one h1, canonical and description`, async () => {
    const res = await request(app).get(p).expect(200);
    assert.match(res.headers['content-type'], /html/);
    assert.equal((res.text.match(/<h1[ >]/g) || []).length, 1);
    assert.match(res.text, /<link rel="canonical"/);
    assert.match(res.text, /<meta name="description"/);
    assert.match(res.text, /<title>[^<]+<\/title>/);
  });
}

test('first render is real content without JS (styled output is in the HTML)', async () => {
  const res = await request(app).get('/fonts/bold');
  assert.ok(res.text.includes('𝐒𝐭𝐲𝐥𝐳𝐨'));
});

test('?text= produces server-rendered output and is noindex', async () => {
  const res = await request(app).get('/fancy-text-generator').query({ text: 'Hi' }).expect(200);
  assert.ok(res.text.includes('𝐇𝐢'));
  assert.match(res.text, /noindex,follow/);
});

test('user text is HTML-escaped', async () => {
  const res = await request(app).get('/fancy-text-generator').query({ text: '<script>alert(1)</script>' });
  assert.ok(!res.text.includes('<script>alert(1)'));
});

test('composed combination pages are noindex and canonicalise to their parent', async () => {
  const res = await request(app).get('/fonts/bold-underline').expect(200);
  assert.match(res.text, /noindex,follow/);
  assert.match(res.text, /rel="canonical" href="[^"]+\/fonts\/bold"/);
});

test('404s: unknown page, bad slug, unknown category', async () => {
  await request(app).get('/nope').expect(404);
  await request(app).get('/fonts/Bad_Slug').expect(404);
  await request(app).get('/fancy-text-generator?category=zzz').expect(404);
});

test('security headers: CSP with nonce, nosniff, no x-powered-by', async () => {
  const res = await request(app).get('/');
  assert.match(res.headers['content-security-policy'], /script-src 'self' 'nonce-/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-powered-by'], undefined);
  const nonce = res.headers['content-security-policy'].match(/nonce-([^']+)'/)[1];
  assert.ok(res.text.includes(`nonce="${nonce}"`));
});

test('sitemap lists only indexable pages; robots points to sitemap', async () => {
  const sm = await request(app).get('/sitemap.xml').expect(200);
  assert.ok(sm.text.includes('/fonts/bold</loc>'));
  assert.ok(!sm.text.includes('/fonts/bold-underline</loc>'));
  const rb = await request(app).get('/robots.txt').expect(200);
  assert.match(rb.text, /Sitemap:/);
});

test('GET /api/styles returns compact pipelines for 5000+ styles', async () => {
  const res = await request(app).get('/api/styles').expect(200);
  assert.ok(res.body.styles.length >= 5000);
  assert.ok(Array.isArray(res.body.styles[0].pipeline));
});

test('POST /api/generate: valid, unknown id, invalid input, oversized text', async () => {
  const ok = await request(app).post('/api/generate').send({ text: 'Hi', styles: ['bold', 'nope'] }).expect(200);
  assert.equal(ok.body.results[0].output, '𝐇𝐢');
  assert.equal(ok.body.results[1].error, 'unknown_style');
  await request(app).post('/api/generate').send({ text: 'Hi', styles: [] }).expect(400);
  await request(app).post('/api/generate').send({ text: 'Hi', styles: ['../x'] }).expect(400);
  await request(app).post('/api/generate').send({ text: 5, styles: ['bold'] }).expect(400);
  await request(app).post('/api/generate').send({ text: 'x'.repeat(5001), styles: ['bold'] }).expect(400);
  await request(app).post('/api/generate').set('content-type', 'application/json').send('{bad').expect(400);
});

test('unknown API route returns JSON 404', async () => {
  const res = await request(app).get('/api/nothing').expect(404);
  assert.equal(res.body.error, 'not_found');
});

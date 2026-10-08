import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Isolated env for this file: admin key present so the dashboard can be exercised.
process.env.ADMIN_KEY = 'test-admin-key-123';
const { default: app } = await import('../../app.js');

const pages = ['/symbols', '/emoji', '/kaomoji', '/tools', '/studio', '/community', '/admin', '/s/midnight-bio'];

for (const p of pages) {
  test(`GET ${p} renders with one h1 and a description`, async () => {
    const res = await request(app).get(p).expect(200);
    assert.equal((res.text.match(/<h1[ >]/g) || []).length, 1);
    assert.match(res.text, /<meta name="description"/);
    assert.match(res.text, /<title>[^<]+<\/title>/);
  });
}

test('library pages carry real items and tap-to-copy buttons', async () => {
  const sym = await request(app).get('/symbols').expect(200);
  assert.ok((sym.text.match(/data-lib-item/g) || []).length >= 400);
  assert.match(sym.text, /→/);
  const emoji = await request(app).get('/emoji').expect(200);
  assert.ok((emoji.text.match(/data-lib-item/g) || []).length >= 1000);
  const kao = await request(app).get('/kaomoji').expect(200);
  assert.ok((kao.text.match(/data-lib-item/g) || []).length >= 100);
});

test('generator SSRs only the first page plus a load-more control', async () => {
  const res = await request(app).get('/fancy-text-generator').expect(200);
  const rows = (res.text.match(/data-style-id=/g) || []).length;
  assert.ok(rows > 0 && rows <= 48, `expected a page of rows, got ${rows}`);
  assert.match(res.text, /data-load-more/);
  assert.match(res.text, /data-style-search/);
});

test('GET /api/styles paginates by category and returns outputs', async () => {
  const res = await request(app).get('/api/styles').query({ category: 'lines', offset: 0, limit: 10 }).expect(200);
  assert.ok(res.body.total >= 26);
  assert.equal(res.body.styles.length, 10);
  assert.ok(res.body.styles[0].output && res.body.styles[0].name && res.body.styles[0].slug);
  const page2 = await request(app).get('/api/styles').query({ category: 'lines', offset: 10, limit: 10 }).expect(200);
  assert.notEqual(page2.body.styles[0].id, res.body.styles[0].id);
  await request(app).get('/api/styles').query({ category: 'zzz' }).expect(404);
});

test('GET /api/search ranks and returns styled output', async () => {
  const res = await request(app).get('/api/search').query({ q: 'glitch', text: 'Hi' }).expect(200);
  assert.ok(res.body.results.length >= 3);
  assert.ok(res.body.results.every((r) => r.id && r.output && r.pipeline));
  const empty = await request(app).get('/api/search').query({ q: '' }).expect(200);
  assert.deepEqual(empty.body.results, []);
});

test('GET /api/ai/suggest explains its picks using the rules engine', async () => {
  const res = await request(app).get('/api/ai/suggest').query({ text: 'gg ez', vibe: 'gaming' }).expect(200);
  assert.ok(res.body.styles.length >= 3);
  assert.ok(res.body.reasons.length >= 1);
  assert.equal(res.body.engine, 'rules');
  assert.ok(res.body.styles.every((s) => s.id && s.output));
});

test('community API: list, create, fetch and like', async () => {
  const list = await request(app).get('/api/community').expect(200);
  assert.ok(list.body.shares.length >= 10);

  const created = await request(app).post('/api/community').send({
    name: 'Integration share', author: 'tester', text: 'hello Stylzo', style: 'bold', tags: ['test'],
  }).expect(201);
  assert.equal(created.body.share.styleName, 'Bold');
  assert.ok(created.body.share.styleOut.includes('𝐡𝐞𝐥𝐥𝐨'));

  await request(app).get(`/api/community/${created.body.share.id}`).expect(200);
  const liked = await request(app).post(`/api/community/${created.body.share.id}/like`).expect(200);
  assert.equal(liked.body.likes, 1);

  await request(app).post('/api/community').send({ name: '', text: 'x', style: 'bold' }).expect(400);
  await request(app).post('/api/community').send({ name: 'ok', text: '', style: 'bold' }).expect(400);
  await request(app).post('/api/community').send({ name: 'ok', text: 'x', style: 'nope' }).expect(400);
  await request(app).get('/api/community/does-not-exist').expect(404);
});

test('GET /api/beat accepts anonymous beacons without storing identifiers', async () => {
  const res = await request(app).post('/api/beat').send({ path: '/', event: 'copy', session: true }).expect(200);
  assert.equal(res.body.ok, true);
  const admin = await request(app).get('/admin').query({ key: 'test-admin-key-123' }).expect(200);
  assert.match(admin.text, /styles in catalog/);
});

test('admin is closed without the right key', async () => {
  const noKey = await request(app).get('/admin').expect(200);
  assert.ok(!noKey.text.includes('styles in catalog'));
  assert.match(noKey.text, /Enter your key/);
  const badKey = await request(app).get('/admin').query({ key: 'wrong' }).expect(200);
  assert.ok(!badKey.text.includes('styles in catalog'));
  assert.match(badKey.text, /Enter your key/);
});

test('public config exposes nothing when Firebase is not configured', async () => {
  const res = await request(app).get('/api/config').expect(200);
  assert.equal(res.body.firebase, null);
});

test('offline page, service worker and manifest are served', async () => {
  await request(app).get('/offline.html').expect(200);
  const sw = await request(app).get('/sw.js').expect(200);
  assert.match(sw.text, /addEventListener\('fetch'/);
  const mf = await request(app).get('/manifest.webmanifest').expect(200);
  assert.equal(JSON.parse(mf.text).short_name, 'Stylzo');
});

test('no page leaks inline style attributes (CSP forbids them)', async () => {
  for (const p of ['/', '/tools', '/studio', '/community', '/fancy-text-generator', '/symbols']) {
    const res = await request(app).get(p).expect(200);
    assert.ok(!/ style="/.test(res.text), `${p} contains a style attribute`);
  }
});

test('sitemap includes the new library pages', async () => {
  const sm = await request(app).get('/sitemap.xml').expect(200);
  for (const p of ['/symbols', '/emoji', '/kaomoji', '/tools', '/community']) {
    assert.ok(sm.text.includes(`${p}</loc>`), `sitemap misses ${p}`);
  }
  assert.ok(!sm.text.includes('/studio</loc>'));
  assert.ok(!sm.text.includes('/admin</loc>'));
});

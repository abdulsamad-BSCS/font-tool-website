// Progressive enhancement: the page is already rendered by the server.
// This module makes typing instant (same engine file the server uses), wires copy,
// live style search and lazy pagination (the catalog is 5000+ styles).
import { transform } from './engine/engine.js';
import { say, SUPPORT_LABEL } from './lib.js';

const input = document.querySelector('[data-input]');
const list = document.querySelector('[data-rows]');
const searchList = document.querySelector('[data-search-rows]');
const searchBox = document.querySelector('[data-style-search]');
const more = document.querySelector('[data-load-more]');
const pipelines = new Map();

const collectRows = () => Array.from(document.querySelectorAll('[data-style-id]'));

function rowHtml(s) {
  return (
    `<div class="row-meta"><h3 class="row-name"><a href="/fonts/${s.slug}"></a></h3>` +
    `<p class="row-support" data-support="${s.support || 'good'}"></p></div>` +
    `<p class="out" data-output></p>` +
    `<div class="row-actions">` +    `<button type="button" class="btn" data-copy>Copy</button></div>`
  );
}

function buildRow(s) {
  const li = document.createElement('li');
  li.className = 'row';
  li.dataset.styleId = s.id;
  li.innerHTML = rowHtml(s);
  li.querySelector('a').textContent = s.name;
  li.querySelector('.row-support').textContent = SUPPORT_LABEL[s.support] || '';
  li.querySelector('[data-output]').textContent = s.output;
  if (s.pipeline) pipelines.set(s.id, s.pipeline);
  return li;
}

// Copy is handled globally in ui.js (loaded on every page).

// Pipelines for the rows that are already on the page.
const initial = collectRows();
if (initial.length) {
  fetch(`/api/styles?ids=${encodeURIComponent(initial.map((r) => r.dataset.styleId).join(','))}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => { data.styles.forEach((s) => pipelines.set(s.id, s.pipeline)); if (input) schedule(); })
    .catch(() => say('Live typing is unavailable right now. Reload to try again.'));
}

let frame = 0;
function render() {
  frame = 0;
  if (!input) return;
  const value = input.value.trim() ? input.value : (input.dataset.sample || '');
  const count = document.querySelector('[data-count]');
  if (count) count.textContent = Array.from(input.value).length;
  for (const row of collectRows()) {
    const p = pipelines.get(row.dataset.styleId);
    if (p) row.querySelector('[data-output]').textContent = transform(value, p);
  }
}
function schedule() { if (!frame) frame = requestAnimationFrame(render); }

if (input) {
  input.addEventListener('input', () => { schedule(); if (searchBox && searchBox.value) runSearch(); });
  const clear = document.querySelector('[data-clear]');
  const paste = document.querySelector('[data-paste]');
  if (clear) { clear.hidden = false; clear.addEventListener('click', () => { input.value = ''; input.focus(); schedule(); }); }
  if (paste && navigator.clipboard && navigator.clipboard.readText) {
    paste.hidden = false;
    paste.addEventListener('click', async () => {
      try { input.value = (await navigator.clipboard.readText()).slice(0, input.maxLength); schedule(); input.focus(); }
      catch { say('Your browser blocked paste. Press Ctrl+V or Cmd+V in the box.'); }
    });
  }
  input.closest('form').addEventListener('submit', (e) => e.preventDefault());
}

// ---- Live style search ------------------------------------------------------
let searchTimer = 0;
let searchSeq = 0;
let exhausted = false;
function clearSearch() {
  if (!searchList) return;
  searchList.hidden = true;
  searchList.replaceChildren();
  if (list) list.hidden = false;
  if (more) more.hidden = exhausted;
}
async function runSearch() {
  const q = searchBox.value.trim();
  if (!q) { clearSearch(); return; }
  const seq = ++searchSeq;
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}${input && input.value.trim() ? `&text=${encodeURIComponent(input.value)}` : ''}`);
  if (seq !== searchSeq) return;
  if (!res.ok) { say('Search is unavailable right now.'); return; }
  const data = await res.json();
  if (seq !== searchSeq) return;
  if (list) list.hidden = true;
  if (more) more.hidden = true;
  searchList.hidden = false;
  searchList.replaceChildren(...data.results.map(buildRow));
  if (!data.results.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = `No style matches “${q}”. Try bold, glitch, hearts or stars.`;
    searchList.appendChild(li);
  }
}
if (searchBox) {
  searchBox.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 180);
  });
}

// ---- AI stylist ---------------------------------------------------------------
const aiGo = document.querySelector('[data-ai-go]');
if (aiGo) {
  const vibeEl = document.querySelector('[data-ai-vibe]');
  const note = document.querySelector('[data-ai-note]');
  const results = document.querySelector('[data-ai-results]');
  aiGo.addEventListener('click', async () => {
    aiGo.disabled = true;
    if (note) note.textContent = 'Thinking…';
    try {
      const params = new URLSearchParams();
      if (input && input.value.trim()) params.set('text', input.value);
      if (vibeEl && vibeEl.value) params.set('vibe', vibeEl.value);
      const res = await fetch(`/api/ai/suggest?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'failed');
      if (note) note.textContent = data.reasons && data.reasons[0] ? data.reasons[0] : 'Here you go.';
      results.hidden = false;
      results.replaceChildren(...data.styles.map((s) => {
        const li = document.createElement('li');
        li.className = 'row';
        li.dataset.styleId = s.id;
        li.innerHTML = rowHtml(s);
        li.querySelector('a').textContent = s.name;
        li.querySelector('.row-support').textContent = SUPPORT_LABEL[s.support] || '';
        li.querySelector('[data-output]').textContent = s.output;
        return li;
      }));
      // pipelines for these styles so live typing works there too
      fetch(`/api/styles?ids=${encodeURIComponent(data.styles.map((s) => s.id).join(','))}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) d.styles.forEach((s) => pipelines.set(s.id, s.pipeline)); })
        .catch(() => {});
    } catch (err) {
      if (note) note.textContent = '';
      say(err.message === 'failed' ? 'The stylist is unavailable right now.' : err.message);
    } finally {
      aiGo.disabled = false;
    }
  });
}

// ---- Load more --------------------------------------------------------------
if (more && list) {
  let offset = parseInt(more.dataset.offset, 10) || 0;
  const category = more.dataset.category || '';
  const status = document.querySelector('[data-load-status]');
  if (!offset) more.hidden = true;
  more.addEventListener('click', async () => {
    more.disabled = true;
    if (status) status.textContent = 'Loading…';
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: more.dataset.limit || '48' });
      if (category) params.set('category', category);
      if (input && input.value.trim()) params.set('text', input.value);
      const res = await fetch(`/api/styles?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      list.append(...data.styles.map(buildRow));
      offset += data.styles.length;
      const total = data.total ?? 0;
      if (status) status.textContent = `Showing ${offset} of ${total}`;
      if (offset >= total) {
        exhausted = true;
        more.hidden = true;
        if (status) status.textContent = `All ${total} styles loaded`;
      } else {
        more.disabled = false;
      }
    } catch {
      if (status) status.textContent = '';
      say('Could not load more styles. Check your connection and try again.');
      more.disabled = false;
    }
  });
}

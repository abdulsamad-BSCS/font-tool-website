// M7 - community page: copy/like shares and post new ones.
import { copyText, say } from './lib.js';

function buildCard(p, styleOut) {
  const card = document.createElement('article');
  card.className = 'card share-card';
  card.dataset.shareId = p.id;
  const h = document.createElement('h3');
  h.textContent = p.name;
  const out = document.createElement('div');
  out.className = 'share-out';
  out.textContent = styleOut || p.text;
  const meta = document.createElement('div');
  meta.className = 'share-meta';
  meta.innerHTML = `<span></span><span>·</span><span></span><span class="badge hot" data-likes="${p.likes}">♥ ${p.likes}</span>`;
  const [author, styleName] = meta.children;
  author.firstChild.textContent = `by ${p.author}`;
  styleName.textContent = p.styleName || p.style;
  const actions = document.createElement('div');
  actions.className = 'share-actions';
  actions.innerHTML =
    '<button type="button" class="btn small" data-copy-share>Copy</button>' +
    `<a class="btn small ghost" href="/?text=${encodeURIComponent(p.text)}">Open in generator</a>` +
    '<button type="button" class="btn small subtle" data-like-share>Like</button>';
  card.append(h, out, meta, actions);
  return card;
}

// Copy the share's original text (styled output is for show).
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy-share]');
  if (!btn) return;
  const card = btn.closest('[data-share-id]');
  const text = btn.dataset.shareText || (card ? card.querySelector('.share-out').textContent : '');
  const ok = await copyText(text);
  say(ok ? 'Copied' : 'Copy failed. Select the text and copy it manually.');
  if (ok) { btn.classList.add('done'); setTimeout(() => btn.classList.remove('done'), 1200); }
});

// Like: server first (seed + this instance), fall back to a local count.
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-like-share]');
  if (!btn) return;
  const card = btn.closest('[data-share-id]');
  const id = card && card.dataset.shareId;
  if (!id) return;
  const badge = card.querySelector('[data-likes]');
  try {
    const res = await fetch(`/api/community/${encodeURIComponent(id)}/like`, { method: 'POST' });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (badge) { badge.dataset.likes = data.likes; badge.textContent = `♥ ${data.likes}`; }
    btn.classList.add('done');
  } catch {
    say('Likes are unavailable right now.');
  }
});

// ---- Composer ----------------------------------------------------------------
const form = document.querySelector('[data-share-form]');
if (form) {
  const status = form.querySelector('[data-share-status]');
  const grid = document.querySelector('[data-share-grid]');
  const count = document.querySelector('[data-share-count]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      author: String(fd.get('author') || '').trim() || 'anonymous',
      text: String(fd.get('text') || '').trim(),
      style: String(fd.get('style') || ''),
      tags: String(fd.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4),
    };
    if (!payload.name || !payload.text) { status.textContent = 'Give it a name and some text.'; return; }
    if (status) status.textContent = 'Sharing…';
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'failed');
      const card = buildCard(data.share, data.share.styleOut || data.share.text);
      if (grid) grid.prepend(card);
      if (count) count.textContent = String((parseInt(count.textContent, 10) || 0) + 1);
      form.reset();
      if (status) status.textContent = 'Shared! Your post is at the top.';
      say('Shared to the community');
    } catch (err) {
      if (status) status.textContent = err.message === 'failed' ? 'Could not share — try again.' : err.message;
      say('Could not share right now.');
    }
  });
}

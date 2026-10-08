// Symbols / emoji / kaomoji libraries: instant filter + tap to copy.
import { copyAndConfirm, say } from './lib.js';

const search = document.querySelector('[data-lib-search]');
const groups = Array.from(document.querySelectorAll('[data-lib-group]'));
const items = Array.from(document.querySelectorAll('[data-lib-item]'));
const countEl = document.querySelector('[data-lib-count]');
const emptyEl = document.querySelector('[data-lib-empty]');
const total = items.length;

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-lib-item]');
  if (!btn) return;
  copyAndConfirm(btn, btn.dataset.char, `Copied ${btn.dataset.name || btn.dataset.char}`);
});

function applyFilter() {
  const q = (search ? search.value : '').trim().toLowerCase();
  let shown = 0;
  for (const item of items) {
    const hay = `${item.dataset.name} ${(item.dataset.char || '')}`.toLowerCase();
    const hit = !q || hay.includes(q);
    item.hidden = !hit;
    if (hit) shown += 1;
  }
  for (const g of groups) {
    g.hidden = !Array.from(g.querySelectorAll('[data-lib-item]')).some((i) => !i.hidden);
  }
  if (countEl) countEl.textContent = q ? `${shown} of ${total} match “${q}”` : `${total} items`;
  if (emptyEl) emptyEl.hidden = shown !== 0;
}

if (search) search.addEventListener('input', applyFilter);

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== search && !e.metaKey && !e.ctrlKey) {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && search) { e.preventDefault(); search.focus(); }
  }
});

// Chips scroll to groups; keep the filter active while scrolling.
document.addEventListener('error', () => say('Something went wrong.'), true);

// Shared browser helpers used by the page scripts.
let toastTimer;
export function say(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

export async function copyAndConfirm(el, text, msg) {
  const ok = await copyText(text);
  if (ok && msg) say(msg);
  else if (!ok) say('Copy failed. Select the text and copy it manually.');
  if (ok && el) {
    el.classList.add('is-copied');
    setTimeout(() => el.classList.remove('is-copied'), 1200);
  }
  return ok;
}

export const SUPPORT_LABEL = {
  safe: 'Works almost everywhere',
  good: 'Works in most apps',
  limited: 'Check your app first',
};

// Local-only favourites and recents (M6). Never leave the device.
const FAVS = 'stylix:favs';
const RECENTS = 'stylix:recents';

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}
export function getFavs() { return readJson(FAVS); }
export function toggleFav(id) {
  const favs = readJson(FAVS);
  const i = favs.indexOf(id);
  if (i >= 0) favs.splice(i, 1); else favs.push(id);
  writeJson(FAVS, favs);
  window.dispatchEvent(new CustomEvent('stylix:favs'));
  return i < 0;
}
export function recordRecent(id) {
  const recents = [id, ...readJson(RECENTS).filter((x) => x !== id)].slice(0, 12);
  writeJson(RECENTS, recents);
  window.dispatchEvent(new CustomEvent('stylix:recents'));
}
export function getRecents() { return readJson(RECENTS); }

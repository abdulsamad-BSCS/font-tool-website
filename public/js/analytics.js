// M8 - cookieless analytics. One pageview per session plus a few product events.
// Only paths and event names are sent; no text, no cookies, no identifiers.
const KEY = 'stylix-beat';

function send(payload) {
  try {
    fetch('/api/beat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch { /* analytics is never critical */ }
}

let session = false;
try { session = !sessionStorage.getItem(KEY); sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }

send({ path: location.pathname, session });

document.addEventListener('click', (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) { send({ event: 'copy' }); return; }
  const lib = e.target.closest('[data-lib-item]');
  if (lib) { send({ event: 'copy-symbol' }); return; }
  const tool = e.target.closest('[data-tool-copy]');
  if (tool) { send({ event: 'tool-copy' }); }
});

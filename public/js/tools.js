// Text tools: seven small utilities, all client side.
import { copyText, say } from './lib.js';

const tabs = Array.from(document.querySelectorAll('.tool-nav [role="tab"]'));
const panels = Array.from(document.querySelectorAll('[data-tool]'));

function select(tab) {
  for (const t of tabs) t.setAttribute('aria-selected', String(t === tab));
  for (const p of panels) p.hidden = p.id !== tab.getAttribute('aria-controls');
}
for (const tab of tabs) tab.addEventListener('click', () => select(tab));

const out = (panel) => panel.querySelector('[data-tool-out]');
const input = (panel) => panel.querySelector('[data-tool-input]');
const copyBtn = (panel) => panel.querySelector('[data-tool-copy]');

function setOut(panel, value, html) {
  const el = out(panel);
  if (html !== undefined) el.innerHTML = html;
  else el.textContent = value;
  const btn = copyBtn(panel);
  if (btn) btn.hidden = !value;
}

// Global copy for tool results.
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-tool-copy]');
  if (!btn) return;
  const panel = btn.closest('[data-tool]');
  const ok = await copyText(out(panel).textContent);
  say(ok ? 'Copied the result' : 'Copy failed. Select the text and copy it manually.');
  if (ok) { btn.classList.add('done'); btn.textContent = 'Copied'; setTimeout(() => { btn.classList.remove('done'); btn.textContent = 'Copy result'; }, 1500); }
});

// ---- Case -------------------------------------------------------------------
const casePanel = document.querySelector('[data-tool="case"]');
if (casePanel) {
  const words = (s) => s.match(/\p{L}[\p{L}\p{M}'’-]*|\p{N}+/gu) || [];
  const transforms = {
    upper: (s) => s.toUpperCase(),
    lower: (s) => s.toLowerCase(),
    title: (s) => s.toLowerCase().replace(/(^|[\s\-—/'’(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    sentence: (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    camel: (s) => words(s).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join(''),
    snake: (s) => words(s).map((w) => w.toLowerCase()).join('_'),
    kebab: (s) => words(s).map((w) => w.toLowerCase()).join('-'),
    alt: (s) => Array.from(s).map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join(''),
  };
  const run = (mode) => {
    const v = input(casePanel).value;
    setOut(casePanel, v ? transforms[mode](v) : '');
  };
  casePanel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-case]');
    if (b) run(b.dataset.case);
  });
  input(casePanel).addEventListener('input', () => setOut(casePanel, input(casePanel).value));
}

// ---- Count ------------------------------------------------------------------
const countPanel = document.querySelector('[data-tool="count"]');
if (countPanel) {
  const metric = (n, label) => `<span><b>${n}</b> ${label}</span>`;
  const run = () => {
    const v = input(countPanel).value;
    const chars = Array.from(v).length;
    const noSpace = v.replace(/\s/g, '').length;
    const wordsA = (v.trim().match(/\S+/g) || []).length;
    const lines = v ? v.split(/\r\n|\r|\n/).length : 0;
    const sentences = (v.match(/[^.!?…]+[.!?…]+/g) || (v.trim() ? [v.trim()] : [])).length;
    setOut(countPanel, v, `<div class="metric">${metric(chars, 'characters')}${metric(noSpace, 'no spaces')}${metric(wordsA, 'words')}${metric(lines, 'lines')}${metric(sentences, 'sentences')}</div>`);
  };
  input(countPanel).addEventListener('input', run);
}

// ---- Reverse ----------------------------------------------------------------
const revPanel = document.querySelector('[data-tool="reverse"]');
if (revPanel) {
  const run = (mode) => {
    const v = input(revPanel).value;
    const chars = Array.from(v).reverse().join('');
    const words = v.split(/(\s+)/).reverse().join('');
    setOut(revPanel, mode === 'chars' ? chars : mode === 'words' ? words : Array.from(words).reverse().join(''));
  };
  revPanel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reverse]');
    if (b) run(b.dataset.reverse);
  });
  input(revPanel).addEventListener('input', () => setOut(revPanel, ''));
}

// ---- Slug -------------------------------------------------------------------
const slugPanel = document.querySelector('[data-tool="slug"]');
if (slugPanel) {
  const run = () => {
    const v = input(slugPanel).value;
    const slug = v.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
      .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    setOut(slugPanel, slug);
  };
  slugPanel.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') run(); });
  input(slugPanel).addEventListener('input', run);
}

// ---- Find & replace ---------------------------------------------------------
const repPanel = document.querySelector('[data-tool="replace"]');
if (repPanel) {
  let ci = false;
  const run = () => {
    const v = input(repPanel).value;
    const find = repPanel.querySelector('[data-replace-find]').value;
    const withV = repPanel.querySelector('[data-replace-with]').value;
    if (!find) { setOut(repPanel, v); return; }
    const esc = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    setOut(repPanel, v.replace(new RegExp(esc, ci ? 'g' : 'gi'), () => withV));
  };
  repPanel.addEventListener('click', (e) => {
    if (e.target.closest('[data-replace-go]')) run();
    if (e.target.closest('[data-replace-ci]')) {
      ci = !ci;
      e.target.closest('[data-replace-ci]').classList.toggle('done', ci);
      run();
    }
  });
  repPanel.querySelector('[data-replace-find]').addEventListener('input', run);
  repPanel.querySelector('[data-replace-with]').addEventListener('input', run);
  input(repPanel).addEventListener('input', run);
}

// ---- Lines ------------------------------------------------------------------
const linePanel = document.querySelector('[data-tool="lines"]');
if (linePanel) {
  const run = (mode) => {
    const v = input(linePanel).value;
    let lines = v.split(/\r\n|\r|\n/);
    if (mode === 'sort') lines = lines.slice().sort((a, b) => a.localeCompare(b));
    if (mode === 'revsort') lines = lines.slice().sort((a, b) => b.localeCompare(a));
    if (mode === 'sortlen') lines = lines.slice().sort((a, b) => a.length - b.length);
    if (mode === 'dedupe') lines = [...new Set(lines)];
    if (mode === 'trim') lines = lines.map((l) => l.trim());
    if (mode === 'dropempty') lines = lines.filter((l) => l.trim());
    if (mode === 'shuffle') { for (let i = lines.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [lines[i], lines[j]] = [lines[j], lines[i]]; } }
    setOut(linePanel, lines.join('\n'));
  };
  linePanel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lines]');
    if (b) run(b.dataset.lines);
  });
  input(linePanel).addEventListener('input', () => setOut(linePanel, ''));
}

// ---- Clean ------------------------------------------------------------------
const cleanPanel = document.querySelector('[data-tool="clean"]');
if (cleanPanel) {
  const modes = {
    spaces: (s) => s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim(),
    lines: (s) => s.replace(/\r\n|\r|\n/g, ' ').replace(/ {2,}/g, ' ').trim(),
    punct: (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/–/g, '-').replace(/\.\.\./g, '…').replace(/\s+([,.!?;:])/g, '$1'),
    zero: (s) => s.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, ''),
    emoji: (s) => s.replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').replace(/  +/g, ' ').trim(),
  };
  const run = (mode) => setOut(cleanPanel, modes[mode](input(cleanPanel).value));
  cleanPanel.addEventListener('click', (e) => { const b = e.target.closest('[data-clean]'); if (b) run(b.dataset.clean); });
  input(cleanPanel).addEventListener('input', () => setOut(cleanPanel, ''));
}

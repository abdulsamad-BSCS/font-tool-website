// M5 - Font Studio: draw styled text on a canvas and export a PNG, all locally.
import { transform } from './engine/engine.js';
import { copyText, say } from './lib.js';

const canvas = document.getElementById('studio-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const textIn = document.querySelector('[data-studio-text]');
  const styleSel = document.querySelector('[data-studio-style]');
  const styleSearch = document.querySelector('[data-studio-style-search]');
  const sizeIn = document.querySelector('[data-studio-size]');
  const trackIn = document.querySelector('[data-studio-tracking]');
  const alignIn = document.querySelector('[data-studio-align]');
  const fontIn = document.querySelector('[data-studio-font]');
  const pipelines = new Map();

  const BGS = {
    midnight: () => ['#12101d', '#241d4a'],
    violet: () => ['#4b2fe0', '#e02fa0'],
    sunset: () => ['#ff9d3c', '#ff4d6d'],
    paper: () => ['#f6f4fb', '#e7e2f6'],
    mint: () => ['#0f9d76', '#7ef0c0'],
  };
  let fg = '#ffffff';
  let bg = 'midnight';

  async function ensurePipeline(id) {
    if (pipelines.has(id)) return pipelines.get(id);
    const res = await fetch(`/api/styles?ids=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.styles[0]) return null;
    pipelines.set(id, data.styles[0].pipeline);
    return data.styles[0].pipeline;
  }

  function wrap(text, maxChars) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) { if (line) lines.push(line); line = w; }
      else line = (line ? line + ' ' : '') + w;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  async function draw() {
    const id = styleSel.value;
    const pipeline = await ensurePipeline(id);
    const value = textIn.value.trim() || textIn.placeholder;
    const styled = pipeline ? transform(value, pipeline) : value;
    const [c0, c1] = BGS[bg]();
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const size = Number(sizeIn.value);
    const track = Number(trackIn.value);
    const font = `${size}px ${fontIn.value}`;
    ctx.font = font;
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';

    const lines = wrap(styled, Math.max(8, Math.floor((canvas.width - 140) / (size * 0.62))));
    const lh = size * 1.35;
    const startY = canvas.height / 2 - ((lines.length - 1) * lh) / 2;
    const align = alignIn.value;
    const x = align === 'center' ? canvas.width / 2 : align === 'right' ? canvas.width - 70 : 70;
    ctx.textAlign = align;

    // letter spacing fallback for browsers without ctx.letterSpacing
    lines.forEach((line, i) => {
      const y = startY + i * lh;
      if ('letterSpacing' in ctx) { ctx.letterSpacing = `${track}px`; ctx.fillText(line, x, y); return; }
      if (!track) { ctx.fillText(line, x, y); return; }
      const chars = Array.from(line);
      const widths = chars.map((c) => ctx.measureText(c).width + track);
      const total = widths.reduce((a, b) => a + b, 0) - track;
      let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      const prev = ctx.textAlign;
      ctx.textAlign = 'left';
      chars.forEach((c, ci2) => { ctx.fillText(c, cx, y); cx += widths[ci2]; });
      ctx.textAlign = prev;
    });
  }

  // Wiring ---------------------------------------------------------------------
  let drawPending = 0;
  const schedule = () => { if (drawPending) return; drawPending = requestAnimationFrame(() => { drawPending = 0; draw(); }); };

  textIn.addEventListener('input', schedule);
  styleSel.addEventListener('change', schedule);
  sizeIn.addEventListener('input', () => { document.querySelector('[data-studio-size-label]').textContent = sizeIn.value; schedule(); });
  trackIn.addEventListener('input', () => { document.querySelector('[data-studio-track-label]').textContent = trackIn.value; schedule(); });
  alignIn.addEventListener('change', schedule);
  fontIn.addEventListener('change', schedule);

  document.querySelector('[data-studio-fg]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    fg = b.dataset.color;
    for (const s of e.currentTarget.querySelectorAll('button')) s.setAttribute('aria-pressed', String(s === b));
    schedule();
  });
  document.querySelector('[data-studio-bg]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bg]');
    if (!b) return;
    bg = b.dataset.bg;
    for (const s of e.currentTarget.querySelectorAll('button')) s.setAttribute('aria-pressed', String(s === b));
    schedule();
  });

  // Style search narrows the <select> options by name.
  if (styleSearch) {
    const options = Array.from(styleSel.options);
    styleSearch.addEventListener('input', () => {
      const q = styleSearch.value.trim().toLowerCase();
      for (const o of options) o.hidden = q ? !o.textContent.toLowerCase().includes(q) : false;
      const first = options.find((o) => !o.hidden);
      if (first && styleSel.selectedOptions[0] && styleSel.selectedOptions[0].hidden) styleSel.value = first.value;
      schedule();
    });
  }

  document.querySelector('[data-studio-download]').addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) { say('Could not build the image.'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'stylix-text.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      say('PNG downloaded');
    }, 'image/png');
  });

  document.querySelector('[data-studio-copy]').addEventListener('click', async () => {
    const pipeline = await ensurePipeline(styleSel.value);
    const value = textIn.value.trim() || textIn.placeholder;
    const ok = await copyText(pipeline ? transform(value, pipeline) : value);
    say(ok ? 'Styled text copied' : 'Copy failed — select the preview text manually.');
  });

  draw();
}

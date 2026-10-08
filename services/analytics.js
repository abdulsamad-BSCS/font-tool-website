// M8 - privacy-friendly, cookieless analytics. Counters live in memory for the
// lifetime of this process (per instance on Vercel). No IP storage, no PII.
const started = Date.now();
const pageviews = new Map(); // path -> count
const events = new Map(); // event -> count
const daily = new Map(); // YYYY-MM-DD -> count
let sessions = 0;

const day = (d = new Date()) => d.toISOString().slice(0, 10);

export function track({ path, event } = {}) {
  if (path && typeof path === 'string' && path.startsWith('/') && path.length <= 200) {
    pageviews.set(path, (pageviews.get(path) || 0) + 1);
    const key = day();
    daily.set(key, (daily.get(key) || 0) + 1);
  }
  if (event && typeof event === 'string' && event.length <= 60) {
    events.set(event, (events.get(event) || 0) + 1);
  }
}

export function trackSession() { sessions += 1; }

export function snapshot() {
  const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));
  return {
    uptimeSeconds: Math.round((Date.now() - started) / 1000),
    sessions,
    totalViews: [...pageviews.values()].reduce((a, b) => a + b, 0),
    topPages: top(pageviews, 10),
    events: top(events, 10),
    daily: top(daily, 7),
  };
}

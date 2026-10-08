import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/environment.js';
import { site } from './config/site.js';
import { nonce, securityHeaders, permissionsPolicy } from './middleware/security.js';
import routes from './routes/index.js';
import { applyStyle } from './services/unicode/engine.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // Vercel sits behind a proxy; needed for correct client IPs
app.set('view engine', 'ejs');
app.set('views', path.join(root, 'views'));
app.locals.wordmark = applyStyle(site.name, { pipeline: [{ type: 'map', name: 'bold-script' }] });

app.use(nonce);
app.use(securityHeaders);
app.use(permissionsPolicy);
app.use(compression());
app.use('/api', cors({ origin: env.siteUrl, methods: ['GET', 'POST'] }));
app.use(express.static(path.join(root, 'public'), { maxAge: env.isProd ? '1h' : 0, index: false }));

app.use(routes);

app.use((req, res) => {
  res.status(404);
  if (req.accepts(['html', 'json']) === 'json' && req.path.startsWith('/api')) return res.json({ error: 'not_found' });
  res.render('errors/404', { site, env, meta: { title: 'Page not found', description: '', robots: 'noindex,follow', canonical: env.siteUrl + req.path, noindex: true, og: {}, jsonLd: [], breadcrumbs: [] } });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') { err.status = 400; err.code = 'bad_json'; err.message = 'Request body must be valid JSON.'; }
  if (err.type === 'entity.too.large') { err.status = 413; err.code = 'too_large'; err.message = 'Request body is too large.'; }
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  const id = Math.random().toString(36).slice(2, 10);
  if (status >= 500) console.error(`[${id}]`, err); // stack stays in server logs only
  if (req.path.startsWith('/api')) {
    return res.status(status).json({ error: err.code || (status === 500 ? 'server_error' : 'error'), message: status === 500 ? 'Something went wrong.' : err.message, ...(status === 500 ? { id } : {}) });
  }
  const view = status === 404 ? 'errors/404' : 'errors/500';
  res.status(status).render(view, { site, env, errorId: id, message: status >= 500 ? '' : err.message,
    meta: { title: status === 404 ? 'Page not found' : 'Something went wrong', description: '', robots: 'noindex,follow', canonical: env.siteUrl + req.path, noindex: true, og: {}, jsonLd: [], breadcrumbs: [] } });
});

export default app;

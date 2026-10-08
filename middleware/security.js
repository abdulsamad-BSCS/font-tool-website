import crypto from 'node:crypto';
import helmet from 'helmet';
import { env, firebaseConfigured } from '../config/environment.js';

export function nonce(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
}

// Firebase only widens connect-src when it is actually configured.
const firebaseConnect = firebaseConfigured
  ? ['https://*.googleapis.com', 'https://*.gstatic.com', 'https://securetoken.googleapis.com']
  : [];

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", ...firebaseConnect],
      fontSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      ...(env.isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
});

export function permissionsPolicy(req, res, next) {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
}

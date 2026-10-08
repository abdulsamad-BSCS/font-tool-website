import rateLimit from 'express-rate-limit';
import { env } from '../config/environment.js';

// In-memory limiter: fine for dev and a single instance. On Vercel, counters are per serverless
// instance, so a shared store (Firestore or Upstash Redis) replaces this in milestone M6.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.rateLimitPerMinute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests. Please wait a minute and try again.' },
});

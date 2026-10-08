import 'dotenv/config';

const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);
const str = (v, d = '') => (v === undefined || v === '' ? d : String(v));

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isVercel: Boolean(process.env.VERCEL),
  port: num(process.env.PORT, 3000),
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  maxInputLength: num(process.env.MAX_INPUT_LENGTH, 5000),
  ssrTextLimit: 300, // longer input is still handled live in the browser; SSR output stays small
  rateLimitPerMinute: num(process.env.RATE_LIMIT_PER_MINUTE, 60),
  contactEmail: process.env.CONTACT_EMAIL || '',

  // M6 - Firebase (client SDK config; the site degrades to local mode without it).
  firebase: {
    apiKey: str(process.env.FIREBASE_API_KEY),
    authDomain: str(process.env.FIREBASE_AUTH_DOMAIN),
    projectId: str(process.env.FIREBASE_PROJECT_ID),
    appId: str(process.env.FIREBASE_APP_ID),
    storageBucket: str(process.env.FIREBASE_STORAGE_BUCKET),
    messagingSenderId: str(process.env.FIREBASE_MESSAGING_SENDER_ID),
  },
  // M7 - optional model provider for the AI stylist.
  aiApiKey: str(process.env.AI_API_KEY),
  aiModel: str(process.env.AI_MODEL, 'gpt-4o-mini'),
  // M7 - admin dashboard token (?key= or x-admin-key header).
  adminKey: str(process.env.ADMIN_KEY),
};

export const firebaseConfigured = Boolean(env.firebase.apiKey && env.firebase.projectId && env.firebase.appId);

import { env } from '../config/environment.js';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Returns a clean text string or throws a 400-style error. */
export function cleanText(value, { max = env.maxInputLength, required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw httpError(400, 'text_required', 'Enter some text to style.');
    return '';
  }
  if (typeof value !== 'string') throw httpError(400, 'text_invalid', 'Text must be a string.');
  if (value.length > max) throw httpError(400, 'text_too_long', `Text is limited to ${max} characters.`);
  return value;
}

export function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

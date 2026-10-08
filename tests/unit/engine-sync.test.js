import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('browser engine copy in public/js/engine is identical to services/unicode (run npm run sync:engine)', () => {
  for (const f of ['engine.js', 'mappings.js', 'decorators.js']) {
    const a = readFileSync(new URL(`../../services/unicode/${f}`, import.meta.url), 'utf8');
    const b = readFileSync(new URL(`../../public/js/engine/${f}`, import.meta.url), 'utf8');
    assert.equal(a, b, `${f} is out of sync`);
  }
});

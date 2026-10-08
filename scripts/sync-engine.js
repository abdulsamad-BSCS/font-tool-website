// Copies the pure engine into public/js/engine so the browser imports the exact same files.
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'public/js/engine');
mkdirSync(dest, { recursive: true });
for (const f of ['engine.js', 'mappings.js', 'decorators.js']) cpSync(path.join(root, 'services/unicode', f), path.join(dest, f));
console.log('Engine synced to public/js/engine');

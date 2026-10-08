// Bundle the browser entry points that pull in big libraries (gsap, three, firebase).
// Plain modules (engine, generator, tools...) are served unbundled.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const production = process.env.NODE_ENV === 'production';

const entries = {
  motion: 'src/motion.js',
  hero3d: 'src/hero3d.jsx',
};

const result = await build({
  entryPoints: entries,
  bundle: true,
  format: 'esm',
  outdir: path.join(root, 'public/js/dist'),
  entryNames: '[name]',
  target: ['es2020'],
  minify: production,
  sourcemap: !production,
  legalComments: 'none',
  logLevel: 'info',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development') },
  metafile: true,
});

const kb = (n) => `${(n / 1024).toFixed(0)}kb`;
for (const [file, meta] of Object.entries(result.metafile.outputs)) {
  if (file.endsWith('.js')) console.log(`  ${path.basename(file)}  ${kb(meta.bytes)}`);
}

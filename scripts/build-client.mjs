#!/usr/bin/env node
/**
 * Replaces Grunt: browserify shared physics + concat page bundles + less → css.
 */
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import less from 'less';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'public', 'dist');

function walk(dir, filter) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, filter));
    } else if (filter(full)) {
      out.push(full);
    }
  }
  return out.sort();
}

function moduleJsFiles(name) {
  const base = path.join(root, 'public', 'src', name);
  const startup = path.join(base, 'startup.js');
  const files = [];
  if (fs.existsSync(startup)) {
    files.push(startup);
  }
  for (const f of walk(base, (p) => p.endsWith('.js') && path.basename(p) !== 'startup.js')) {
    files.push(f);
  }
  return files;
}

function moduleLessFiles(name) {
  const base = path.join(root, 'public', 'src', name);
  return walk(base, (p) => p.endsWith('.less'));
}

function concatFiles(files, dest, banner) {
  const parts = files.map((f) => {
    const rel = path.relative(root, f);
    return `/* ${rel} */\n` + fs.readFileSync(f, 'utf8');
  });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, (banner || '') + parts.join('\n'));
  console.info('wrote', path.relative(root, dest));
}

async function compileLess(files, dest) {
  if (!files.length) {
    fs.writeFileSync(dest, '');
    return;
  }
  const src = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const result = await less.render(src, { compress: true });
  fs.writeFileSync(dest, result.css);
  console.info('wrote', path.relative(root, dest));
}

async function buildShared() {
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [path.join(root, 'libs', 'shared_browserify.js')],
    bundle: true,
    outfile: path.join(dist, 'shared.js'),
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    logLevel: 'info'
  });
}

async function buildPage(name, modules) {
  let jsFiles = [];
  let lessFiles = [];
  for (const mod of modules) {
    jsFiles = jsFiles.concat(moduleJsFiles(mod));
    lessFiles = lessFiles.concat(moduleLessFiles(mod));
  }
  // shared physics at end of each page bundle (legacy order)
  jsFiles.push(path.join(dist, 'shared.js'));
  // dedupe while preserving order
  const seen = new Set();
  jsFiles = jsFiles.filter((f) => {
    if (seen.has(f)) return false;
    seen.add(f);
    return true;
  });

  const jsDest = path.join(dist, `all_${name}.js`);
  concatFiles(jsFiles, jsDest);
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [jsDest],
    outfile: path.join(dist, `all_${name}.min.js`),
    minify: true,
    allowOverwrite: true,
    logLevel: 'silent'
  });
  await compileLess(lessFiles, path.join(dist, `all_${name}.css`));
}

async function buildVendor(name, globDir) {
  const files = walk(path.join(root, 'public', 'src', 'vendor', globDir), (p) => p.endsWith('.js'));
  concatFiles(files, path.join(dist, `vendor_${name}.js`));
}

async function main() {
  fs.mkdirSync(dist, { recursive: true });
  await buildShared();
  await buildPage('home', ['common', 'home']);
  await buildPage('game', ['common', 'game']);
  await buildPage('mapmaker', ['common', 'mapmaker']);
  await buildPage('marketplace', ['common', 'marketplace']);
  await buildPage('mobile', ['mobile']);
  await buildPage('desktop', ['desktop']);
  await buildVendor('common', 'common');
  await buildVendor('webgl', 'webgl');
  await buildVendor('mapmaker', 'mapmaker');
  console.info('client build complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

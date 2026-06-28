import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const outdir = 'dist';

// Entry-point keys become the output filenames the manifest references.
const entryPoints = {
    background: 'src/background/index.ts',
    contentScript: 'src/content/index.ts',
    popup: 'src/popup/popup.ts'
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints,
    outdir,
    bundle: true,
    format: 'iife',
    target: 'chrome114',
    logLevel: 'info',
    legalComments: 'none'
};

function copyStatic() {
    cpSync('manifest.json', `${outdir}/manifest.json`);
    cpSync('src/popup/popup.html', `${outdir}/popup.html`);
    cpSync('src/popup/popup.css', `${outdir}/popup.css`);
    cpSync('public', `${outdir}/public`, { recursive: true });
}

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    copyStatic();
    console.log('esbuild: watching for changes -> dist/');
} else {
    await esbuild.build(buildOptions);
    copyStatic();
    console.log('esbuild: build complete -> dist/');
}

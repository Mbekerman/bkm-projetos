import {build} from 'esbuild';
import {mkdir,cp} from 'node:fs/promises';
await mkdir('public/dist',{recursive:true});
await build({entryPoints:['src/online.js'],outfile:'public/dist/online.js',bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',legalComments:'eof'});
await cp('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/dist/pdf.worker.min.mjs');
for(const name of ['cmaps','standard_fonts','wasm'])await cp(`node_modules/pdfjs-dist/${name}`,`public/dist/${name}`,{recursive:true});
for(const [from,to] of [['node_modules/pdfjs-dist/LICENSE','public/dist/PDFJS-LICENSE.txt'],['node_modules/@supabase/supabase-js/LICENSE','public/dist/SUPABASE-LICENSE.txt']])await cp(from,to);
console.log('Aplicativo conectado e visualizador compilados.');

await build({entryPoints:['tests/review-browser.js'],outfile:'public/dist/review-test.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});

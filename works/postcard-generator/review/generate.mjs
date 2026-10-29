import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {generateScene,validateScene} from '../engine.mjs';
import {renderSVG} from '../renderer.mjs';
const require=createRequire(import.meta.url);
const sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'));
const out=new URL('./',import.meta.url);
const results=[];
for(let i=1;i<=36;i++) {
 const seed=`harbour-${String(i).padStart(3,'0')}`;
 const scene=generateScene(seed);const svg=renderSVG(scene);
 await fs.writeFile(new URL(`${seed}.svg`,out),svg);
 await sharp(Buffer.from(svg)).resize(320,400).png().toFile(new URL(`${seed}.png`,out).pathname);
 const result=validateScene(scene);
 results.push({seed,composition:scene.composition,palette:scene.palette.id,shoreY:scene.shoreY,...result,svgElements:(svg.match(/</g)||[]).length});
}
await fs.writeFile(new URL('metrics.json',out),JSON.stringify(results,null,2)+'\n');
const cards=results.map(r=>`<a href="../?seed=${r.seed}&palette=auto&density=normal&composition=auto&v=0.1"><img src="${r.seed}.svg" width="200" height="250" loading="lazy" alt="${r.seed} の水辺の街"><span>${r.seed}</span><small>${r.composition} · ${r.palette}</small></a>`).join('');
await fs.writeFile(new URL('index.html',out),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>36 seeds — Postcard Generator Lab 0.1</title><style>*{box-sizing:border-box}body{margin:24px;font:14px system-ui;background:#f1eee5;color:#243c46}header{max-width:1300px;margin:0 auto 24px;display:flex;gap:24px;align-items:baseline}h1{font-size:20px}a{color:inherit}main{max-width:1300px;margin:auto;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:24px 12px}main a{text-decoration:none}img{display:block;width:100%;height:auto}span,small{display:block;margin-top:5px}small{font-size:11px;color:#526666}@media(max-width:760px){body{margin:16px}main{grid-template-columns:repeat(3,minmax(0,1fr))}h1{font-size:16px}}</style></head><body><header><a href="../">← Generator</a><h1>36 seeds · Lab 0.1</h1></header><main>${cards}</main></body></html>`);
console.log(JSON.stringify({seeds:results.length,errors:results.flatMap(r=>r.errors),warnings:results.filter(r=>r.warnings.length),elements:[Math.min(...results.map(r=>r.svgElements)),Math.max(...results.map(r=>r.svgElements))]},null,2));

// Review-only: sharp is supplied by the Codex runtime, not by the website.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {generateScene,validateScene,PALETTES,SCENES,ROOFS,WINDOWS} from '../engine.mjs';
import {renderSVG} from '../renderer.mjs';
const require=createRequire(import.meta.url);
const sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'));
const folder=new URL('./',import.meta.url);
const ids=SCENES.map(s=>typeof s==='string'?s:s.id);
const labels=Object.fromEntries(SCENES.map(s=>typeof s==='string'?[s,s]:[s.id,s.name]));
const samples=[];
for(const mode of ids)for(let i=1;i<=8;i++) samples.push({id:`${mode}-${String(i).padStart(3,'0')}`,seed:`${mode}-${String(i).padStart(3,'0')}`,settings:{version:'0.2',scene:mode}});
const roofIDs=ROOFS;
const windowIDs=WINDOWS;
for(const roof of roofIDs)samples.push({id:'roof-'+roof,seed:'roof-comparison',settings:{version:'0.2',scene:'closeup',roofs:roof,windows:'rect',palette:'harbor',colorMode:'varied'}});
for(const window of windowIDs)samples.push({id:'window-'+window,seed:'window-comparison',settings:{version:'0.2',scene:'closeup',roofs:'gable',windows:window,palette:'harbor',colorMode:'varied'}});
for(const p of PALETTES)samples.push({id:'palette-'+p.id,seed:'palette-comparison',settings:{version:'0.2',scene:'street',palette:p.id,colorMode:'varied'}});
for(const colorMode of ['varied','tonal','accent'])samples.push({id:'color-'+colorMode,seed:'color-comparison',settings:{version:'0.2',scene:'square',palette:'harbor',colorMode}});
for(const id of ['closeup-003','color-tonal','color-accent']){const svg=await fs.readFile(new URL('before/'+id+'.svg',folder));await sharp(svg).resize(320,400).png().toFile(new URL('before/'+id+'.png',folder).pathname);}
const records=[];
for(const sample of samples){
 const scene=generateScene(sample.seed,sample.settings),svg=renderSVG(scene),validation=validateScene(scene);
 await fs.writeFile(new URL(sample.id+'.svg',folder),svg);
 await sharp(Buffer.from(svg)).resize(320,400).png().toFile(new URL(sample.id+'.png',folder).pathname);
 const record={id:sample.id,seed:scene.seed,settings:sample.settings,normalizedSettings:scene.settings,version:scene.version,mode:scene.mode,composition:scene.composition,palette:scene.palette.id,svgElements:(svg.match(/</g)||[]).length,svgBytes:Buffer.byteLength(svg),svgSHA256:crypto.createHash('sha256').update(svg).digest('hex'),...validation};
 records.push(record);
}
await fs.writeFile(new URL('metrics.json',folder),JSON.stringify(records,null,2)+'\n');
const url=r=>{const q=new URLSearchParams({...r.normalizedSettings,seed:r.seed,v:'0.2'});q.delete('version');return '../?'+q;};
const card=r=>`<a href="${url(r)}"><img src="${r.id}.svg" width="200" height="250" loading="lazy" alt="${r.id}"><span>${r.id}</span><small>${r.palette}</small></a>`;
const css='*{box-sizing:border-box}body{margin:24px;font:14px system-ui;background:#f1eee5;color:#243c46}header,section{max-width:1300px;margin:0 auto 28px}header{display:flex;gap:24px;align-items:baseline}h1{font-size:20px}h2{font-size:16px;font-weight:500}a{color:inherit}.cards{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:20px 10px}.cards a{text-decoration:none}img{display:block;width:100%;height:auto}span,small{display:block;margin-top:5px}small{font-size:11px;color:#526666}@media(max-width:900px){.cards{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:500px){body{margin:16px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:16px}}';
const sections=ids.map(id=>`<section><h2>${labels[id]}</h2><div class="cards">${records.filter(r=>r.settings.scene===id&&!r.id.startsWith('roof-')&&!r.id.startsWith('window-')&&!r.id.startsWith('palette-')&&!r.id.startsWith('color-')).map(card).join('')}</div></section>`).join('');
const variations=[['屋根',r=>r.id.startsWith('roof-')],['窓',r=>r.id.startsWith('window-')],['配色',r=>r.id.startsWith('palette-')],['色の関係',r=>r.id.startsWith('color-')]].map(([label,filter])=>`<section><h2>${label}</h2><div class="cards">${records.filter(filter).map(card).join('')}</div></section>`).join('');
await fs.writeFile(new URL('index.html',folder),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>5 scenes · Postcard Generator Lab 0.2</title><style>${css}</style></head><body><header><a href="../">← Generator</a><h1>5 scenes · Lab 0.2</h1><a href="patterns.html">屋根・窓・色</a></header>${sections}</body></html>`);
await fs.writeFile(new URL('patterns.html',folder),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Patterns · Postcard Generator Lab 0.2</title><style>${css}</style></head><body><header><a href="index.html">← 5 scenes</a><h1>屋根・窓・色 · Lab 0.2</h1></header>${variations}</body></html>`);
console.log(JSON.stringify({samples:records.length,sceneSamples:40,errors:records.flatMap(r=>r.errors.map(error=>({id:r.id,error}))),warnings:records.filter(r=>r.warnings.length).map(r=>({id:r.id,warnings:r.warnings})),svgElements:[Math.min(...records.map(r=>r.svgElements)),Math.max(...records.map(r=>r.svgElements))]},null,2));

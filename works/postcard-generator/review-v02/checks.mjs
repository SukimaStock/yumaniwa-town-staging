import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {generateScene,validateScene,SCENES,ROOFS,WINDOWS,PALETTES} from '../engine.mjs';
import {renderSVG} from '../renderer.mjs';
const geometry=s=>JSON.stringify({mode:s.mode,blocks:s.blocks.map(block=>block.buildings.map(b=>Object.fromEntries(['id','x','y','width','height','base','cols','rows','layer'].map(k=>[k,b[k]])))),landmark:s.landmark?Object.fromEntries(['x','y','width','height','base'].map(k=>[k,s.landmark[k]])):null,surfaces:s.surfaces,stairs:s.stairs,plaza:s.plaza,boats:s.boats.map(b=>Object.fromEntries(['x','y','width','height','sail'].map(k=>[k,b[k]])))});
const failures=[];let scenes=0;
for(const scene of SCENES.map(s=>s.id))for(let seed=0;seed<100;seed++)for(const density of ['open','normal','dense']){
 const s=generateScene('independent-'+seed,{scene,density}),v=validateScene(s),svg=renderSVG(s);scenes++;
 if(v.errors.length)failures.push({scene,seed,density,errors:v.errors});
 assert.equal(svg.includes('NaN'),false);assert.equal(svg.includes('Infinity'),false);assert.ok(svg.endsWith('</svg>'));
 assert.equal(svg,renderSVG(generateScene('independent-'+seed,{scene,density})));
}
let variants=0;
for(const scene of SCENES.map(s=>s.id))for(let seed=0;seed<6;seed++){
 const base=generateScene('independent-variant-'+seed,{scene}),g=geometry(base);
 const options=[...ROOFS.map(roofs=>({roofs})),...WINDOWS.map(windows=>({windows})),...PALETTES.map(p=>({palette:p.id})),...['varied','tonal','accent'].map(colorMode=>({colorMode}))];
 for(const opt of options){const s=generateScene(base.seed,{scene,...opt});variants++;assert.equal(geometry(s),g,JSON.stringify({scene,seed,opt}));assert.deepEqual(validateScene(s).errors,[]);}
}
let legacyMatches=0;
for(let i=1;i<=36;i++){
 const seed='harbour-'+String(i).padStart(3,'0'),actual=renderSVG(generateScene(seed,{version:'0.1'})),expected=await fs.readFile(new URL('../review/'+seed+'.svg',import.meta.url),'utf8');assert.equal(actual,expected,seed);legacyMatches++;
}
const hashes={};for(const name of ['engine.mjs','renderer.mjs','app.mjs','exporter.mjs'])hashes[name]=crypto.createHash('sha256').update(await fs.readFile(new URL('../'+name,import.meta.url))).digest('hex');
const result={independentSceneCases:scenes,independentStyleCases:variants,legacySavedSVGMatches:legacyMatches,failures,hashes};
await fs.writeFile(new URL('independent-checks.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
assert.deepEqual(failures,[]);

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {generateScene,validateScene,normalizeSettings,PALETTES,SCENES,ROOFS,WINDOWS}from './engine.mjs';import{renderSVG}from './renderer.mjs';
import{generateScene as oldScene}from './versions/0.1/engine.mjs';import{renderSVG as oldSVG}from './versions/0.1/renderer.mjs';
const geometry=s=>({mode:s.mode,blocks:s.blocks.map(b=>b.buildings.map(({id,layer,x,y,width,height,base,cols,rows})=>({id,layer,x,y,width,height,base,cols,rows}))),shoreY:s.shoreY,props:[s.road,s.plaza,s.stairs,s.trees,s.lamps,s.benches]});
test('0.1 dispatch retains exact scene data and all36 saved vector outputs',()=>{
 for(let i=1;i<=36;i++){const seed='harbour-'+String(i).padStart(3,'0');const s=generateScene(seed,{version:'0.1'});assert.deepEqual(s,oldScene(seed));assert.equal(renderSVG(s),oldSVG(oldScene(seed)));assert.equal(renderSVG(s),fs.readFileSync(new URL(`./review/${seed}.svg`,import.meta.url),'utf8'));}
 for(const seed of [undefined,'',null])assert.deepEqual(generateScene(seed,{version:'0.1'}),oldScene(seed));
 assert.deepEqual(normalizeSettings({version:'0.1',palette:'blue',scene:'square',roofs:'round',windows:'shutters',colorMode:'accent'}),{version:'0.1',scene:'waterfront',palette:'auto',density:'normal',composition:'auto',roofs:'auto',windows:'auto',colorMode:'auto'});
});
test('new version plain scene and SVG reproduce from seed and normalized settings',()=>{
 for(const {id}of SCENES){const a=generateScene('a shared town',{scene:id});assert.deepEqual(a,JSON.parse(JSON.stringify(a)));assert.deepEqual(a,generateScene('a shared town',{scene:id}));assert.equal(renderSVG(a),renderSVG(generateScene('a shared town',{scene:id})));}
});
test('3000 scenes have finite supported buildings and mode-specific counts/bounds',()=>{
 for(let i=0;i<200;i++)for(const {id}of SCENES)for(const density of ['open','normal','dense']){const s=generateScene(`patterns-audit-${i}`,{scene:id,density});assert.deepEqual(validateScene(s).errors,[],`${i}/${id}/${density}`);const svg=renderSVG(s);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<image|<script|<foreignObject|url\(/);assert.ok(svg.length<180000);assert.ok((svg.match(/</g)||[]).length<2400);}
});
test('scene types differ in layout, density changes house counts, automatic seed selects allfive',()=>{
 const scenes=SCENES.map(({id})=>generateScene('five-scene',{scene:id}));assert.equal(new Set(scenes.map(s=>JSON.stringify(geometry(s)))).size,5);
 for(const{ id}of SCENES.filter(s=>s.id!=='waterfront')){const count=d=>generateScene('density',{scene:id,density:d}).blocks.flatMap(b=>b.buildings).length;assert.ok(count('open')<count('dense'),id);}
 assert.equal(new Set(Array.from({length:100},(_,i)=>generateScene('auto-'+i).mode)).size,5);
});
test('palette, roof, window and color overrides leave building placement invariant',()=>{
 for(const {id}of SCENES){const base=generateScene('independent-streams',{scene:id});for(const p of PALETTES){assert.deepEqual(geometry(generateScene(base.seed,{scene:id,palette:p.id})),geometry(base));}for(const roofs of ROOFS){const s=generateScene(base.seed,{scene:id,roofs});assert.deepEqual(geometry(s),geometry(base));assert.ok(s.blocks.flatMap(b=>b.buildings).every(b=>b.roof===roofs));assert.deepEqual(validateScene(s).errors,[]);}for(const windows of WINDOWS){const s=generateScene(base.seed,{scene:id,windows});assert.deepEqual(geometry(s),geometry(base));assert.ok(s.blocks.flatMap(b=>b.buildings).every(b=>b.windowShape===windows));}for(const colorMode of ['varied','tonal','accent'])assert.deepEqual(geometry(generateScene(base.seed,{scene:id,colorMode})),geometry(base));}
});
test('all style combinations render safely and tonal/accent rules use intentional role colors',()=>{
 for(const {id}of SCENES)for(const roofs of ROOFS)for(const windows of WINDOWS){const s=generateScene('all-styles',{scene:id,roofs,windows});assert.deepEqual(validateScene(s).errors,[]);assert.doesNotMatch(renderSVG(s),/NaN|Infinity|undefined/);}
 for(const palette of PALETTES){const t=generateScene('tones',{scene:'street',palette:palette.id,colorMode:'tonal'});assert.ok(t.blocks[0].buildings.every(b=>palette.tonal.includes(b.wall)));const closeT=generateScene('tones',{scene:'closeup',palette:palette.id,colorMode:'tonal'});assert.ok(closeT.blocks[0].buildings.every(b=>palette.tonal.includes(b.wall)&&palette.tonal.includes(b.bandColor)));const a=generateScene('one-accent',{scene:'street',palette:palette.id,colorMode:'accent'});assert.equal(a.blocks[0].buildings.filter(b=>b.wall===palette.accent).length,1);const closeA=generateScene('one-accent',{scene:'closeup',palette:palette.id,colorMode:'accent'});for(const b of closeA.blocks[0].buildings)if(b.wall!==palette.accent){assert.ok([palette.light,palette.quay,palette.terraces[1]].includes(b.bandColor));assert.equal(b.roofColor,palette.ink);}}
});
test('validation catches broken placement and plaza obstruction without a beauty score',()=>{
 const s=generateScene('bad',{scene:'square'});s.blocks[0].buildings[0].width=NaN;s.blocks[1].buildings[0].base+=10;s.plaza.right=s.plaza.left+20;const v=validateScene(s);assert.ok(v.errors.some(e=>e.startsWith('non-finite:')));assert.ok(v.errors.some(e=>e.startsWith('unsupported:')));assert.ok(v.errors.includes('plaza-closed'));assert.equal(v.score,undefined);
});
test('SVG metadata contains full settings, input is escaped, unknown settings normalize',()=>{
 const seed='<script>&"';const s=generateScene(seed,{scene:'square',roofs:'step',windows:'round',palette:'blue',colorMode:'accent'}),svg=renderSVG(s);assert.match(svg,/&lt;script&gt;/);assert.doesNotMatch(svg,/<script>/);assert.match(svg,/version.*0.2.*seed.*settings/);assert.equal(normalizeSettings({scene:'unknown',version:'unknown',windows:'weird'}).scene,'auto');assert.equal(normalizeSettings({scene:'unknown',version:'unknown',windows:'weird'}).version,'0.2');
});

test('author cleanup excludes retired window and roof types even from previous explicit URLs',()=>{
 assert.deepEqual(WINDOWS,['rect','arch','paired']);assert.deepEqual(ROOFS,['gable','hip','flat','shed','round']);
 for(const windows of ['round','shutters'])assert.equal(normalizeSettings({windows}).windows,'rect');
 assert.equal(normalizeSettings({roofs:'step'}).roofs,'gable');
 for(let i=0;i<100;i++)for(const{ id}of SCENES){const s=generateScene('cleanup-'+i,{scene:id});assert.ok(s.blocks.flatMap(b=>b.buildings).every(b=>!['round','shutters'].includes(b.windowShape)&&b.roof!=='step'));}
 const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/<option value="step">|丸窓|雨戸/);assert.match(html,/丸屋根/);
});
test('crosswalk has five horizontal bars, stable x and separate y positions, within the road',()=>{
 let checked=0;
 for(let i=0;i<100;i++){
  const s=generateScene('crosswalk-'+i,{scene:'street'});if(!s.road.crosswalk)continue;
  const svg=renderSVG(s),group=svg.match(/<g data-crosswalk="true">(.*?)<\/g>/)[1];
  const rects=[...group.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m=>m.slice(1).map(Number));
  assert.equal(rects.length,5);assert.equal(new Set(rects.map(r=>r[0])).size,1);assert.equal(new Set(rects.map(r=>r[1])).size,5);
  for(const[x,y,w,h]of rects){assert.ok(w>h*5);assert.ok(x>=0&&x+w<=800);assert.ok(y>s.road.y&&y+h<1000);}
  for(let j=1;j<rects.length;j++)assert.ok(rects[j][1]>rects[j-1][1]+rects[j-1][3]);checked++;
 }
 assert.ok(checked>20);
});

test('facade and cloud streams preserve layout and replay all settings',()=>{
 for(const {id}of SCENES)for(const facade of ['plain','grid','terrace'])for(const sky of ['clear','clouds']){
  const settings={scene:id,facade,sky,windows:'rect'},s=generateScene('facade-example',settings);
  assert.deepEqual(geometry(s),geometry(generateScene(s.seed,{scene:id})));
  assert.deepEqual(s,generateScene(s.seed,JSON.parse(JSON.stringify(s.settings))));
  assert.deepEqual(validateScene(s).errors,[]);
  const all=s.blocks.flatMap(b=>b.buildings),svg=renderSVG(s);
  if(facade==='plain')assert.ok(all.every(b=>!b.windowGrid&&!b.terrace));
  if(facade==='grid'&&id==='closeup')assert.ok(all.some(b=>b.windowGrid));
  if(facade==='terrace'&&id==='closeup')assert.equal((svg.match(/data-terrace/g)||[]).length,all.length);
  if(sky==='clear')assert.equal(s.clouds.length,0);
  for(const b of all)if(b.windowGrid||b.terrace){if(id==='square')assert.ok(b.layer>0);else assert.equal(b.layer,Math.max(...all.map(b=>b.layer)));}
 }
});
test('clouds are bounded away from skyline over 500 seeds and all scene modes',()=>{
 let clouds=0,grids=0,terraces=0;
 for(let i=0;i<500;i++)for(const {id}of SCENES){const s=generateScene('details-'+i,{scene:id,sky:'clouds'});assert.deepEqual(validateScene(s).errors,[]);clouds+=s.clouds.length;for(const b of s.blocks.flatMap(b=>b.buildings)){grids+=!!b.windowGrid;terraces+=!!b.terrace;}}
 assert.ok(clouds>1000&&grids>100&&terraces>100);
});

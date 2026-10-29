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

test('ground floors reproduce and leave layout, stage1 details and palette unchanged',()=>{
 for(const {id}of SCENES)for(const facade of ['plain','grid','terrace'])for(const groundFloor of ['plain','arcade','awning']){
  const base=generateScene('ground-replay',{scene:id,facade,sky:'clouds',groundFloor:'plain'}),s=generateScene(base.seed,{...base.settings,groundFloor});
  assert.deepEqual(geometry(s),geometry(base));assert.deepEqual(s.clouds,base.clouds);
  assert.deepEqual(s,generateScene(s.seed,JSON.parse(JSON.stringify(s.settings))));
  const all=s.blocks.flatMap(b=>b.buildings),before=base.blocks.flatMap(b=>b.buildings);
  for(const [i,b]of all.entries())for(const key of ['wall','roof','roofColor','windowShape','windowGrid','terrace'])assert.equal(b[key],before[i][key]);
  if(groundFloor==='plain')assert.ok(all.every(b=>b.groundFloor===null));
  else if(id==='closeup')assert.ok(all.every(b=>b.groundFloor.kind===groundFloor));
  const svg=renderSVG(s);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.deepEqual(validateScene(s).errors,[]);
  assert.equal((svg.match(/data-ground-floor=/g)||[]).length,all.filter(b=>b.groundFloor).length);
 }
});
test('ground floor matrix stays beneath upper windows and within supported facades',()=>{
 for(let i=0;i<100;i++)for(const {id}of SCENES)for(const groundFloor of ['arcade','awning']){
  const s=generateScene('ground-audit-'+i,{scene:id,groundFloor,facade:i%2?'grid':'terrace'});
  assert.deepEqual(validateScene(s).errors,[]);
  for(const b of s.blocks.flatMap(b=>b.buildings))if(b.groundFloor){
   const g=b.groundFloor;assert.ok(b.width>=110&&b.height>=180);
   if(id==='square')assert.ok(b.layer>0);else assert.equal(b.layer,s.blocks.length-1);
   assert.ok(g.height>b.width*.8/g.count*.68/2,'arch can fit in reserved floor');
   // Read actual window positions from a standalone rendered facade, before its ground-floor group.
   const one={...s,mode:'closeup',blocks:[{...s.blocks[0],buildings:[b]}],surfaces:[],trees:[],lamps:[],benches:[],people:[]};
   const body=renderSVG(one).split('<g data-building=')[1].split('<g data-ground-floor=')[0];
   const windows=[...body.matchAll(/<rect x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)" fill="([^"]+)"/g)].filter(m=>m[3]===b.windowColor);
   for(const m of windows)assert.ok(Number(m[1])+Number(m[2])<=b.base-g.height-12,'window/rail ends above ground-floor opening');
  }
 }
 const bad=generateScene('broken-ground',{scene:'closeup',groundFloor:'arcade'});bad.blocks[0].buildings[0].groundFloor.height=0;assert.ok(validateScene(bad).errors.some(e=>e.startsWith('ground-floor:')));
 assert.equal(normalizeSettings({groundFloor:'unknown'}).groundFloor,'auto');
});

test('pre-stage2 normalized settings preserve old ground floors while fresh generation opts in',()=>{
 const previous={version:'0.2',scene:'closeup',facade:'grid',sky:'clouds',windows:'arch',palette:'blue'};
 assert.equal(normalizeSettings(previous).groundFloor,'plain');assert.equal(normalizeSettings({}).groundFloor,'auto');
 const old=generateScene('ground-history',previous);assert.ok(old.blocks.flatMap(b=>b.buildings).every(b=>b.groundFloor===null));
 assert.equal(normalizeSettings({...previous,groundFloor:'auto'}).groundFloor,'auto');
});

test('light shopfronts retain contrasting internal divisions on dark walls',()=>{
 const s=generateScene('ground-audit-0',{scene:'closeup',groundFloor:'awning'}),b=s.blocks[0].buildings.find(b=>b.windowColor===b.trim);
 assert.ok(b);const one={...s,blocks:[{...s.blocks[0],buildings:[b]}]};const g=renderSVG(one).match(/<g data-ground-floor="awning">(.*?)<\/g>/)[1];
 assert.equal((g.match(new RegExp('height="'+Math.round(Math.min(78,b.height*.22)*100)/100+'" fill="'+b.wall+'"','g'))||[]).length,2);
});

test('accent settings reproduce and preserve all previous geometry and feature streams',()=>{
 for(const {id}of SCENES)for(const facade of ['plain','grid','terrace'])for(const groundFloor of ['plain','arcade','awning']){
  const base=generateScene('accent-streams',{scene:id,facade,groundFloor,sky:'clouds',accents:'plain'});
  const original=s=>({blocks:s.blocks.map(block=>block.buildings.map(({plants,shade,...rest})=>rest)),clouds:s.clouds,boats:s.boats,people:s.people,palette:s.palette});
  for(const accents of ['plants','shade','both']){const s=generateScene(base.seed,{...base.settings,accents});assert.deepEqual(geometry(s),geometry(base));assert.deepEqual(original(s),original(base));assert.deepEqual(s,generateScene(s.seed,JSON.parse(JSON.stringify(s.settings))));assert.deepEqual(validateScene(s).errors,[]);}
  const plants=generateScene(base.seed,{...base.settings,accents:'plants'}),both=generateScene(base.seed,{...base.settings,accents:'both'}),shade=generateScene(base.seed,{...base.settings,accents:'shade'});
  assert.deepEqual(plants.blocks.map(b=>b.buildings.map(b=>b.plants)),both.blocks.map(b=>b.buildings.map(b=>b.plants)));
  assert.deepEqual(shade.blocks.map(b=>b.buildings.map(b=>b.shade)),both.blocks.map(b=>b.buildings.map(b=>b.shade)));
 }
});
test('2000 accent scenes have bounded shadows and supported sparse plants',()=>{
 let plants=0,shadows=0,sills=0,terraces=0;
 for(let i=0;i<200;i++)for(const {id}of SCENES)for(const facade of ['grid','terrace']){
  const s=generateScene('accent-audit-'+i,{scene:id,facade,groundFloor:i%2?'arcade':'awning',accents:'both'}),all=s.blocks.flatMap(b=>b.buildings);
  assert.deepEqual(validateScene(s).errors,[],`${i}/${id}`);assert.ok(all.reduce((n,b)=>n+b.plants.length,0)<=3);assert.ok(all.filter(b=>b.shade).length<=3);
  const svg=renderSVG(s);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<filter|<linearGradient|<image/);assert.ok(svg.length<180000);assert.ok((svg.match(/</g)||[]).length<2400);
  for(const b of all){for(const p of b.plants){assert.ok(p.row<b.rows-1&&p.col<b.cols);assert.ok(p.size<=5);assert.equal(p.placement,'inside');if(b.terrace){assert.equal(p.row,b.rows-2);terraces++;}else sills++;plants++;}if(b.shade){assert.equal(b.shade.direction,s.lightDirection);shadows++;}}
 }
 assert.ok(plants>1000&&shadows>1000&&sills>100&&terraces>100);
});
test('old0.2 settings keep accents absent and validator catches malformed anchors/shadows',()=>{
 assert.equal(normalizeSettings({version:'0.2'}).accents,'plain');assert.equal(normalizeSettings({}).accents,'auto');
 const s=generateScene('accent-bad',{scene:'closeup',facade:'terrace',accents:'both'}),b=s.blocks[0].buildings.find(b=>b.plants.length);b.plants[0].row=b.rows;
 assert.ok(validateScene(s).errors.some(e=>e.startsWith('plant-anchor:')));b.plants[0].row=b.rows-2;b.shade.points[0][0]=b.x-10;assert.ok(validateScene(s).errors.some(e=>e.startsWith('wall-shadow:')));
 const plain=generateScene('plain-accents',{scene:'closeup',accents:'plain'});assert.doesNotMatch(renderSVG(plain),/data-plant=|data-wall-shadow=/);
});
test('pots and foliage fit completely inside rectangular, arched and paired panes',()=>{
 let checked=0;
 for(const windows of WINDOWS)for(let i=0;i<40;i++){
  const s=generateScene('interior-'+i,{scene:i%2?'closeup':'square',windows,facade:i%3?'grid':'terrace',groundFloor:'awning',accents:'plants'}),svg=renderSVG(s);
  assert.doesNotMatch(svg,/data-plant="(?:sill|terrace)"/);
  for(const m of svg.matchAll(/<g data-interior-window="(rect|arch)" data-window-bounds="([^"]+)">([\s\S]*?<g data-plant="inside">.*?)<\/g>/g)){
   const [x,y,w,h]=m[2].split(',').map(Number),top=y+(m[1]==='arch'?w/2:0),body=m[3];
   for(const c of body.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g)){const [cx,cy,r]=c.slice(1).map(Number);assert.ok(cx-r>=x-.02&&cx+r<=x+w+.02);assert.ok(cy-r>=top-.02&&cy+r<=y+h+.02);}
   const points=body.match(/<polygon points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number));
   for(const [px,py]of points)assert.ok(px>=x&&px<=x+w&&py>=top&&py<=y+h-0.95);
   const plantEnd=svg.indexOf('</g>',m.index+svg.slice(m.index).indexOf('data-plant="inside"'));
   if(i%3){const after=svg.slice(plantEnd+4,svg.indexOf('</g>',plantEnd+4));assert.match(after,/^<rect /,'grid bars are drawn in front of indoor plant');}checked++;
  }
 }
 assert.ok(checked>200);
});
test('every cast shadow begins on a roof eave or actual awning underside',()=>{
 const sources=new Set();
 for(let i=0;i<100;i++){
  const s=generateScene('shadow-source-'+i,{scene:'closeup',accents:'shade',groundFloor:'awning'});
  for(const b of s.blocks[0].buildings)if(b.shade){const q=b.shade;sources.add(q.source);const top=q.source==='eave'?b.y+Math.max(3,b.width*.015):b.base-b.groundFloor.height+Math.min(20,b.width*.065)+4;assert.ok(Math.abs(q.points[0][1]-top)<.03);assert.ok(Math.abs(q.points[1][1]-top)<.03);assert.ok(q.points[2][1]-top<=14.03);}
  assert.deepEqual(validateScene(s).errors,[]);
 }
 assert.deepEqual([...sources].sort(),['awning','eave']);
 const s=generateScene('disconnected-shadow',{scene:'closeup',accents:'shade'}),b=s.blocks[0].buildings.find(b=>b.shade);b.shade.points[0][1]+=8;assert.ok(validateScene(s).errors.some(e=>e.startsWith('shadow-source:')));
});

test('corner fronts and sides share original plots without moving neighbors or ground',()=>{
 const plots=s=>s.blocks.map(block=>block.buildings.map(b=>({id:b.id,x:b.corner?.plotX??b.x,width:b.corner?.plotWidth??b.width,y:b.y,height:b.height,base:b.base,wall:b.wall,roof:b.roof,windowShape:b.windowShape})));
 const surroundings=s=>[s.blocks.map(b=>b.ground),s.surfaces,s.road,s.plaza,s.clouds,s.people,s.boats];
 for(const scene of ['closeup','street','square'])for(let i=0;i<80;i++)for(const corners of ['left','right']){
  const config={scene,facade:'terrace',groundFloor:'awning',accents:'both',sky:'clouds'},plain=generateScene('corner-audit-'+i,{...config,corners:'plain'}),s=generateScene(plain.seed,{...config,corners});
  assert.deepEqual(plots(s),plots(plain));assert.deepEqual(surroundings(s),surroundings(plain));assert.deepEqual(s,generateScene(s.seed,JSON.parse(JSON.stringify(s.settings))));assert.deepEqual(validateScene(s).errors,[]);
  const all=s.blocks.flatMap(b=>b.buildings),one=all.filter(b=>b.corner);assert.equal(one.length,1);
  const b=one[0],c=b.corner;assert.equal(c.side,corners);assert.ok(c.width>=c.plotWidth*.18-.01&&c.width<=c.plotWidth*.26+.01);assert.ok(c.wall!==b.wall);
  const svg=renderSVG(s),m=svg.match(/<g data-corner="(left|right)"><polygon points="([^"]+)"/);assert.ok(m);const points=m[2].split(' ').map(p=>p.split(',').map(Number));
  assert.equal(points.length,4);assert.equal(points[2][1],b.base);assert.equal(points[3][1],b.base);
  for(const[x,y]of points)assert.ok(x>=c.plotX-.03&&x<=c.plotX+c.plotWidth+.03&&y>=b.y&&y<=b.base);
  assert.equal((svg.match(/data-corner=/g)||[]).length,1);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<filter|<image/);
 }
});
test('all corner roof/window/side combinations render inside supported scene bounds',()=>{
 for(const scene of ['closeup','street','square'])for(const roofs of ROOFS)for(const windows of WINDOWS)for(const corners of ['left','right'])for(const density of ['open','normal','dense']){
  const s=generateScene('corner-styles',{scene,roofs,windows,corners,density,facade:'grid',groundFloor:'arcade',accents:'both'});assert.deepEqual(validateScene(s).errors,[]);const svg=renderSVG(s);assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.ok(svg.length<180000);assert.ok((svg.match(/</g)||[]).length<2400);
 }
 for(const scene of ['waterfront','hillside'])assert.ok(generateScene('no-corner',{scene,corners:'right'}).blocks.flatMap(b=>b.buildings).every(b=>!b.corner));
 assert.equal(normalizeSettings({version:'0.2'}).corners,'plain');assert.equal(normalizeSettings({}).corners,'auto');
 const bad=generateScene('bad-corner',{scene:'closeup',corners:'left'}),b=bad.blocks[0].buildings.find(b=>b.corner);b.corner.width+=20;assert.ok(validateScene(bad).errors.some(e=>e.startsWith('corner-footprint:')));
});
test('automatic corner can be fixed to its selected side without changing the city',()=>{
 let checked=0,plain=0;
 for(let i=0;i<80;i++){
  const s=generateScene('auto-corner-'+i,{scene:'closeup',corners:'auto'}),b=s.blocks.flatMap(b=>b.buildings).find(b=>b.corner);if(!b){plain++;continue;}
  const fixed=generateScene(s.seed,{...s.settings,corners:b.corner.side});assert.deepEqual(s.blocks,fixed.blocks);assert.deepEqual(s.clouds,fixed.clouds);checked++;
 }
 assert.ok(checked>20&&plain>5);
});

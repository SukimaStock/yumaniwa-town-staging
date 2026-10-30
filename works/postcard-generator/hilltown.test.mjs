import test from 'node:test';import assert from 'node:assert/strict';
import{generateScene,validateScene,PALETTES}from './engine.mjs';import{renderSVG}from './renderer.mjs';
test('900 hill towns keep three sloped supported rows and reserve a house-free stair corridor',()=>{
 const directions=new Set();
 for(let i=0;i<50;i++)for(const{ id:palette}of PALETTES)for(const density of['open','normal','dense']){
  const s=generateScene('hilltown-audit-'+i,{scene:'hilltown',palette,density,colorMode:['varied','tonal','grouped','accent'][i%4],roofs:['gable','hip','flat','shed','round'][i%5],windows:['rect','arch','paired'][i%3],facade:i%2?'grid':'terrace',groundFloor:i%2?'arcade':'awning',accents:'both'}),h=s.hilltown;
  assert.deepEqual(validateScene(s).errors,[],`${i}/${palette}/${density}`);assert.deepEqual(s,generateScene(s.seed,JSON.parse(JSON.stringify(s.settings))));directions.add(h.direction);
  assert.equal(s.blocks.length,3);assert.equal(s.blocks.flatMap(b=>b.buildings).length,{open:12,normal:15,dense:18}[density]);
  for(const block of s.blocks){
   assert.ok(block.buildings.every(b=>Math.abs(b.y+b.height-b.base)<.03));
   assert.ok(Math.max(...block.buildings.map(b=>b.base))-Math.min(...block.buildings.map(b=>b.base))>45);
   for(const b of block.buildings)assert.ok(b.x+b.width<=h.center-h.half+.03||b.x>=h.center+h.half-.03);
  }
  for(const[x]of h.route)assert.ok(x-h.stairWidth/2>h.center-h.half&&x+h.stairWidth/2<h.center+h.half);
  const tower=s.landmark,host=s.blocks[0].buildings.find(b=>b.id===tower.host);assert.ok(host);assert.equal(tower.base,host.base);assert.ok(tower.x>=host.x&&tower.x+tower.width<=host.x+host.width);
  const nearby=s.blocks.flatMap(b=>b.buildings).filter(b=>b.x<tower.x+tower.width+45&&b.x+b.width>tower.x-45);assert.ok(Math.min(...nearby.map(b=>b.y-b.roofHeight))-tower.y>=50);
  const svg=renderSVG(s);assert.match(svg,/data-hilltown-stairs="true"/);assert.match(svg,/data-landmark="tower"/);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<image|<filter/);
 }
 assert.deepEqual([...directions].sort(),[-1,1]);
});
test('hilltown validation rejects blocked stairs, malformed routes, missing layers and floating tower',()=>{
 const source=generateScene('hilltown-bad',{scene:'hilltown'});
 for(const mutate of[s=>s.blocks[1].buildings[0].width=500,s=>s.hilltown.route=[null],s=>s.hilltown.route[2][0]+=80,s=>s.landmark.base+=10,s=>s.landmark.host='missing',s=>s.hilltown.route.at(-1)[1]=950]){
  const s=structuredClone(source);mutate(s);assert.ok(validateScene(s).errors.some(e=>e.startsWith('hilltown-')));
 }
});
test('hill town is explicitly selected; old auto remains the original five scenes',()=>{
 const seen=new Set();for(let i=0;i<300;i++)seen.add(generateScene('auto-hilltown-'+i).mode);
 assert.deepEqual([...seen].sort(),['closeup','hillside','square','street','waterfront']);
});

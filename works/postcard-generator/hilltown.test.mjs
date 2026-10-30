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
  for(const f of h.flights){assert.ok(f.x>h.center-h.half&&f.x+f.width<h.center+h.half);assert.equal(f.width,48);assert.equal(f.spacing,12);}
  for(let j=0;j<2;j++){const f=h.flights[j],l=h.landings[j],next=h.flights[j+1];assert.ok(Math.abs(f.y+f.height-l.y)<.03);assert.equal(l.y+l.height,next.y);assert.ok(f.x>=l.x&&f.x+f.width<=l.x+l.width);assert.ok(next.x>=l.x&&next.x+next.width<=l.x+l.width);}
  assert.ok(h.entry.x<h.center-h.half);assert.equal(h.entry.y+h.entry.height,h.flights[0].y);
  const tower=s.landmark,host=s.blocks[0].buildings.find(b=>b.id===tower.host);assert.ok(host);assert.equal(tower.base,host.base);assert.ok(tower.x>=host.x&&tower.x+tower.width<=host.x+host.width);
  const nearby=s.blocks.flatMap(b=>b.buildings).filter(b=>b.x<tower.x+tower.width+45&&b.x+b.width>tower.x-45);assert.ok(Math.min(...nearby.map(b=>b.y-b.roofHeight))-tower.y>=50);
  const svg=renderSVG(s);assert.match(svg,/data-hilltown-stairs="true"/);assert.match(svg,/data-landmark="tower"/);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<image|<filter/);
 }
 assert.deepEqual([...directions].sort(),[-1,1]);
});
test('hilltown validation rejects blocked stairs, malformed routes, missing layers and floating tower',()=>{
 const source=generateScene('hilltown-bad',{scene:'hilltown'});
 for(const mutate of[s=>s.blocks[1].buildings[0].width=500,s=>s.hilltown.flights=[null],s=>s.hilltown.flights[2].x+=80,s=>s.hilltown.landings[0].y+=10,s=>s.hilltown.flights[0].spacing=5,s=>s.landmark.base+=10,s=>s.landmark.host='missing',s=>s.hilltown.flights.at(-1).height+=20]){
  const s=structuredClone(source);mutate(s);assert.ok(validateScene(s).errors.some(e=>e.startsWith('hilltown-')));
 }
});
test('hill town is explicitly selected; old auto remains the original five scenes',()=>{
 const seen=new Set();for(let i=0;i<300;i++)seen.add(generateScene('auto-hilltown-'+i).mode);
 assert.deepEqual([...seen].sort(),['closeup','hillside','square','street','waterfront']);
});
test('stairs draw blank flat landings between straight flights with equal-width equally-spaced treads',()=>{
 const s=generateScene('hilltown-001',{scene:'hilltown'}),svg=renderSVG(s),h=s.hilltown;
 const landingGroups=[...svg.matchAll(/<g data-hilltown-landing="true">(.*?)<\/g>/g)];assert.equal(landingGroups.length,2);
 for(const [,body]of landingGroups){assert.match(body,/<rect /);assert.doesNotMatch(body,/<path /);}
 const flightGroups=[...svg.matchAll(/<g data-hilltown-flight="true">(.*?)<\/g>/g)];assert.equal(flightGroups.length,3);
 for(const [i,[,body]]of flightGroups.entries()){
  const lines=[...body.matchAll(/<path d="M([\d.]+) ([\d.]+)h([\d.]+)"/g)].map(m=>m.slice(1).map(Number)),f=h.flights[i];assert.ok(lines.length>=2);
  for(const [x,y,width]of lines){assert.equal(x,f.x);assert.equal(width,f.width);assert.ok(y>f.y&&y<f.y+f.height);}
  for(let j=1;j<lines.length;j++)assert.ok(Math.abs(lines[j][1]-lines[j-1][1]-12)<.02);
 }
 assert.ok(svg.indexOf('data-hilltown-entry=')<svg.indexOf('data-building='));assert.ok(svg.lastIndexOf('data-building=')<svg.indexOf('data-hilltown-stairs='));
 const q=s.people[0],f=h.flights[2];assert.ok(q.x>=f.x&&q.x<=f.x+f.width);assert.ok(q.y+5*q.scale<f.y+f.height);
});

import test from 'node:test';import assert from 'node:assert/strict';
import{generateScene,validateScene,PALETTES}from './engine.mjs';import{renderSVG}from './renderer.mjs';
const xAt=(p,y)=>{for(let i=1;i<p.length;i++)if(y<=p[i][1])return p[i-1][0]+(p[i][0]-p[i-1][0])*(y-p[i-1][1])/(p[i][1]-p[i-1][1]);return p.at(-1)[0];};
test('1800 canal conditions keep continuous dry banks, supported bridge, people and boat inside their surfaces',()=>{
 for(let i=0;i<50;i++)for(const{ id:palette}of PALETTES)for(const density of['open','normal','dense'])for(const alleyDepth of['classic','staggered']){
  const s=generateScene('canal-audit-'+i,{scene:'canal',palette,density,alleyDepth,colorMode:['grouped','varied','tonal'][i%3],roofs:['gable','hip','flat','shed','round'][i%5],windows:['rect','arch','paired'][i%3],corners:['plain','left','right'][i%3],accents:'both',facade:i%2?'grid':'terrace',groundFloor:i%2?'arcade':'awning'}),c=s.canal;
  assert.deepEqual(validateScene(s).errors,[],`${i}/${palette}/${density}/${alleyDepth}`);assert.deepEqual(s,generateScene(s.seed,JSON.parse(JSON.stringify(s.settings))));
  for(let y=s.alley.farY;y<=1000;y+=4){assert.ok(xAt(c.leftPath,y)-xAt(c.bankLeft,y)>14);assert.ok(xAt(c.bankRight,y)-xAt(c.rightPath,y)>14);assert.ok(xAt(c.rightPath,y)-xAt(c.leftPath,y)>35);}
  assert.ok(xAt(c.rightPath,650)-xAt(c.leftPath,650)>280,'water remains broad through middle');assert.ok(Math.max(...s.blocks.flatMap(b=>b.buildings).map(b=>b.height))<=350,'bank houses stay smaller');assert.ok(s.blocks[0].buildings.every(b=>b.x+b.width<=c.bankLeft[0][0]+.03||b.x>=c.bankRight[0][0]-.03),'rear row leaves water open');
  assert.ok(s.people[1].x>=xAt(c.quayRight,s.people[1].y+10)+3);assert.equal(c.quayLeft.at(-1)[1],1000);assert.equal(c.quayRight.at(-1)[1],1000);
  const bridge=c.bridge;assert.ok(bridge.top>Math.max(...s.blocks[1].buildings.map(b=>b.base)));assert.ok(bridge.bottom<Math.min(...s.blocks[2].buildings.map(b=>b.base)));
  assert.ok(Math.abs(s.people[0].y+5*s.people[0].scale-bridge.top)<.03);
  assert.deepEqual(c.reflections,[]);
  const svg=renderSVG(s);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<image|<filter|data-canal-reflection/);assert.ok(svg.indexOf('data-canal=')<svg.indexOf('data-building='));assert.ok(svg.lastIndexOf('data-building=')<svg.indexOf('data-canal-bridge='));assert.match(svg,/fill-rule="evenodd"/);
 }
});
test('old reflection parameters do not change canal drawing, and canal remains explicit',()=>{
 for(let i=0;i<50;i++){const a=generateScene('canal-mode-'+i,{scene:'canal',reflection:'plain'});for(const reflection of['short','varied','matched']){const b=generateScene(a.seed,{...a.settings,reflection});assert.deepEqual(b.canal.reflections,[]);assert.equal(renderSVG(b).replace(/<metadata>.*?<\/metadata>/,''),renderSVG(a).replace(/<metadata>.*?<\/metadata>/,''));b.settings.reflection='plain';assert.deepEqual(b,a);}assert.notEqual(generateScene('canal-auto-'+i).mode,'canal');}
});
test('canal validation rejects broken banks, unsupported bridge, people in water, boats on land and malformed panels',()=>{
 const source=generateScene('canal-bad',{scene:'canal',alleyDepth:'staggered'});
 for(const mutate of[s=>delete s.canal,s=>s.canal.quayLeft[1][1]+=30,s=>s.canal.tail=null,s=>s.canal.leftPath=null,s=>s.canal.leftPath[1][0]=s.canal.rightPath[1][0],s=>s.canal.water.pop(),s=>s.canal.bridge.face[0][0]=400,s=>s.canal.bridge.opening[0]=null,s=>s.people[1].x=400,s=>s.boats[0].x=0,s=>s.waterlines[0].width=800,s=>s.canal.reflections=[null,null,null,null]]){const s=structuredClone(source);mutate(s);assert.ok(validateScene(s).errors.some(e=>e.startsWith('canal-')));}
});

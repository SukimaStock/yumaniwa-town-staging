import test from 'node:test';import assert from 'node:assert/strict';
import {generateScene,validateScene,normalizeSettings,SCENES}from './engine.mjs';import{renderSVG}from './renderer.mjs';
const xAt=(path,y)=>{for(let i=1;i<path.length;i++)if(y<=path[i][1]){const a=path[i-1],b=path[i];return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);}return path.at(-1)[0];};
const plot=b=>({x:b.corner?.plotX??b.x,width:b.corner?.plotWidth??b.width});
test('staggered alley keeps a continuous corridor attached to each foot and exposes both middle facades over 900 conditions',()=>{
 const retreats=new Set();
 for(let i=0;i<300;i++)for(const density of ['open','normal','dense']){
  const settings={scene:'alley',alleyDepth:'staggered',density,corners:['plain','left','right'][i%3],roofs:['gable','hip','flat','shed','round'][i%5],facade:i%2?'grid':'terrace',accents:'both',groundFloor:i%2?'arcade':'awning'},s=generateScene('alley-depth-'+i,settings),a=s.alley;
  assert.deepEqual(validateScene(s).errors,[],`${i}/${density}`);assert.deepEqual(s,generateScene(s.seed,s.settings));retreats.add(a.retreat);
  assert.equal(s.blocks.flatMap(b=>b.buildings).length,{open:7,normal:8,dense:9}[density]);
  for(const side of [0,1]){
   const path=side===0?a.leftPath:a.rightPath;
   for(const layer of [1,2]){const b=s.blocks[layer].buildings[side],p=plot(b);assert.ok(Math.abs(path[layer][0]-(side===0?p.x+p.width:p.x))<.04);assert.equal(path[layer][1],b.base);}
  }
  const ml=plot(s.blocks[1].buildings[0]),mr=plot(s.blocks[1].buildings[1]),nl=plot(s.blocks[2].buildings[0]),nr=plot(s.blocks[2].buildings[1]);
  assert.ok(ml.x+ml.width-nl.x-nl.width>=30);assert.ok(nr.x-mr.x>=30);
  assert.ok(Math.abs(a.feet[1][0]-a.feet[1][1])>=55);assert.ok(Math.abs(a.feet[0][0]-a.feet[0][1])>=24);
  for(let y=a.farY;y<=1000;y+=5)assert.ok(xAt(a.rightPath,y)-xAt(a.leftPath,y)>=90,'continuous open corridor');
  for(const q of s.people)assert.ok(q.x>xAt(a.leftPath,q.y)+10&&q.x<xAt(a.rightPath,q.y)-10);
  const svg=renderSVG(s),group=svg.match(/<g data-alley="true">(.*?)<\/g>/)[1],polygon=group.match(/points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number));assert.deepEqual(polygon,a.corridor);assert.equal((group.match(/<path /g)||[]).length,2);
  assert.ok(svg.indexOf('data-alley=')<svg.indexOf('data-building='));
 }
 assert.deepEqual([...retreats].sort(),[0,1]);
});
test('depth does not change other scenes, water reflections or legacy; old settings keep classic',()=>{
 assert.equal(normalizeSettings({}).alleyDepth,'staggered');assert.equal(normalizeSettings({version:'0.2'}).alleyDepth,'classic');
 for(const {id:scene}of SCENES.filter(s=>s.id!=='alley')){const a=generateScene('depth-protected',{scene,alleyDepth:'classic'}),b=generateScene('depth-protected',{scene,alleyDepth:'staggered'});delete a.settings.alleyDepth;delete b.settings.alleyDepth;assert.deepEqual(a,b);assert.equal(renderSVG(a),renderSVG(b));}
 const a=generateScene('legacy-depth',{version:'0.1'}),b=generateScene('legacy-depth',{version:'0.1',alleyDepth:'staggered'});assert.deepEqual(a,b);assert.equal(renderSVG(a),renderSVG(b));
});
test('staggered validation rejects detached feet, closed or corrupt paths, hidden middle walls and bad paving',()=>{
 const source=generateScene('bad-depth',{scene:'alley',alleyDepth:'staggered'});
 for(const mutate of [s=>s.alley.leftPath[1][1]+=12,s=>s.alley.leftPath[1][0]+=100,s=>s.alley.rightPath[1][0]=s.alley.leftPath[1][0]+10,s=>s.alley.corridor.pop(),s=>s.alley.leftPath[0][1]+=1,s=>s.alley.paving[0][0]+=20,s=>delete s.alley.feet,s=>delete s.alley.leftPath,s=>s.alley.paving=[[],[]],s=>s.alley.paving=[null,null],s=>s.alley.paving=[[0,NaN,0],[0,700,800]]]){const s=structuredClone(source);mutate(s);assert.ok(validateScene(s).errors.some(e=>e.startsWith('alley-')));}
});

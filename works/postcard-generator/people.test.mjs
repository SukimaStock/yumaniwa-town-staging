import test from'node:test';import assert from'node:assert/strict';import{generateScene,validateScene}from'./engine.mjs';import{renderSVG}from'./renderer.mjs';import{renderSVG as before}from'./review-people/before.mjs';import{cases}from'./review-people/cases.mjs';
const groups=svg=>[...svg.matchAll(/<g data-person="true"[^>]*>.*?<\/g>/gs)].map(x=>x[0]);
const numberList=x=>[...x.matchAll(/-?(?:\d*\.)?\d+/g)].map(x=>Number(x[0]));
test('people are the only SVG drawing change across180 scene/finish samples',()=>{
 for(const{seed,settings}of cases)for(const finish of['original','print','watercolor','print-material','watercolor-material']){const scene=generateScene(seed,{...settings,finish}),svg=renderSVG(scene);assert.deepEqual(validateScene(scene).errors,[]);assert.equal(svg.replace(/<g data-person="true"[^>]*>.*?<\/g>/gs,''),before({...scene,people:[]}));assert.equal(groups(svg).length,scene.people.length);assert.equal(svg,renderSVG(generateScene(seed,JSON.parse(JSON.stringify(scene.settings)))));}
});
test('actual SVG legs end at the existing foot anchors and silhouettes stay within old vertical bounds',()=>{
 for(let i=0;i<60;i++)for(const mode of['waterfront','closeup','street','square','hillside','alley','canal','hilltown']){const scene=generateScene('human-foot-'+i,{scene:mode,corners:'right',density:['open','normal','dense'][i%3]});for(const [j,g]of groups(renderSVG(scene)).entries()){
 const q=scene.people[j],u=q.scale||1;const transform=g.match(/transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)"/);assert.ok(transform);const[,x,y,k]=transform.map(Number);assert.ok(Math.abs(x-q.x)<=.006&&Math.abs(y-q.y)<=.006&&Math.abs(k-u)<=.006);assert.match(g,new RegExp('fill="'+q.color+'"'));assert.equal((g.match(/data-leg=/g)||[]).length,2);assert.match(g,/data-garment=/);assert.match(g,/data-arms=/);
 let ymax=-Infinity,ymin=Infinity;for(const m of g.matchAll(/<path[^>]*d="([^"]+)"[^>]*>/g)){const pts=numberList(m[1]);for(let z=1;z<pts.length;z+=2){const pad=m[0].includes('data-arms')?.525:0;ymax=Math.max(ymax,pts[z]+pad);ymin=Math.min(ymin,pts[z]-pad);}}
 const cy=Number(g.match(/cy="([^"]+)"/)[1]),r=Number(g.match(/ r="([^"]+)"/)[1]);ymin=Math.min(ymin,cy-r);assert.equal(ymax,5);assert.equal(ymin,-8);assert.ok(Math.abs(y+ymax*k-(q.y+5*u))<.04);if(q.placement==='bridge')assert.ok(Math.abs(y+ymax*k-scene.canal.bridge.top)<.04);
 }}
});
test('two poses are reproducible without changing population',()=>{const poses=new Set();for(const{seed,settings}of cases){const svg=renderSVG(generateScene(seed,settings));for(const m of svg.matchAll(/data-pose="([^"]+)"/g))poses.add(m[1]);}assert.deepEqual([...poses].sort(),['stand','step']);});
test('legacy0.1 people and full SVG stay exact',()=>{for(let i=0;i<36;i++){const scene=generateScene('patterns-'+String(i+1).padStart(3,'0'),{version:'0.1'});assert.equal(renderSVG(scene),before(scene));assert.doesNotMatch(renderSVG(scene),/data-person=/);}});

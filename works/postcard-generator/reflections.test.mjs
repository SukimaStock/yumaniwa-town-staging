import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateScene,normalizeSettings,validateScene,PALETTES,SCENES} from './engine.mjs';
import {renderSVG} from './renderer.mjs';
import {cases,modes} from './review-reflections/cases.mjs';
const drawing=svg=>svg.replace(/<metadata>.*?<\/metadata>/s,'');
const city=s=>{const c=structuredClone(s);delete c.reflections;delete c.settings.reflection;return c;};
test('reflections preserve the entire city, boats, ripples and repeat from exported settings',()=>{
 for(const {seed,settings} of cases){
  const plain=generateScene(seed,{...settings,reflection:'plain'});
  for(const [reflection] of modes){
   const s=generateScene(seed,{...settings,reflection});assert.deepEqual(city(s),city(plain));
   assert.deepEqual(s,generateScene(seed,JSON.parse(JSON.stringify(s.settings))));
   const withoutBands=renderSVG(s).replace(/<g data-water-reflection="[^"]*".*?<\/g>/g,'');
   assert.equal(drawing(withoutBands),drawing(renderSVG(plain)));
  }
 }
});
test('3240 combinations connect few bands to actual shore colors within water bounds',()=>{
 for(let i=0;i<60;i++)for(const {id:palette} of PALETTES)for(const density of ['open','normal','dense'])for(const reflection of ['plain','short','varied']){
  const s=generateScene('water-audit-'+i,{scene:'waterfront',palette,density,reflection,colorMode:['varied','tonal','accent'][i%3]});
  assert.deepEqual(validateScene(s).errors,[],`${i}/${palette}/${density}/${reflection}`);
  const svg=renderSVG(s);assert.doesNotMatch(svg,/NaN|Infinity|undefined|<image|<filter|<linearGradient/);
  if(reflection==='plain'){assert.equal(s.reflections,undefined);continue;}
  assert.ok(s.reflections.length>=1&&s.reflections.length<=7);
  assert.equal(new Set(s.reflections.map(q=>q.source)).size,s.reflections.length);
  const front=s.blocks.at(-1).buildings;
  for(const q of s.reflections){const source=front.find(b=>b.id===q.source);assert.ok(source);assert.equal(q.color,source.wall);assert.ok(q.x>=source.x&&q.x+q.width<=source.x+source.width+.03);assert.equal(q.y,Math.round((s.shoreY+37)*100)/100);assert.ok(q.y+q.height<=975.03);assert.ok(q.height<=(reflection==='short'?68:146));}
  const last=svg.lastIndexOf('data-water-reflection=');assert.ok(last<svg.indexOf('data-boat='));
  assert.match(svg.slice(last),/<\/g><path d="M[\d.]+ [\d.]+h/); // ripples follow the final band
 }
});
test('short and varied use the same sources and widths; only depth changes',()=>{
 for(const {seed,settings} of cases){const a=generateScene(seed,{...settings,reflection:'short'}).reflections,b=generateScene(seed,{...settings,reflection:'varied'}).reflections;
  assert.deepEqual(a.map(({height,...q})=>q),b.map(({height,...q})=>q));assert.ok(a.every((q,i)=>q.height<b[i].height));}
});
test('settings compatibility, non-waterfront and legacy never acquire bands',()=>{
 assert.equal(normalizeSettings({}).reflection,'varied');assert.equal(normalizeSettings({version:'0.2'}).reflection,'plain');
 for(const {id:scene} of SCENES.filter(s=>s.id!=='waterfront')){const a=generateScene('protected',{scene,reflection:'plain'}),b=generateScene('protected',{scene,reflection:'varied'});assert.equal(b.reflections,undefined);assert.equal(drawing(renderSVG(a)),drawing(renderSVG(b)));}
 const a=generateScene('protected',{version:'0.1'}),b=generateScene('protected',{version:'0.1',reflection:'varied'});assert.deepEqual(a,b);assert.equal(renderSVG(a),renderSVG(b));
 const app=fs.readFileSync(new URL('./app.mjs',import.meta.url),'utf8');assert.match(app,/query\.has\('seed'\)&&!query\.has\('reflection'\).*reflection='plain'/);
});
test('validator rejects floating bands, wrong colors, rear sources, duplicate and oversized bands',()=>{
 const source=generateScene('invalid-water',{scene:'waterfront',reflection:'varied'});
 for(const mutate of [s=>s.reflections[0].y+=3,s=>s.reflections[0].color='#000000',s=>s.reflections[0].source=s.blocks[0].buildings[0].id,s=>s.reflections[0].height=1000,s=>s.reflections[0].width=1000,s=>s.reflections.push({...s.reflections[0]}),s=>s.reflections[0].opacity=1]){
  const s=structuredClone(source);mutate(s);assert.ok(validateScene(s).errors.some(e=>e.startsWith('reflection-')));
 }
});

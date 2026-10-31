import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {generateScene,TABLE_PALETTES} from './engine.mjs';import {renderSVG} from './renderer.mjs';
test('pretzel and flower studies retain contacts, vessel relationships and attached stems in24settings',()=>{
 for(const study of ['pretzel-beer-01','flowers-01'])for(const palette of Object.keys(TABLE_PALETTES)){
  let first;
  for(const texture of ['original','print','watercolor']){
   const scene=generateScene({version:3,study,palette,texture}),by=id=>scene.objects.find(o=>o.id===id),ids=new Set(scene.objects.map(o=>o.id));
   assert.equal(ids.size,scene.objects.length);assert.deepEqual(scene,generateScene(JSON.parse(JSON.stringify(scene.settings))));
   assert.deepEqual(Object.keys(scene.settings),['version','study','palette','texture']);assert.ok(scene.objects.every((o,i,a)=>!i||a[i-1].z<=o.z));
   for(const o of scene.objects){for(const s of o.surfaces||[])assert.match(scene.colors[s.color],/^#[a-f0-9]{6}$/i);if(o.support&&o.support!=='table')assert.ok(ids.has(o.support));}
   if(study==='pretzel-beer-01'){
    assert.equal(by('drink-glass').kind,'beer-glass');assert.equal(by('removed-stopper').kind,'cap');const p=by('plate').inner,q=by('pretzel').contact;assert.ok(((q.x-p.x)/p.rx)**2+((q.y-p.y)/p.ry)**2<1);assert.ok(by('plate').z<by('pretzel').z);
    assert.equal(by('pretzel').holeCenters.length,3);const f=by('pretzel').frame;assert.ok(f.scaleY<f.scale);assert.ok(Math.abs(by('pretzel').contact.y-(532*f.scaleY+f.y))<1e-8);assert.ok(Math.abs(by('pretzel').contact.x-(447*f.scale+f.x))<1e-8);const svg=renderSVG(scene);assert.ok(svg.includes('fill-rule="evenodd" clip-rule="evenodd"'));assert.ok(!by('coffee-cup'));
   }else{
    assert.ok(!by('bottle')&&!by('removed-stopper'));const vase=by('vase');const stems=scene.objects.filter(o=>o.anchoredTo==='vase');assert.equal(stems.length,3);
    for(const s of stems){assert.ok(s.z<vase.z);assert.ok(s.root[0]>vase.mouth.left&&s.root[0]<vase.mouth.right&&s.root[1]>vase.mouth.top&&s.root[1]<vase.mouth.bottom);const b=by(s.bloom);assert.equal(b.attachedTo,s.id);assert.ok(s.tip[0]>b.bounds.left&&s.tip[0]<b.bounds.right&&s.tip[1]>b.bounds.top&&s.tip[1]<b.bounds.bottom);}
    assert.equal(by('coffee-cup').support,'saucer');assert.equal(by('empty-plate').support,'table');
   }
   if(first){assert.deepEqual(scene.objects,first.objects);assert.deepEqual(scene.colors,first.colors);}first=scene;
   const svg=renderSVG(scene),markup=svg.replace(/data:image\/png;base64,[^"]+/g,'');assert.ok(!/NaN|undefined|<text\b|<script\b|<foreignObject\b/.test(markup));assert.equal((svg.match(/data-object=/g)||[]).length,scene.objects.length);
   const refs=[...svg.matchAll(/(?:xlink:href|href)="([^"]+)"/g)].map(m=>m[1]),svgIDs=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(svgIDs).size,svgIDs.length);assert.ok(refs.every(r=>r.startsWith('data:image/png;base64,')||r.startsWith('#')&&svgIDs.includes(r.slice(1))));
  }
 }
});
test('all24 prior meal SVGs remain byte-identical to base31ef85d',()=>{
 const cases=JSON.parse(readFileSync(new URL('./fixtures/v3-meal-svg-sha256.json',import.meta.url),'utf8'));assert.equal(cases.length,24);for(const [settings,hash]of cases)assert.equal(createHash('sha256').update(renderSVG(generateScene(settings))).digest('hex'),hash);
});
test('sardine tin keeps fish inside oil and lid attached across all12settings',()=>{
 for(const palette of Object.keys(TABLE_PALETTES))for(const texture of ['original','print','watercolor']){
  const scene=generateScene({study:'sardines-beer-01',palette,texture}),by=id=>scene.objects.find(o=>o.id===id),tin=by('sardine-tin'),fish=scene.objects.filter(o=>o.support==='sardine-tin');assert.equal(fish.length,3);assert.equal(by('peeled-lid').attachedTo,tin.id);assert.ok(by('peeled-lid').z<tin.z);assert.equal(by('drink-glass').kind,'beer-glass');assert.ok(!by('pretzel'));
  for(const f of fish){assert.ok(f.bounds.left>=tin.inside.left&&f.bounds.right<=tin.inside.right&&f.bounds.top>=tin.inside.top&&f.bounds.bottom<=tin.inside.bottom);assert.ok(f.z>tin.z);}
  assert.deepEqual(generateScene(JSON.parse(JSON.stringify(scene.settings))),scene);assert.ok(!/undefined|NaN/.test(renderSVG(scene).replace(/data:image\/png;base64,[^"]+/g,'')));
 }
});

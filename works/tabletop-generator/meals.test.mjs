import test from 'node:test';import assert from 'node:assert/strict';
import {generateScene,normalizeSettings,TABLE_PALETTES} from './engine.mjs';import {renderSVG} from './renderer.mjs';
test('authored meal studies preserve food support, depth and coherent vessels in all24settings',()=>{
 for(const study of ['wine-cheese-01','bread-coffee-01'])for(const palette of Object.keys(TABLE_PALETTES)){
  let first;
  for(const texture of ['original','print','watercolor']){
   const scene=generateScene({version:3,study,palette,texture}),by=id=>scene.objects.find(o=>o.id===id),plate=by('plate');
   assert.deepEqual(scene,generateScene(JSON.parse(JSON.stringify(scene.settings))));assert.deepEqual(Object.keys(scene.settings),['version','study','palette','texture']);
   assert.ok(scene.objects.every((o,i,a)=>!i||a[i-1].z<=o.z));const ids=new Set(scene.objects.map(o=>o.id));assert.equal(ids.size,scene.objects.length);
   for(const o of scene.objects){if(o.support&&o.support!=='table'){assert.ok(ids.has(o.support));assert.ok(by(o.support).z<o.z);}if(o.support==='plate'){const p=plate.inner,q=o.contact;assert.ok(((q.x-p.x)/p.rx)**2+((q.y-p.y)/p.ry)**2<1,o.id+' contact inside plate');}for(const s of o.surfaces||[])assert.match(scene.colors[s.color],/^#[a-f0-9]{6}$/i);}
   if(study==='wine-cheese-01'){assert.equal(by('drink-glass').drink,'red-wine');assert.equal(by('removed-stopper').bottle,'bottle');assert.equal(by('cheese-slice').cutFrom,'cheese-wedge');assert.ok(!by('coffee-cup'));}
   else{assert.ok(!by('bottle')&&!by('removed-stopper'));assert.equal(by('torn-bread').tornFrom,'bread-loaf');const cup=by('coffee-cup'),[x,y]=cup.handle.join,[left,right,top,bottom]=cup.handle.body;assert.ok(x>left&&x<right&&y>top&&y<bottom);assert.equal(cup.support,'saucer');}
   if(first){assert.deepEqual(scene.objects,first.objects);assert.deepEqual(scene.colors,first.colors);}first=scene;
   const svg=renderSVG(scene);assert.ok(!/NaN|undefined|<text\b|<script\b|<foreignObject\b/.test(svg.replace(/data:image\/png;base64,[^"]+/g,'')));assert.equal((svg.match(/data-object=/g)||[]).length,scene.objects.length);const references=[...svg.matchAll(/(?:xlink:href|href)="([^"]+)"/g)].map(m=>m[1]);assert.ok(references.every(r=>r.startsWith('#')||r.startsWith('data:image/png;base64,')));
  }
 }
});
test('scene switching retains palette and texture but removes incompatible food choices',()=>{
 const fruit=normalizeSettings({version:3,drink:'beer',fruit:'pear',palette:'dusk',texture:'watercolor'}),meal=normalizeSettings({...fruit,study:'bread-coffee-01'});assert.deepEqual(meal,{version:3,study:'bread-coffee-01',palette:'dusk',texture:'watercolor'});assert.equal(normalizeSettings({...meal,study:'table-01'}).study,'table-01');assert.equal(normalizeSettings({...meal,study:'<script>'}).study,'table-01');
});
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
test('all108 existing version3 fruit SVGs remain byte-identical to pre-meal base',()=>{
 const cases=JSON.parse(readFileSync(new URL('./fixtures/v3-fruit-svg-sha256.json',import.meta.url),'utf8'));
 assert.equal(cases.length,108);for(const [settings,hash]of cases)assert.equal(createHash('sha256').update(renderSVG(generateScene(settings))).digest('hex'),hash);
});

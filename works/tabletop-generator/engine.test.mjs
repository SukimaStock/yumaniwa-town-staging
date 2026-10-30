import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {generateScene,normalizeSettings,PALETTES} from './engine.mjs';
import {renderSVG} from './renderer.mjs';
import {paperGrain,inkBreak} from './material-assets.mjs';
import {washLight,washDensity} from './watercolor-assets.mjs';
const seeds=Array.from({length:36},(_,i)=>`table-${String(i+1).padStart(2,'0')}`);
test('normalization limits untrusted input and selects supported settings',()=>{assert.equal(normalizeSettings({seed:' ',composition:'bad'}).seed,'table-01');assert.equal(normalizeSettings({seed:'x'.repeat(500)}).seed.length,80);assert.equal(normalizeSettings({density:'bad'}).density,'normal');});
test('36 seeds × all palettes, densities and views preserve hierarchy and geometry',()=>{
 for(const seed of seeds)for(const composition of ['top','side'])for(const density of ['few','normal','many'])for(const palette of Object.keys(PALETTES)){
  const a=generateScene({seed,composition,density,palette});
  assert.deepEqual(generateScene(JSON.parse(JSON.stringify(a.settings))),a);
  assert.deepEqual(generateScene({...a.settings,texture:'watercolor'}).objects,a.objects);
  assert.equal(new Set(a.objects.map(o=>o.id)).size,a.objects.length);
  for(const [z,o]of a.objects.entries()){
   assert.equal(o.z,z);
   for(const f of o.children||[]){assert.equal(f.parent,o.id);
    if(composition==='top'){
     const radius=Math.hypot((f.x-o.x)/o.rx,(f.y-o.y)/o.ry), envelope=f.size*1.25/Math.min(o.rx,o.ry);
     assert.ok(radius+envelope<=.81,`${seed}: ${o.id} fruit inside`);
     if(o.kind==='plate')for(const other of o.children){if(other===f)continue;assert.ok(Math.hypot(f.x-other.x,f.y-other.y)>1.25*(f.size+other.size),`${seed}: main fruit silhouettes separate`);}
    }else{assert.ok(Math.abs(f.x-o.x)+f.size*1.25<o.w/2);assert.ok(f.y<o.base-o.h+10);}
   }
   if(composition==='top'&&o.rx&&o.kind!=='cup'){
    const clipped=o.x-o.rx<0||o.x+o.rx>900||o.y-o.ry<0||o.y+o.ry>720;
    assert.equal(clipped,!!o.intentionalCrop);
   }
   if(composition==='side'&&o.base)assert.ok(o.base>sceneTable(a)&&o.base<720);
  }
 }
});
function sceneTable(a){return a.tableY;}
test('standalone SVG has deterministic safe metadata, unique IDs and embedded finishes',()=>{
 for(const composition of ['top','side'])for(const texture of ['original','print','watercolor']){
  const a=generateScene({seed:'<script>alert("x")</script>',composition,texture,density:'many'}),svg=renderSVG(a);
  assert.equal(renderSVG(a),svg);assert.ok(!/<script/.test(svg));assert.ok(!/NaN|undefined|Infinity/.test(svg.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g,'')));
  assert.ok(!/(?:href|xlink:href)="https?:/.test(svg));assert.ok(!/<filter|<animate/.test(svg));
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
  assert.equal(svg.includes('data:image/png;base64'),texture!=='original');
  const embedded=[...svg.matchAll(/xlink:href="data:image\/png;base64,/g)];assert.equal(embedded.length,texture==='original'?0:texture==='print'?2:3);
  for(const ref of svg.matchAll(/xlink:href="#([^"]+)"/g))assert.ok(ids.includes(ref[1]),'internal material use exists');
  assert.ok(svg.includes('fill-rule="evenodd"'),'cup has true hole, no false background patch');
 }
});
test('embedded assets match independent PNG files byte for byte',()=>{
 const pairs=[[paperGrain,'materials/paper-grain.png'],[inkBreak,'materials/ink-break.png'],[washLight,'watercolor/wash-light.png'],[washDensity,'watercolor/wash-density.png']];
 for(const [uri,file]of pairs){const bytes=Buffer.from(uri.split(',')[1],'base64');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),crypto.createHash('sha256').update(fs.readFileSync(new URL(`assets/${file}`,import.meta.url))).digest('hex'));}
});
test('views and seed variation produce multiple layouts without sharing texture RNG',()=>{const variants=new Set(seeds.map(seed=>{const s=generateScene({seed});return `${s.variant}-${s.mirror}`;}));assert.equal(variants.size,8);assert.notDeepEqual(generateScene({seed:'a'}).objects,generateScene({seed:'b'}).objects);});

test('material instances cover transformed cloth local bounds without a seam',()=>{
 for(const composition of ['top','side'])for(const texture of ['print','watercolor']){
  const scene=generateScene({composition,texture,density:'many'}),svg=renderSVG(scene);
  const image=svg.match(/<image id="material-[^"]+" x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/);
  const shift=svg.match(/<g clip-path="url\(#shape-\d+\)"><g transform="translate\(([\d.-]+) ([\d.-]+)\)">/);
  assert.ok(image&&shift,'cloth uses a centered material instance');
  const [x,y,w,h]=image.slice(1).map(Number),[tx,ty]=shift.slice(1).map(Number);
  for(const cloth of scene.objects.filter(o=>o.kind==='cloth')){assert.ok(x+tx<=-cloth.w/2);assert.ok(y+ty<=-cloth.h/2);assert.ok(x+tx+w>=cloth.w/2);assert.ok(y+ty+h>=cloth.h/2);}
 }
});

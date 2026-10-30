import test from 'node:test';import assert from 'node:assert/strict';
import {generateScene,normalizeSettings,TABLE_PALETTES,DRINKS,FRUITS} from './engine.mjs';
import {renderSVG} from './renderer.mjs';
test('36 authored settings keep support, hierarchy and drink relationships in all3finishes',()=>{
 for(const palette of Object.keys(TABLE_PALETTES))for(const drink of DRINKS)for(const fruit of FRUITS){
  let first;
  for(const texture of ['original','print','watercolor']){
   const scene=generateScene({version:3,palette,drink:drink.id,fruit:fruit.id,texture});const by=id=>scene.objects.find(o=>o.id===id),bowl=by('bowl-back');
   assert.equal(scene.objects.length,9);assert.equal(scene.objects.filter(o=>o.kind==='fruit').length,3);
   const ids=new Set(scene.objects.map(o=>o.id));assert.equal(ids.size,9);
   for(const o of scene.objects){if(o.parent)assert.ok(ids.has(o.parent));if(o.bottle)assert.ok(ids.has(o.bottle));}
   for(const id of ['fruit-in-left','fruit-in-right']){const f=by(id);assert.equal(f.variety,fruit.id);assert.deepEqual(f.frame,bowl.frame);assert.ok(bowl.z<f.z&&f.z<by('bowl-front').z);assert.ok(f.y+f.bounds.bottom>510);assert.ok(f.y+f.bounds.top<490);assert.ok(f.x+f.bounds.left>bowl.x-bowl.rx);assert.ok(f.x+f.bounds.right<bowl.x+bowl.rx);}
   const front=by('fruit-front');assert.ok(Math.abs(front.y+front.bounds.bottom-699)<1e-8);assert.ok(front.x+front.bounds.left>0&&front.x+front.bounds.right<900);
   const glass=by('drink-glass'),stopper=by('removed-stopper');assert.ok(by('bottle').opened);assert.equal(glass.drink,drink.id);
   assert.equal(glass.kind,drink.id==='beer'?'beer-glass':'glass');assert.equal(stopper.kind,drink.id==='beer'?'cap':'cork');
   assert.equal(glass.bottle,'bottle');assert.equal(stopper.bottle,'bottle');assert.ok(glass.top<glass.level&&glass.level<glass.base);
   assert.deepEqual(generateScene(JSON.parse(JSON.stringify(scene.settings))),scene);
   if(first){assert.deepEqual(scene.objects,first.objects);assert.deepEqual(scene.colors,first.colors);}first=scene;
   const svg=renderSVG(scene),text=svg.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g,'');assert.ok(!/NaN|undefined|<script/.test(text));assert.ok(svg.includes('clip-path="url(#drink-bowl)"'));
   const svgIds=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(svgIds.length,new Set(svgIds).size);
   for(const m of svg.matchAll(/xlink:href="([^"]+)"/g))assert.ok(m[1].startsWith('data:image/png;base64,')||svgIds.includes(m[1].slice(1)));
  }
 }
});
test('settings are bounded semantic choices; seed does not randomize an accepted composition',()=>{
 const fixed=generateScene();assert.deepEqual(generateScene({seed:'different',density:'many'}),fixed);
 assert.deepEqual(normalizeSettings({drink:'<script>',fruit:'x',palette:'x',texture:'x'}),{version:3,study:'table-01',drink:'white-wine',fruit:'lemon',palette:'cream',texture:'original'});
 assert.notEqual(generateScene({drink:'red-wine'}).colors.wine,fixed.colors.wine);
 assert.notEqual(generateScene({fruit:'pear'}).objects.find(o=>o.id==='fruit-front').outline,fixed.objects.find(o=>o.id==='fruit-front').outline);
});

import {createHash} from 'node:crypto';
const previousHashes={"lemon-01":{"original":"ebceaebef16e4aa728ce8fa294ac6d219901f4ac1c3d247c42c2895a9f0fd1c6","print":"0c06501f34be76433feba19353a9bbc7ed3d39c537b00e91906a647aa0fb19e2","watercolor":"a96c6b8a820e1f17e4d6120024b7ae0192bf064d0ec1440942788deb79ee7e1b"},"wine-lemon-01":{"original":"d332ae388540a43f6961764436007baf41ba71678c7b12de8fdf0fa828423628","print":"6a7481998292389828e4029c20a8c798ef025fbcf412d76fb2bce2e77483d076","watercolor":"8a47a5b381a146e6c057da441a3b7678e97444aedb4803c67a485ef004980847"},"wine-lemon-02":{"original":"884fa517ef22f1af58127b66e1ec4e211c463b3c63fcccfd4a0cf1889dd8f11a","print":"599237e0e703d438797620e5c75e3a329bcd3f3cf04611ec7888a9f5fe06e691","watercolor":"f05b9a88a8b45492a1182486da51319893bbecaf72361f798fbc27e9fd7bed16"}};
test('all nine prior version2 artworks replay byte for byte',()=>{
 for(const [study,finishes]of Object.entries(previousHashes))for(const [texture,hash]of Object.entries(finishes)){
  assert.equal(createHash('sha256').update(renderSVG(generateScene({version:2,study,texture}))).digest('hex'),hash);
 }
});

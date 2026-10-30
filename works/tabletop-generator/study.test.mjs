import test from 'node:test';
import assert from 'node:assert/strict';
import {generateScene,normalizeSettings} from './engine.mjs';
import {generateScene as oldScene} from './versions/0.1/engine.mjs';
import {renderSVG} from './renderer.mjs';
test('fixed study ignores random generation inputs and keeps exactly three lemons',()=>{
 const a=generateScene();assert.deepEqual(generateScene({seed:'changed',density:'many',composition:'top',palette:'rust'}),a);
 assert.equal(a.objects.filter(x=>x.kind==='lemon').length,3);
 const ids=new Set(a.objects.map(x=>x.id));for(const o of a.objects)if(o.parent)assert.ok(ids.has(o.parent));
 assert.equal(a.objects.filter(o=>o.kind==='lemon'&&o.parent).length,2);
 assert.equal(a.objects.filter(o=>o.kind==='bottle').length,1);
});
test('finish changes only settings and uses self-contained bounded material references',()=>{
 const a=generateScene();for(const texture of ['original','print','watercolor']){
  const b=generateScene({texture});assert.deepEqual(b.objects,a.objects);assert.deepEqual(b.colors,a.colors);
  const svg=renderSVG(b);assert.equal(renderSVG(generateScene(JSON.parse(JSON.stringify(b.settings)))),svg);
  assert.ok(!/NaN|undefined|<script/.test(svg.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g,'')));
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const m of svg.matchAll(/xlink:href="([^"]+)"/g))assert.ok(m[1].startsWith('data:image/png;base64,')||ids.includes(m[1].slice(1)));
 }
});
test('old shared URLs and JSON replay unchanged instead of becoming fixed study',()=>{
 const old={version:1,seed:'review-29',composition:'side',palette:'blue',density:'many',texture:'watercolor'};
 assert.deepEqual(generateScene(old),oldScene(old));
 assert.deepEqual(generateScene({...old,version:'1'}),oldScene(old));
 assert.deepEqual(generateScene({...old,version:undefined,v:'1'}),oldScene(old));
 assert.deepEqual(normalizeSettings({version:'2',study:'lemon-01',texture:'print'}),{version:2,study:'lemon-01',texture:'print'});
});

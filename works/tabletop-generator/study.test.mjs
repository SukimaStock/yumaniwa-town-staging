import {createHash} from 'node:crypto';
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
test('wine scene seats two lemons behind bowl front and connects a poured glass and removed cork',()=>{
 const s=generateScene(),byId=id=>s.objects.find(o=>o.id===id),back=byId('bowl-back'),front=byId('bowl-front');
 assert.equal(s.settings.study,'wine-lemon-01');assert.ok(byId('bottle').opened);
 for(const id of ['lemon-in-left','lemon-in-right']){const lemon=byId(id);assert.ok(back.z<lemon.z&&lemon.z<front.z);assert.ok(lemon.y>back.y);assert.ok(lemon.y+lemon.ry>510);assert.ok(lemon.y-lemon.ry<490);}
 const glass=byId('wine-glass'),cork=byId('removed-cork');assert.equal(glass.bottle,'bottle');assert.equal(cork.bottle,'bottle');assert.ok(glass.top<glass.level&&glass.level<458&&458<glass.base);assert.ok(glass.z<front.z);assert.ok(cork.y>byId('bottle').base);
 const svg=renderSVG(s);assert.ok(svg.includes('clip-path="url(#wine-bowl)"'));assert.ok(svg.indexOf('data-object="wine-glass"')<svg.indexOf('data-object="bowl-front"'));
});

test('previous named lemon study keeps all three exact SVGs',()=>{
 const expected={"original": "ebceaebef16e4aa728ce8fa294ac6d219901f4ac1c3d247c42c2895a9f0fd1c6", "print": "0c06501f34be76433feba19353a9bbc7ed3d39c537b00e91906a647aa0fb19e2", "watercolor": "a96c6b8a820e1f17e4d6120024b7ae0192bf064d0ec1440942788deb79ee7e1b"};
 for(const [texture,hash]of Object.entries(expected))assert.equal(createHash('sha256').update(renderSVG(generateScene({study:'lemon-01',texture}))).digest('hex'),hash);
});

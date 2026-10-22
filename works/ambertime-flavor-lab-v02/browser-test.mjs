// Focused DOM/controller regression; this does not certify browser layout or touch feel.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initial,fill,advance,bottle} from './model.mjs';
const KEY='sukimastock.ambertime.flavor-lab.v02';
let now=100,raf;
const els=new Map();
const element=id=>{if(!els.has(id))els.set(id,{innerHTML:'',textContent:'',style:{},disabled:false});return els.get(id)};
globalThis.document={getElementById:element,querySelectorAll(selector){
 const attr=selector==='[data-kind]'?'kind':'barrel';
 const html=[...els.values()].map(x=>x.innerHTML).join('');
 return [...html.matchAll(new RegExp('<button[^>]*data-'+attr+'="[^"]+"[^>]*>','g'))].map(([tag])=>{
  const dataset=Object.fromEntries([...tag.matchAll(/data-([a-z]+)="([^"]+)"/g)].map(x=>[x[1],x[2]]));
  return {dataset};
 });
}};
let stored;
globalThis.localStorage={getItem:k=>k===KEY?stored:null,setItem(k,v){assert.equal(k,KEY);stored=v},removeItem(){stored=null}};
globalThis.requestAnimationFrame=f=>(raf=f,1);globalThis.cancelAnimationFrame=()=>{};
globalThis.performance={now:()=>now};globalThis.confirm=()=>false;
const source=(await readFile(new URL('./app.mjs',import.meta.url),'utf8')).replace('"./model.mjs"',JSON.stringify(new URL('./model.mjs',import.meta.url).href));
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const click=id=>element(id).onclick();
click('tap-action');now+=1080;raf(now);click('tap-action');now+=2520;raf(now);click('tap-action');
assert.equal(element('fill').disabled,false);click('fill');
let s=JSON.parse(stored);assert.equal(s.barrels.length,1);assert.equal(s.barrels[0].choice.start,.12);assert.equal(s.barrels[0].choice.end,.40);
let html=element('detail').innerHTML;
assert.equal((html.split('<details>')[0].match(/role="progressbar"/g)||[]).length,3);
assert.equal((html.match(/role="progressbar"/g)||[]).length,11);
assert.ok(html.includes('原酒：果実の香り'));assert.ok(html.includes('刺激・口当たり'));assert.ok(html.includes('樽の影響'));
for(let i=0;i<5;i++)click('year');
html=element('detail').innerHTML;assert.ok(html.includes('穏やかな果実香'));assert.ok(html.includes('前：果実香が強い'));assert.ok(html.includes('4年11か月'));
click('month');assert.ok(element('detail').innerHTML.includes('前：果実香が強い'));
// Persistent comparison must survive reload, not just transient recentChanges.
await import('data:text/javascript;base64,'+Buffer.from(source+'\n// reload').toString('base64'));
assert.ok(element('detail').innerHTML.includes('前：果実香が強い'));
click('bottle');s=JSON.parse(stored);assert.equal(s.barrels.length,0);assert.equal(s.bottles.length,1);assert.equal(s.bottles[0].months,61);
// A new batch can be made after bottling; bottles do not age.
click('tap-action');now+=1800;raf(now);click('tap-action');now+=2700;raf(now);click('tap-action');click('fill');click('three');
assert.deepEqual(JSON.parse(stored).bottles,s.bottles);
console.log('PASS: actual app controller, two-tap fill, 3+8 bars, change comparison/reload, bottle, next batch, frozen bottle');

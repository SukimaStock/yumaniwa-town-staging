import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {computeViewport,noticeLayout,projectRect} from '../canvas-layout.mjs';

// Exercise the real native-card positioning with controlled DOM layout results.
// Browser tests separately verify the native font and Japanese wrapping itself.
const source=readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8').replace(/^import.*\n/gm,'').replace('export class CanvasScene','class CanvasScene');
const Scene=vm.runInNewContext(source+'\nCanvasScene;',{noticeLayout,projectRect,getComputedStyle:()=>({borderLeftWidth:'3'})});
function setup(width,height,{nativeHeight=140,scrollHeight=nativeHeight-6,motion='news',reduced=false}={}){
 const viewport=computeViewport({width,height,dpr:3}),s=Object.create(Scene.prototype),attrs=new Map();
 Object.assign(s,{viewport,reducedMotion:{matches:reduced},textMetrics:()=>({pixels:48,logical:20}),measure:text=>[...text].length*10});
 const el={textContent:'町の知らせ\n全国の飲食のつながりへ、『AmberTime・第3回』の口コミが届きました。',dataset:{motion},style:{},scrollTop:42,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 Object.defineProperties(el,{offsetHeight:{get:()=>Math.min(nativeHeight,parseFloat(el.style.maxHeight))},clientHeight:{get:()=>el.offsetHeight-6},scrollHeight:{get:()=>scrollHeight}});
 return {s,el,viewport,attrs};
}
test('native wrapping height wins over the shorter Canvas prediction at every phone size',()=>{
 for(const [w,h] of [[360,568],[375,620],[390,680],[430,740]]){
  const {s,el,viewport:v,attrs}=setup(w,h);const text=el.textContent;
  s.positionAutomaticNews(el);
  assert.equal(el.style.height,'auto');assert.equal(el.textContent,text);
  const top=parseFloat(el.style.top);assert(top>=v.offsetY+250*v.scale);
  assert(top+el.offsetHeight<=v.offsetY+514*v.scale+.01);
  assert.equal(JSON.parse(el.dataset.noticeLayout).nativeHeight,140);
  assert.equal(el.dataset.overflow,'false');assert.equal(el.scrollTop,0);assert(!attrs.has('tabindex'));
 }
});
test('exceptional long text remains scrollable and bounded above controls; new text starts at the beginning',()=>{
 const {s,el,viewport:v,attrs}=setup(360,568,{nativeHeight:1200,scrollHeight:1194});
 el.textContent+='長い商品名と地域名。'.repeat(80);const text=el.textContent;
 const close={hidden:true,style:{}};s.positionAutomaticNews(el,close);
 assert.equal(close.hidden,false);assert(parseFloat(close.style.top)>=0);
 assert.equal(el.textContent,text);assert.equal(el.dataset.overflow,'true');assert.equal(el.tabIndex,0);assert.match(attrs.get('aria-label'),/スクロール/);
 assert(Math.abs(parseFloat(el.style.top)-(v.offsetY+250*v.scale))<.01);
 assert(parseFloat(el.style.top)+el.offsetHeight<=v.offsetY+514*v.scale+.01);
 el.style.transform='translateX(1000px)';s.positionAutomaticNews(el);
 assert(Math.abs(parseFloat(el.style.top)-(v.offsetY+250*v.scale))<.01,'animation transform must not alter measured height');
 el.scrollTop=200;el.textContent='新しい知らせ';s.positionAutomaticNews(el);assert.equal(el.scrollTop,0,'new messages start at their beginning');
});
test('ambient downward travel stays above management controls; reduced motion needs no travel reservation',()=>{
 for(const reduced of [false,true]){
  const {s,el,viewport:v}=setup(390,680,{nativeHeight:300,motion:'ambient',reduced});s.positionAutomaticNews(el);
  assert(parseFloat(el.style.top)+el.offsetHeight+(reduced?0:25)<=v.offsetY+514*v.scale+.01);
 }
});
test('overflow alone permits scrolling and native cards no longer hide overflowing text',()=>{
 const css=readFileSync(new URL('../room-scene.css',import.meta.url),'utf8');
 assert.match(css,/\.automatic-news\{display:block;text-align:left/);
 assert.match(css,/overflow:auto;overscroll-behavior:contain/);
 assert.match(css,/#automatic-news\[data-overflow="true"\]\{pointer-events:auto;cursor:auto;touch-action:pan-y\}/);
});

test('long world notices retain reading time and do not create duplicate queue entries',async()=>{
 const {scopedNotices}=await import('../event-notices.mjs');let duration=0,shown=0;
 const lane=scopedNotices({room:()=> 'sales',safe:()=>true,show:()=>shown++,hide:()=>{},setTimer:(_fn,ms)=>{duration=ms;return 1;},clearTimer:()=>{}});
 const message={id:'town:long-reading',kind:'message',text:'全国の飲食のつながりへ、長い名前の酒の口コミが届きました。'.repeat(12)};
 lane.push([message]);assert(duration>=message.text.length*90);assert(duration>10000);
 lane.push([message]);assert.equal(shown,1);assert.equal(lane.inspect().pending.length,0);lane.reset();
});

test('leaving an exceptionally long notice advances the existing lane once without replay',async()=>{
 const {scopedNotices}=await import('../event-notices.mjs'),shown=[];
 const lane=scopedNotices({room:()=> 'sales',safe:()=>true,show:(_text,entries)=>shown.push(entries[0].text),hide:()=>{},setTimer:()=>1,clearTimer:()=>{}});
 const first={id:'town:first',kind:'message',text:'長い知らせ。'.repeat(80)},next={id:'town:next',kind:'message',text:'次の知らせ。'};
 lane.push([first]);lane.push([next]);lane.clear();lane.push([first,next]);
 assert.deepEqual(shown,[first.text,next.text]);assert.equal(lane.inspect().pending.length,0);lane.reset();
 const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');assert.match(app,/\$\('automatic-news-close'\)\.addEventListener\('click',\(\)=>automaticNews\.clear\(\)\)/);
});

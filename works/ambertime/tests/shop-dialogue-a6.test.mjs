import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dialogueNoticeLayout,computeViewport,projectRect,NOTICE_WINDOW} from '../canvas-layout.mjs';
import {createDialogueNotice,installDialogueDismissal} from '../shop-dialogue-view.mjs';
const texts=['うちのお客さん、ハイボール好きが多いんですよ。','何年か前のあれ、今でも好きだって人がいるんですよ。'];
for(const [width,height] of [[360,568],[375,620],[390,680],[430,740],[1280,800]])for(const image of [false,true])test(`logical dialogue geometry ${width}x${height}, memory=${image}`,()=>{
 const n=dialogueNoticeLayout(texts[+image],s=>[...s].length*20,{image});assert(n);assert.equal(n.lines.join(''),texts[+image]);assert.equal(n.padding,NOTICE_WINDOW.padding);assert(n.y>=99);assert(n.y+n.h<=514);assert.equal(n.w,336);
 const v=computeViewport({width,height},1),r=projectRect(v,n);assert(r.x>=0&&r.y>=0);assert(r.x+r.width<=width+.01&&r.y+r.height<=height+.01);
});
test('important rectangles shift or defer rather than cover; all text retained',()=>{
 const obstacle={x:12,y:400,w:336,h:114},n=dialogueNoticeLayout(texts[0],s=>s.length*20,{obstacles:[obstacle]});assert(n&&n.y+n.h+3<=400);
 assert.equal(dialogueNoticeLayout(texts[0],s=>s.length*20,{obstacles:[{x:0,y:99,w:360,h:415}]}),null);
});
test('dismiss invalidates captured timer and same-month replay, newest replaces oldest',()=>{
 let id=0;const jobs=new Map(),shown=[];let hidden=0;const n=createDialogueNotice({safe:()=>true,show:e=>shown.push(e.month),hide:()=>hidden++,setTimer:f=>{jobs.set(++id,f);return id},clearTimer:i=>jobs.delete(i)});
 const commit=m=>n.commit({core:{month:m-1}},{core:{month:m}},{month:m,text:'x'});
 commit(12);jobs.get(id)();const stale=jobs.get(id);n.dismiss();stale();assert.equal(hidden,1);commit(12);assert.deepEqual(shown,[12]);commit(24);jobs.get(id)();commit(36);jobs.get(id)();assert.deepEqual(shown,[12,24,36]);assert.equal(hidden,2);
});
test('pointer is captured; click and keyboard are consumed before dismiss',()=>{
 const handlers={},calls=[];const el={addEventListener:(t,f)=>handlers[t]=f,setPointerCapture:id=>calls.push(['capture',id])};installDialogueDismissal(el,()=>calls.push('dismiss'));
 const e={pointerId:7,stopPropagation:()=>calls.push('stop'),preventDefault:()=>calls.push('prevent')};handlers.pointerdown(e);assert.deepEqual(calls,['stop',['capture',7]]);handlers.pointerup(e);assert(!calls.includes('dismiss'));handlers.click(e);assert.deepEqual(calls.slice(-3),['prevent','stop','dismiss']);
 for(const key of ['Enter',' ','Escape']){handlers.keydown({...e,key});assert.deepEqual(calls.slice(-3),['prevent','stop','dismiss']);}const len=calls.length;handlers.keydown({...e,key:'Tab'});assert.equal(calls.length,len);
});
test('cache URLs, accessible content, no bottom card styling, shared palette',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),app=read('shop-app.mjs'),html=read('index.html'),css=read('shop-dialogue.css');
 assert.match(html,/shop-app\.mjs\?dialogue=a6-1/);assert.match(html,/room-scene\.css\?a6=1/);assert.match(app,/canvas-scene\.mjs\?a6=1/);assert.match(app,/setAttribute\('aria-label',`町の酒店。\$\{entry.text\} 閉じる`\)/);assert.doesNotMatch(css,/(?:^|[;{])bottom:|#242b26|#77715c|pointer-events:none/);assert.match(read('canvas-scene.mjs'),/dialogueNoticeLayout\(entry.text/);assert.match(app,/new MutationObserver\(\(\)=>dialogueNotice.update\(\)\)/);
});

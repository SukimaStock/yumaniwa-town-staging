import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackScenes} from '../recall/live-scene.mjs';
import {createRecallDebugPreview,RECALL_DEBUG_SCENES} from '../recall/debug-scene.mjs';

class Element{
 constructor(name='div'){this.name=name;this.attrs={};this.dataset={};this.events={};this.children=[];this.open=false;this.disabled=false;this.classList={add(){},remove(){}};this.offsetWidth=200;this.textContent='';}
 setAttribute(name,value){this.attrs[name]=value;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 addEventListener(type,listener){(this.events[type]??=[]).push(listener);}
 emit(type,event={}){for(const listener of this.events[type]??[])listener(event);}
 contains(){return true;}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.emit('close');}
 querySelector(key){return (this.matches??={})[key]??=new Element(key);}
 getContext(){return {clearRect(){},fillRect(){},set fillStyle(_){} };}
}
function harness(){
 const document={head:new Element(),body:new Element(),activeElement:new Element('button'),hidden:false,
  createElement:tag=>new Element(tag),addEventListener(){}};
 let nextId=0;const jobs=new Map();
 const window={matchMedia:()=>({matches:false}),setTimeout:fn=>{const id=++nextId;jobs.set(id,fn);return id;},clearTimeout:id=>jobs.delete(id)};
 const player=createRecallDebugPreview({document,window}),dialog=document.body.children[0];
 const action=name=>{const target=dialog.querySelector(name==='next-control'?'.at-recall-controls [data-recall-action="next"]':`[data-recall-action="${name}"]`);target.dataset.recallAction=name==='next-control'?'next':name;dialog.emit('click',{target:{closest:()=>target}});};
 const tick=()=>{const [id,fn]=jobs.entries().next().value??[];assert.ok(fn);jobs.delete(id);fn();};
 return {document,player,dialog,action,tick,jobs};
}
const edition={scenes:[
 {month:345,sentence:'客の反応があった。',event:{kind:'reaction'}},
 {month:346,sentence:'遠くの店へ届いた。',event:{kind:'delivery'}},
 {month:348,sentence:'訪れた。',event:{kind:'visit'}}
]};
test('real selected scenes preserve frozen sentences and map their artwork',()=>{
 const view=playbackScenes(edition);
 assert.deepEqual(view.map(x=>x.scene),['counter','shop','visitor']);
 assert.deepEqual(view.map(x=>x.sentence),edition.scenes.map(x=>x.sentence));
 assert.ok(view[0].date.includes('年'));
 assert.deepEqual(playbackScenes({scenes:[]}),[]);
 assert.throws(()=>playbackScenes({scenes:[{month:-1,sentence:'',event:{kind:'visit'}}]}));
});
test('live handover executes only after explicitly advancing final scene',()=>{
 const h=harness();let commits=0;
 h.player.open({scenes:playbackScenes(edition),mode:'handover',title:'初代の回想',onComplete:()=>{commits++;return true;}});
 assert.equal(h.dialog.querySelector('#at-recall-title').textContent,'初代の回想');
 h.tick();h.tick();assert.equal(h.jobs.size,0);
 assert.equal(commits,0);assert.equal(h.dialog.open,true);
 assert.equal(h.dialog.querySelector('.at-recall-controls [data-recall-action="next"]').textContent,'次の代へ');
 h.action('previous');assert.equal(commits,0);
 h.action('next');assert.equal(commits,0);
 h.action('next');assert.equal(commits,1);assert.equal(h.dialog.open,false);
 h.player.open({scenes:playbackScenes(edition),mode:'handover',onComplete:()=>{commits++;return true;}});
 h.action('close');assert.equal(commits,1);
});
test('historical recall never calls a handover, even at the final scene',()=>{
 const h=harness();let commits=0;
 h.player.open({scenes:playbackScenes(edition),mode:'history',title:'初代の回想',onComplete:()=>commits++});
 h.action('next');h.action('next');assert.equal(h.jobs.size,0);
 assert.equal(h.dialog.querySelector('.at-recall-controls [data-recall-action="next"]').textContent,'閉じる');
 h.action('next');assert.equal(commits,0);assert.equal(h.dialog.open,false);
});
test('existing debug playback remains its own fixed sample',()=>{
 const h=harness();h.player.open();
 assert.equal(h.dialog.querySelector('[data-recall-counter]').textContent,'1 / '+RECALL_DEBUG_SCENES.length);
 assert.equal(h.dialog.querySelector('.at-recall-kicker').textContent,'デバッグ用サンプル');
 h.player.close();
});

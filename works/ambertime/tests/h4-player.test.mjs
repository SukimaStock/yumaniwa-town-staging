import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecallPlayer} from '../recall/player.mjs';

function harness(){
 const nodes=new Map(),listeners=new Map();
 const origin={focusCount:0,focus(){this.focusCount++;}};
 const element=()=>({style:{},dataset:{},disabled:false,textContent:'',clientWidth:360,focus(){this.focusCount=(this.focusCount||0)+1;},setAttribute(){},append(){},closest(){return this;}});
 const dialog={...element(),open:false,contains:n=>[...nodes.values()].includes(n),querySelector(selector){if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);},addEventListener(type,fn){listeners.set(type,fn);},showModal(){this.open=true;},close(){this.open=false;listeners.get('close')?.({});}};
 dialog.querySelector('canvas').getContext=()=>({fillRect(){},clearRect(){}});
 const document={activeElement:origin,head:{append(){}},body:{append(){}},createElement:type=>type==='dialog'?dialog:element()};
 const window={innerWidth:360,innerHeight:640,devicePixelRatio:2,addEventListener(){},setTimeout(){throw Error('timer prohibited');},setInterval(){throw Error('timer prohibited');},requestAnimationFrame(){throw Error('animation prohibited');}};
 const player=createRecallPlayer({document,window});
 const click=action=>{const selector=action==='picture'?'.at-recall-picture':`[data-recall-action="${action}"]`;const target=dialog.querySelector(selector);target.dataset.recallAction=action;return listeners.get('click')({target});};
 const key=(key,modifiers={})=>listeners.get('keydown')({key,preventDefault(){},...modifiers});
 return {player,dialog,window,origin,nodes,click,key,cancel:()=>listeners.get('cancel')({preventDefault(){}}),text:selector=>dialog.querySelector(selector).textContent};
}
const sample=()=>[{date:'1年目 秋',sentence:'遠い町から、酒の便りが届いた。',scene:'distant',art:'street'},{date:'8年目 春',sentence:'同じ店で、あの年の一本に再び出会った。',scene:'shop',art:'shop'}];

test('manual navigation preserves exact sentences and returns focus on completion',async()=>{
 const h=harness(),values=sample();h.player.open({scenes:values,mode:'history'});
 assert.equal(h.text('[data-recall-sentence]'),values[0].sentence);
 assert.equal(h.text('[data-recall-counter]'),'1 / 2');
 await h.key('ArrowRight',{ctrlKey:true});assert.equal(h.text('[data-recall-counter]'),'1 / 2');
 await h.click('picture');assert.equal(h.text('[data-recall-sentence]'),values[1].sentence);
 assert.equal(h.text('[data-recall-action="next"]'),'閉じる');
 await h.click('picture');assert.equal(h.player.isOpen(),true);
 await h.key('ArrowLeft');assert.equal(h.text('[data-recall-counter]'),'1 / 2');
 await h.key('ArrowLeft');assert.equal(h.text('[data-recall-counter]'),'1 / 2');
 await h.key('ArrowRight');await h.click('next');assert.equal(h.player.isOpen(),false);assert.equal(h.origin.focusCount,1);
 await h.click('next');assert.equal(h.origin.focusCount,1);
});

test('handover completes exactly once only after explicit final action; cancellation is harmless',async()=>{
 const h=harness();let calls=0;const options={scenes:sample(),mode:'handover',onComplete:()=>calls++};
 h.player.open(options);await h.click('next');assert.equal(calls,0);assert.equal(h.text('[data-recall-action="next"]'),'次の代へ');
 h.cancel();assert.equal(calls,0);assert.equal(h.player.isOpen(),false);
 h.player.open(options);await h.click('close');assert.equal(calls,0);
 h.player.open(options);await h.key('ArrowRight');await h.key('ArrowRight');await h.click('next');assert.equal(calls,1);
 h.player.open({...options,mode:'history'});await h.click('next');await h.click('next');assert.equal(calls,1);
});

for(const outcome of ['false','throw'])test(`failed handover (${outcome}) closes and permits retry through the underlying UI`,async()=>{
 const h=harness();let calls=0;
 const onComplete=()=>{calls++;if(outcome==='throw')throw Error('retry');return false;};
 h.player.open({scenes:sample().slice(0,1),mode:'handover',onComplete});
 await h.click('next'); // Async failure is handled by the runtime and returns to its recovery UI.
 assert.equal(h.player.isOpen(),false);assert.equal(calls,1);assert.equal(h.origin.focusCount,1);
 await h.click('next');assert.equal(calls,1);
 h.player.open({scenes:sample(),mode:'history'});assert.equal(h.text('[data-recall-counter]'),'1 / 2');h.player.close();
});

test('input is validated before opening and copied without changing fixed data',async()=>{
 const h=harness();
 for(const scenes of [[],null,{},[{date:1,sentence:'text',scene:'shop'}],[{date:'date',sentence:null,scene:'shop'}]]){
  if(scenes===null)continue; // null uses constructor samples, as in the previous API.
  assert.throws(()=>h.player.open({scenes}));assert.equal(h.player.isOpen(),false);
 }
 assert.throws(()=>h.player.open({scenes:sample(),mode:'unknown'}));
 assert.throws(()=>h.player.open({scenes:sample(),mode:'handover'}));
 const values=sample(),original=values[0].sentence;h.player.open({scenes:values,title:'<img onerror=oops>'});values[0].sentence='changed outside';
 await h.click('next');await h.click('previous');assert.equal(h.text('[data-recall-sentence]'),original);assert.equal(h.text('#at-recall-title'),'<img onerror=oops>');
 h.player.open({scenes:sample().slice(0,1)});assert.equal(h.text('[data-recall-counter]'),'1 / 2');
 h.player.close();const frozen=Object.freeze(sample().map(Object.freeze));h.player.open({scenes:frozen});await h.click('next');assert.equal(frozen[0].sentence,original);
});

test('default debug samples remain usable without timers; small screens retain readable text and integer art',async()=>{
 const h=harness();h.window.innerWidth=320;h.window.innerHeight=480;h.player.open();
 assert.equal(h.text('[data-recall-counter]'),'1 / 6');assert.ok(parseFloat(h.dialog.style.fontSize)>=16);
 assert.equal(parseInt(h.nodes.get('canvas').style.width)%120,0);
 for(let i=0;i<6;i++)await h.click('next');assert.equal(h.player.isOpen(),false);
 const sentence='長い回想の文章。'.repeat(80);h.player.open({scenes:[{date:'100年目',sentence,scene:'shop'}]});assert.equal(h.text('[data-recall-sentence]'),sentence);
 h.dialog.close();assert.equal(h.origin.focusCount,2);
});

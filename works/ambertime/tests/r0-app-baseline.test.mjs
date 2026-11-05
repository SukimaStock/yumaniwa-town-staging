import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeCandidate} from '../placement-save.mjs';
const BASE='8fab526aec22a83b73147225c99e88e48188586e';
const read=(file,base=false)=>base?execFileSync('git',['show',BASE+':works/ambertime/'+file],{encoding:'utf8',maxBuffer:4e6}):fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function extract(source,name){
 const start=source.indexOf('function '+name+'(');assert(start>=0,name);let depth=0,quote=null,escape=false,line=false,block=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){const c=source[i],next=source[i+1];if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}if(c==="'"||c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);}throw Error(name);
}
function canvasTrace(source){let time=100,clears=0;const calls=[],attrs={},node={setAttribute:(k,v)=>{attrs[k]=v;}};
 const document={hidden:false,getElementById:()=>node},context={document,performance:{now:()=>time}};vm.createContext(context);vm.runInContext(source.replace(/^import[^\n]*\n/gm,'').replace('export class CanvasScene','globalThis.Scene=class CanvasScene'),context);
 const scene=Object.create(context.Scene.prototype),worldCtx=new Proxy({},{get:(obj,key)=>key==='clearRect'?()=>clears++:(...args)=>calls.push([key,...args]),set:(obj,key,value)=>{calls.push(['set',key,value]);return true;}});
 Object.assign(scene,{worldCtx,root:{dataset:{}},view:{room:'warehouse',casks:[{id:1,selected:true}],products:[],timeStatus:'停止'},layout:{floorY:300,shelf:{x:30,y:60,w:300,h:120,rails:[90,150]},caskSlots:[],productSlots:[]},reducedMotion:{matches:false},arrival:{room:null,ids:[],staticIds:[]},fontSettled:true,suspended:false,frame:0,drawTimeBar(){calls.push(['timebar']);}});
 const out=[],sample=label=>out.push({label,clears,paint:createHash('sha256').update(JSON.stringify(calls)).digest('hex'),attrs:{...attrs},progress:scene.view.monthProgress??null});
 scene.drawWorld();sample('initial-warehouse');scene.drawWorld();sample('same-cache');time=1000;scene.drawWorld();sample('warehouse-no-blink');scene.view.room='sales';scene.view.products=[{id:1,selected:true}];scene.drawWorld();sample('sales-selection');time=1900;scene.drawWorld();sample('sales-blink');scene.view.products[0].selected=false;scene.drawWorld();sample('selection-cleared');scene.drawWorld();sample('same-cleared-cache');scene.reducedMotion.matches=true;scene.drawWorld();sample('reduced-motion');scene.layout.floorY=315;scene.drawWorld();sample('layout-change');scene.arrival={room:'sales',ids:[],staticIds:[1]};scene.drawWorld();sample('arrival-change');
 for(const [label,state] of [['visible',{}],['hidden',{hidden:true}],['suspended',{suspended:true}],['queued-frame',{frame:1}],['font-pending',{fontSettled:false}]]){document.hidden=false;Object.assign(scene,{suspended:false,frame:0,fontSettled:true});if('hidden'in state)document.hidden=state.hidden;else Object.assign(scene,state);scene.updateProgress(.25);sample(label);}
 return {out,clears};
}
test('Canvas cache invalidation and progress accessibility/hidden/frame behavior match R0 baseline, not source text',()=>{
 const current=canvasTrace(read('canvas-scene.mjs')),base=canvasTrace(read('canvas-scene.mjs',true));assert.deepEqual(current,base);
 const rows=current.out,at=label=>rows.find(r=>r.label===label);assert.equal(at('same-cache').clears,at('initial-warehouse').clears);assert.equal(at('warehouse-no-blink').clears,at('same-cache').clears);assert(at('sales-blink').clears>at('sales-selection').clears);assert.equal(at('same-cleared-cache').clears,at('selection-cleared').clears);assert.equal(at('hidden').paint,at('visible').paint);assert.equal(at('visible').attrs['aria-valuenow'],'25');assert.equal(at('font-pending').progress,.25);
});
function appHost(source,mode='ok',storeMode=true){const log=[],nodes=new Map();let queued=null,stored=null;
 const initial={core:{month:1,cash:100},operations:[],still:{phase:'ready',distillation:null},usual:{reservation:null},tastingId:null,decisions:[],trade:{offer:null}},envelope=s=>JSON.stringify({version:2,game:s,userPaused:false,elapsed:0});stored=envelope(initial);
 const localStorage={getItem:()=>mode==='conflict'?'other-tab':stored,setItem:(k,v)=>{log.push('write');if(mode==='quota')throw Error('quota');if(mode==='refuse')return;stored=v;}};
 const document={hidden:false},D={serializeDistillery:JSON.stringify,storeMarketMode:()=>storeMode,canBeginUsual:()=>({ok:false}),tickDistillery(s){log.push('tick');return {...s,core:{...s.core,month:s.core.month+1,cash:s.core.cash+2},operations:[...s.operations,{key:'month'}]};}};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true});return nodes.get(id);};
 const context={D,localStorage,document,$:node,vaultPanels(){},writeCandidate,serializeSession:(game,ui,{serialize})=>JSON.stringify({version:3,game:JSON.parse(serialize(game)),...ui}),automaticEvents:()=>['event'],soldOutLabel:()=>'',caskName:()=>'',performance:{now:()=>100},T:{monthMs:6000,distillStepMs:100},wallClock:{delay:()=>100},countdown:{cancel(){log.push('cancel');}},automaticNews:{push(){log.push('news');}},marketUI:{consume(){log.push('consume');}},stopClock(){context.generation++;context.timer=null;log.push('stop');},blocked:()=>false,hasMonthlyWork:()=>true,generationState:()=>({phase:'working'}),manualDistilling:()=>false,heldRange:()=>false,atExtractionLimit:()=>false,setTimeout(fn){queued=fn;log.push('timer');return 1;},render(){log.push('render');},renderProgress(){log.push('progress');},noteMapReach(){log.push('map');},storageNotice(text){log.push('storage:'+text);},message(text){log.push('message:'+text);}};
 Object.assign(context,{game:structuredClone(initial),canSave:true,preview:false,SAVE_KEY:'formal',lastSavedText:stored,userPaused:false,elapsed:0,runtimeHalted:false,generation:0,timer:null,playbackRate:1,modal:null,room:'warehouse'});context.migrationPending=null;context.committedSession={game:context.game,userPaused:false,elapsed:0};vm.createContext(context);
 vm.runInContext(['rememberCommitted','restoreCommitted','recoveryAccess','saveFailure','sessionText','saveCandidate','save','schedule','act','actMarket'].map(n=>extract(source,n)).join('\n'),context);
 return {context,log,get stored(){return stored;},initial:structuredClone(initial),runTask(){const fn=queued;queued=null;assert(fn);fn();},result(){return plain({game:context.game,canSave:context.canSave,elapsed:context.elapsed,runtimeHalted:context.runtimeHalted,stored,status:node('save-status').textContent,log});}};
}
function actionTrace(source,method,mode){const h=appHost(source,mode),change=s=>({...s,core:{...s.core,cash:s.core.cash+1},operations:[...s.operations,{key:'test-op'}]});h.log.length=0;const result=h.context[method](change,()=>h.log.push('after'),()=>h.log.push('afterSave'));return {result,...h.result()};}
test('H1-B2 generic and market actions publish only after saved success and roll back every failed write',()=>{
 const source=read('shop-app.mjs');
 for(const method of ['act','actMarket'])for(const mode of ['ok','quota','conflict','refuse']){
  const actual=actionTrace(source,method,mode);
  if(mode==='ok'){assert.equal(actual.game.core.cash,101);assert(actual.log.includes('news'));assert(actual.log.indexOf('write')<actual.log.indexOf('news'));}
  else {assert.equal(actual.canSave,false);assert(!actual.log.includes('news'));assert.equal(actual.game.core.cash,100);assert.equal(actual.result,false);assert.equal(actual.status,'未保存');assert(!actual.log.includes('after'));assert(!actual.log.includes('afterSave'));}
 }
});
test('H1-B2 scheduled months preserve the last committed game and clock for every mode on write failure',()=>{
 for(const store of [false,true])for(const mode of ['ok','quota','conflict','refuse']){
  function run(source){const h=appHost(source,mode,store);h.context.elapsed=5900;h.context.schedule();h.runTask();return h.result();}
  const actual=run(read('shop-app.mjs'));
  if(mode==='ok'){assert.equal(actual.game.core.month,2);assert.equal(actual.elapsed,0);assert(actual.log.includes('news'));assert(actual.log.indexOf('write')<actual.log.indexOf('news'));}
  else {assert.equal(actual.game.core.month,1);assert.equal(actual.elapsed,0);assert.equal(actual.status,'未保存');assert(!actual.log.includes('news'));assert.equal(actual.canSave,false);}
 }
});

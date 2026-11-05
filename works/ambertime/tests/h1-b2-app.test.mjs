import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {writeCandidate} from '../placement-save.mjs';
const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function extract(name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);let depth=0,quote=null,escape=false,line=false,block=false;for(let i=source.indexOf('{',start);i<source.length;i++){const c=source[i],n=source[i+1];if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);}throw Error(name);}
const plain=x=>JSON.parse(JSON.stringify(x));
function host(mode='ok',paused=false){
 const initial={core:{month:1,cash:100,casks:[]},operations:[],still:{phase:'ready'},usual:{reservation:null},tastingId:null,decisions:[],trade:{offer:null}},nodes=new Map(),log=[];let queued,stored=JSON.stringify({version:3,game:initial,userPaused:paused,elapsed:0});
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:''});return nodes.get(id);};
 const mutate=s=>({...s,core:{...s.core,cash:s.core.cash+1},operations:[...s.operations,{key:'actual candidate'}]});
 const c={game:structuredClone(initial),committedSession:{game:structuredClone(initial),userPaused:paused,elapsed:0},migrationPending:null,canSave:true,preview:false,SAVE_KEY:'formal',lastSavedText:stored,userPaused:paused,elapsed:0,runtimeHalted:false,generation:0,timer:null,playbackRate:1,modal:null,room:'warehouse',document:{hidden:false},$:node,writeCandidate,
 localStorage:{getItem:()=>mode==='conflict'?'other':stored,setItem:(key,text)=>{log.push('write');if(mode==='quota')throw Error('quota');if(mode!=='refuse')stored=text;}},
 serializeSession:(game,ui)=>{log.push('encode');if(mode==='encode')throw Error('reader limit');return JSON.stringify({version:3,game,...ui});},D:{serializeDistillery:JSON.stringify,restoreDistillery:JSON.parse,canBeginUsual:()=>({ok:false}),tickDistillery:s=>({...mutate(s),core:{...mutate(s).core,month:s.core.month+1}}),fillBarrel:mutate,allocateProduct:mutate,placementInventory:()=>({retail:0})},T:{monthMs:6000,distillStepMs:100},wallClock:{delay:()=>100},performance:{now:()=>100},countdown:{cancel(){}},stopClock(){c.timer=null;c.generation++;log.push('stop');},storageNotice:t=>log.push('notice:'+t),render:()=>log.push('render'),renderProgress:()=>log.push('progress'),schedule:()=>log.push('schedule'),automaticEvents:()=>['event'],automaticNews:{push:()=>log.push('news')},soldOutLabel:()=>'',caskName:()=>'',noteMapReach:()=>log.push('map'),marketUI:{consume:()=>log.push('consume')},blocked:()=>!c.canSave,hasMonthlyWork:()=>true,generationState:()=>({phase:'working'}),manualDistilling:()=>false,heldRange:()=>false,atExtractionLimit:()=>false,message:()=>{},setTimeout(fn){queued=fn;return 1;},LIVE_MESSAGE:{unchanged:'same'}};
 vm.createContext(c);vm.runInContext(['rememberCommitted','restoreCommitted','saveFailure','sessionText','saveCandidate','save','act','actMarket','commitFill','commitPlacement','schedule'].map(extract).join('\n'),c);
 return {c,log,node,initial,mutate,get stored(){return stored;},runTask(){assert(queued);queued();}};
}
test('actual generic and market actions publish callbacks only after the candidate is saved',()=>{
 for(const method of ['act','actMarket'])for(const mode of ['ok','quota','conflict','refuse','encode']){
  const h=host(mode),before=h.stored;const result=h.c[method](h.mutate,()=>h.log.push('after'),()=>h.log.push('after-save'));
  if(mode==='ok'){assert.equal(result,true);assert.equal(h.c.game.core.cash,101);assert(h.log.includes('news'));assert(h.log.indexOf('write')<h.log.indexOf('news'));assert.equal(JSON.parse(h.stored).game.core.cash,101);}
  else {assert.equal(result,false);assert.deepEqual(plain(h.c.game),h.initial);assert.equal(h.stored,before);assert.equal(h.c.canSave,false);assert.equal(h.node('save-status').textContent,'未保存');assert.equal(h.c.timer,null);assert(!h.log.some(x=>['after','after-save','news','map','consume'].includes(x)));}
 }
});
test('actual monthly, fill and placement failures retain the last committed state',()=>{
 for(const mode of ['quota','conflict','refuse','encode']){
  const month=host(mode);month.c.elapsed=5900;month.c.schedule();month.runTask();assert.deepEqual(plain(month.c.game),month.initial);assert.equal(month.c.elapsed,0);assert.equal(month.c.canSave,false);assert(!month.log.includes('news'));
  const fill=host(mode);fill.c.modal={kind:'fill'};fill.c.commitFill('used');assert.deepEqual(plain(fill.c.game),fill.initial);assert.equal(fill.c.modal.kind,'fill');assert.equal(fill.c.canSave,false);
  const placement=host(mode);assert.equal(placement.c.commitPlacement({productId:1,retail:2,shopCount:0}).ok,false);assert.deepEqual(plain(placement.c.game),placement.initial);assert.equal(placement.c.canSave,false);assert.equal(placement.node('save-status').textContent,'未保存');
 }
});
test('old-format migration gate cannot be bypassed by save, retry candidate, or generic action',()=>{
 const h=host();h.c.migrationPending=h.stored;h.c.canSave=false;h.c.game=h.mutate(h.c.game);assert.equal(h.c.save(),false);assert.deepEqual(plain(h.c.game),h.initial);assert.equal(h.c.saveCandidate(h.mutate(h.c.game)),false);assert.equal(h.c.act(h.mutate),false);assert(!h.log.includes('write'));assert(!h.log.includes('encode'));
});
test('pending legacy migration closes gameplay dialogs so backup controls remain reachable',()=>{
 let closed=0,vaulted=0;const context={migrationPending:'original',modal:{kind:'decision'},$:()=>({dataset:{kind:'decision'},open:true,close(){closed++;}}),vaultPanels(){vaulted++;}};vm.createContext(context);vm.runInContext(extract('syncModal'),context);context.syncModal();assert.equal(context.modal,null);assert.equal(closed,1);assert.equal(vaulted,1);
});

test('action pause and elapsed metadata are saved before live publication and remain unchanged on failure',()=>{
 for(const mode of ['ok','quota','conflict','refuse','encode']){const h=host(mode,true),before=h.stored,result=h.c.act(h.mutate,()=>h.log.push('after'),null,{paused:false,time:200});if(mode==='ok'){assert.equal(result,true);assert.equal(h.c.userPaused,false);assert.equal(h.c.elapsed,200);const saved=JSON.parse(h.stored);assert.equal(saved.userPaused,h.c.userPaused);assert.equal(saved.elapsed,h.c.elapsed);}else{assert.equal(result,false);assert.equal(h.c.userPaused,true);assert.equal(h.c.elapsed,0);assert.equal(h.stored,before);assert(!h.log.includes('after'));}}
});

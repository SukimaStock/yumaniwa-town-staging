import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createWarehouseRoomController} from '../warehouse-room-controller.mjs';
import * as D from '../partner-orders.mjs';

const BASE='75843aa2b6a3b9bf1040970602a4fb4364678ddc',appPath='works/ambertime/shop-app.mjs';
const original=execFileSync('git',['show',BASE+':'+appPath],{encoding:'utf8',maxBuffer:4e6});
assert.equal(createHash('sha256').update(original).digest('hex'),'6cd8778677cb66384f158191214537e91dc317cf4ca5ced71ef980b9f744999d');
function oldSelection(){
 const ctx={D};vm.createContext(ctx);vm.runInContext('let selectedCaskId=null;',ctx);
 const fallback=original.split('\n').find(x=>x.startsWith(' if(!D.currentCask(game,selectedCaskId))'));
 const tasting=original.match(/if\(game.tastingId!==null\)\{selectedCaskId=game.tastingId;/)[0]+'}';
 return {get selectedId(){return vm.runInContext('selectedCaskId',ctx);},select(id){ctx.id=id;vm.runInContext('selectedCaskId=id;',ctx);},reconcile(casks,tastingId){ctx.game={core:{casks},tastingId};vm.runInContext(fallback+'\n'+tasting,ctx);}};
}
test('R4 selection matches the immutable inline owner across empty, one, multiple, missing, tasting and return paths',()=>{
 const a=oldSelection(),b=createWarehouseRoomController();assert.equal(b.selectedId,null);
 const casks=Object.freeze([Object.freeze({id:2}),Object.freeze({id:7}),Object.freeze({id:11})]);
 for(const selected of [null,undefined,2,7,11,999,'2'])for(const list of [[],casks.slice(0,1),casks,casks.slice(1)])for(const tasting of [null,2,7]){
  a.select(selected);b.select(selected);a.reconcile(list,tasting);b.reconcile(list,tasting);assert.equal(b.selectedId,a.selectedId);
  a.reconcile(list,null);b.reconcile(list,null);assert.equal(b.selectedId,a.selectedId,'formal tasting ending does not restore an earlier selection');
 }
 b.select(11);b.reconcile(casks,null);assert.equal(b.selectedId,11);
 b.reconcile(casks.slice(0,2),null);assert.equal(b.selectedId,2);b.reconcile([],null);assert.equal(b.selectedId,null);
});
function fill(s){s=D.startRangeDistillation(s);s=D.beginCollection(s);while(s.still.distillation.progress<12)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');}
test('R4 legal tasting, partial/full bottling and restored old saves keep formal bytes, order and original selection rules',()=>{
 let s=fill(D.newMarketRulesDistillery(42));s=fill(D.tickDistillery(s));
 const ids=s.core.casks.map(c=>c.id),controller=createWarehouseRoomController();controller.select(ids[1]);
 const check=()=>{const raw=D.serializeDistillery(s),order=s.core.casks.map(c=>c.id);controller.reconcile(s.core.casks,s.tastingId);assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(s.core.casks.map(c=>c.id),order);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);};
 check();assert.equal(controller.selectedId,ids[1]);
 s=D.sampleDistillery(s,ids[0]);check();assert.equal(controller.selectedId,ids[0]);s=D.endTasting(s);check();assert.equal(controller.selectedId,ids[0]);
 s=D.bottleBranded(s,ids[0],{name:'R4'},1);check();assert.equal(controller.selectedId,ids[0]);
 s=D.bottleBranded(s,ids[0],{brandId:1},D.quote(s,ids[0]).count);check();assert.equal(controller.selectedId,ids[1]);
 const reloaded=createWarehouseRoomController();reloaded.select(s.tastingId??s.core.casks[0]?.id??null);assert.equal(reloaded.selectedId,ids[1]);
 const old=JSON.parse(fs.readFileSync(new URL('./fixtures/bottling-policy-legacy.json',import.meta.url),'utf8'));
 // The legacy fixture remains the immutable oracle; selection only reads its restored casks.
 const raws=[];function visit(v){if(typeof v==='string'&&v.startsWith('{')&&v.includes('"operations"'))raws.push(v);else if(v&&typeof v==='object')for(const x of Object.values(v))visit(x);}visit(old);
 assert(raws.length>0);for(const raw of raws){const game=D.restoreDistillery(raw),bytes=D.serializeDistillery(game);controller.reconcile(game.core.casks,game.tastingId);assert.equal(D.serializeDistillery(game),bytes);}
});
test('R4 controller has no effect dependencies, retained game objects or shared owner; selected ID is read-only externally',()=>{
 const source=fs.readFileSync(new URL('../warehouse-room-controller.mjs',import.meta.url),'utf8'),forbidden=()=>{throw Error('effect dependency');};
 const context={document:new Proxy({},{get:forbidden}),localStorage:new Proxy({},{get:forbidden}),performance:new Proxy({},{get:forbidden}),Date:forbidden,setTimeout:forbidden};
 const make=vm.runInNewContext(source.replace('export function','function')+'\ncreateWarehouseRoomController;',context),a=make(),b=make();
 const casks=Object.freeze([Object.freeze({id:3})]);a.select(3);a.reconcile(casks,null);assert.equal(a.selectedId,3);assert.equal(b.selectedId,null);assert.throws(()=>{a.selectedId=4;},TypeError);
 a.select(null);assert.equal(a.selectedId,null);a.reconcile([],null);assert.equal(a.selectedId,null);
 assert.deepEqual(Object.keys(a),['selectedId','select','reconcile']);assert(!/\bimport\b/.test(source));
});
test('R4 root has only the declared owner substitutions; all other statements and entry bytes match the immutable base',()=>{
 let current=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 current=current.replace("import {createWarehouseRoomController} from './warehouse-room-controller.mjs?v=refactor-r4-1';\n",'').replace('const warehouseRoom=createWarehouseRoomController();\n','');
 current=current.replace("room='distill',selectedProductId", "room='distill',selectedCaskId=null,selectedProductId");
 current=current.replace(" warehouseRoom.reconcile(game.core.casks,game.tastingId);\n if(game.tastingId!==null){room='warehouse';if(!modal)modal={kind:'inspect',id:warehouseRoom.selectedId};}"," if(!D.currentCask(game,selectedCaskId))selectedCaskId=game.core.casks[0]?.id??null;\n if(game.tastingId!==null){selectedCaskId=game.tastingId;room='warehouse';if(!modal)modal={kind:'inspect',id:selectedCaskId};}");
 for(const expr of ['game.core.casks.at(-1)?.id??null','game.tastingId??game.core.casks[0]?.id??null','Number(b.dataset.caskId)','roomFeedback.caskId','d.caskId','null','id'])current=current.replaceAll('warehouseRoom.select('+expr+')','selectedCaskId='+expr);
 current=current.replaceAll('warehouseRoom.selectedId','selectedCaskId');assert.equal(current,original);
 const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').replace('&amp;warehouse=r4-1','');
 assert.equal(index,execFileSync('git',['show',BASE+':works/ambertime/index.html'],{encoding:'utf8'}));
});

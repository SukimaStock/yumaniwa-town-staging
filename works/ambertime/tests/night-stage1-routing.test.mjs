import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function harness(events){
 const calls=[],context={game:{},MAP_BROWSE_MAX:4,D:{currentCask:(_s,id)=>id===7?{id}:null},mapPartnerProjection:(_s,stage)=>({pins:stage===3?[{id:'north'}]:[]}),automaticNews:{events,clear:()=>calls.push('clear')},modal:null,room:'distill',stopClock:()=>calls.push('stop'),warehouseRoom:{select:id=>calls.push(['cask',id])},render:()=>calls.push('render'),schedule:()=>{},currentMapBrowse:()=>({stage:1}),setMapBrowse:v=>calls.push(['map',v]),m0:{close:()=>{}},inspectMapPartner:id=>calls.push(['shop',id])};
 vm.createContext(context);vm.runInContext(app.slice(app.indexOf('function noticeTarget('),app.indexOf("for(const el of [$('automatic-news')",app.indexOf('function noticeTarget('))),context);
 return {context,calls,activate:()=>vm.runInContext('activateNotice()',context)};
}
test('targeted notice navigates to surviving cask without a tasting or saved operation',()=>{const h=harness([{caskId:7}]);h.activate();assert.equal(h.context.room,'warehouse');assert.equal(h.context.modal.kind,'inspect');assert.equal(h.context.modal.id,7);assert.deepEqual(h.calls.slice(0,3),['clear','stop',['cask',7]]);});
test('store dialogue follows its actual map layer',()=>{const h=harness([{entry:{shopId:'north'}}]);h.activate();assert.equal(h.context.room,'sales');const map=h.calls.find(c=>Array.isArray(c)&&c[0]==='map')[1];assert.equal(map.stage,3);assert.equal(map.selectedShop,'north');assert(h.calls.some(c=>Array.isArray(c)&&c[0]==='shop'&&c[1]==='north'));});
test('untargeted or stale notice closes without moving room or layer',()=>{for(const events of [[{text:'news'}],[{caskId:999}],[{shopId:'missing'}]]){const h=harness(events);h.activate();assert.equal(h.context.room,'distill');assert.equal(h.context.modal,null);assert.deepEqual(h.calls,['clear']);}});

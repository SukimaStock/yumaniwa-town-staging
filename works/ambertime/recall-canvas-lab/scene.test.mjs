import test from 'node:test';
import assert from 'node:assert/strict';
import {EDITION} from './fixtures.mjs';
import {sceneViews,drawScene,assetCells,sceneDimensions} from './scene.mjs';
import {codeaBottle,codeaCask} from '../codea-object-art.mjs';
function context(){return {rects:[],clearRect(){},save(){},restore(){},beginPath(){},rect(){},clip(){},translate(){},fillRect(...r){assert(r.every(Number.isInteger));this.rects.push([...r,this.fillStyle]);}};}
test('existing sentences, dates and frozen edition remain unchanged through display',()=>{
 const before=JSON.stringify(EDITION),a=sceneViews(EDITION),b=sceneViews(EDITION);
 assert.deepEqual(a,b);assert.deepEqual(a.map(v=>v.sentence),EDITION.scenes.map(v=>v.sentence));
 for(const view of a){const ctx=context();drawScene(ctx,view);assert(ctx.rects.length>20);assert.equal(ctx.imageSmoothingEnabled,false);}
 assert.equal(JSON.stringify(EDITION),before);assert(Object.isFrozen(EDITION.scenes[0].event.ids));
});
test('same shop across time keeps the same existing building composition',()=>{
 const item=EDITION.scenes[0],a=context(),b=context();
 const views=sceneViews({scenes:[item,{...item,month:item.month+120}]});
 drawScene(a,views[0]);drawScene(b,views[1]);assert.deepEqual(a.rects,b.rects);assert.notEqual(views[0].date,views[1].date);
});
test('unknown IDs and event kinds fall back without falsely identifying a known shop',()=>{
 for(const event of [{kind:'delivery',ids:{shopId:'not-known'}},{kind:'new-kind'}]){
  const [view]=sceneViews({scenes:[{month:0,sentence:'保存済みの文。',event}]});assert.equal(view.art,'neutral');assert.equal(view.sentence,'保存済みの文。');
 }
 assert.throws(()=>sceneViews({scenes:[{month:-1,sentence:'x',event:{kind:'visit'}}]}));
});
test('native assets remain rect-only and every source cell is consumed',()=>{
 for(const svg of [codeaBottle('standard',{label:'cream',priceTier:'standard'}),codeaCask('bourbon')]){
  const cells=assetCells(svg);assert(cells.length>40);assert.equal(cells.length,(svg.match(/<rect /g)||[]).length);assert(cells.every(c=>c.w===1&&c.h===1));
 }
});

test('street and letter preserve event meaning without requiring geography',()=>{
 for(const regionId of ['overseas-food','national-food','unknown'])for(const [kind,art] of [['arrival','street'],['inquiry','letter']]){
  const [view]=sceneViews({scenes:[{month:0,sentence:'確定済みの文。',event:{kind,ids:{regionId}}}]});
  assert.equal(view.art,art);assert.deepEqual(sceneDimensions(view),{width:120,height:72});
 }
});
test('all compositions use integral cells inside the same native frame',()=>{
 const outputs=[];
 for(const art of ['shop','supermarket','street','distillery','bottle','letter','neutral']){
  const ctx=context();drawScene(ctx,{art});
  for(const [x,y,w,h] of ctx.rects){assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=120&&y+h<=72,`${art}: ${[x,y,w,h]}`);}
  outputs.push(JSON.stringify(ctx.rects));
 }
 assert.equal(new Set(outputs).size,outputs.length);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {sceneViews,drawScene} from '../recall/pixel-scene.mjs';
import {EDITION} from '../recall-canvas-lab/fixtures.mjs';
const approvedHashes=[
 '4e25cb7f0989d6cc2a32e6a63aa689bc33becb5e6209c385b5bc395005004cfc',
 '68a91e79ac54020a8f65f6c853e487a8d2a1f0fe0c33ec88f45709c85cd379b1',
 '27c2c4ffe2c13f013848ca1e52b92a17f9f2bdb6bc4f4fbfce0718266a73a60a',
 '3334825a1bb78487732206fe42ceb709e29e558b4195747ae253ff6b8b82d837'
];
test('four owner-approved compositions retain every colored native rectangle',()=>{
 const input=JSON.stringify(EDITION);
 for(const [i,v] of sceneViews(EDITION).entries()){
  const cells=[],ctx={clearRect(){},fillRect(...r){cells.push([...r,this.fillStyle]);}};
  drawScene(ctx,v);assert.equal(createHash('sha256').update(JSON.stringify(cells)).digest('hex'),approvedHashes[i]);
 }
 assert.equal(JSON.stringify(EDITION),input);
});
test('all formal kinds keep frozen text and valid drawing, without mutation',()=>{
 const kinds=['bottling','fill','distillation','delivery','shop-start','sale','reaction','arrival','inquiry','visit','handover','future-kind'];
 const edition={scenes:kinds.map((kind,i)=>({month:1200+i,sentence:`確定済みの文${i}。`,event:{kind,ids:{shopId:'town-liquor'}}}))};
 const before=JSON.stringify(edition);
 for(const [i,view] of sceneViews(edition).entries()){
  assert.equal(view.sentence,edition.scenes[i].sentence);
  const ctx={clearRect(){},fillRect(x,y,w,h){assert([x,y,w,h].every(Number.isInteger));assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=120&&y+h<=72);}};
  drawScene(ctx,view);
 }
 assert.equal(JSON.stringify(edition),before);
 assert.equal(sceneViews(edition)[5].art,'counter');
});
test('main integration changes only two presentation imports; handover/save paths are byte-identical',async()=>{
 const root=new URL('../../../',import.meta.url);
 const original=execFileSync('git',['show','8a145ec4bb810baccbb2dfb353e990db72a3ef21:works/ambertime/shop-app.mjs'],{cwd:root,encoding:'utf8'});
 const current=await readFile(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const restored=current.replace("import {createRecallPlayer as createRecallDebugPreview} from './recall/player.mjs?v=h4-2-1';","import {createRecallDebugPreview} from './recall/debug-scene.mjs?v=h3-3b-live-1';").replace("import {sceneViews as playbackScenes} from './recall/pixel-scene.mjs?v=h4-2-1';","import {playbackScenes} from './recall/live-scene.mjs?v=h3-3b-live-1';");
 assert.equal(restored,original);
 for(const path of ['recall/collector.mjs','recall/selection.mjs','recall/live-scene.mjs','recall/debug-scene.mjs','save-codec.mjs','development-save.mjs']){
  const before=execFileSync('git',['show',`8a145ec4bb810baccbb2dfb353e990db72a3ef21:works/ambertime/${path}`],{cwd:root,encoding:'utf8'});
  assert.equal(await readFile(new URL('../'+path,import.meta.url),'utf8'),before,path);
 }
});

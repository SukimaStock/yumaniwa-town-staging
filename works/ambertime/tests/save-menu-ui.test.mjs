import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('shop-app.mjs'),html=read('index.html');
const source=app.split("}else if(kind==='settings'){")[1].split('}else if(')[0];
const details=html.match(/<details><summary>以前の記録・方式<\/summary>[\s\S]*?<\/details>/)[0];
function menu({preview=false,canSave=true,lastSavedText='verified',rules=true,store=true,placementEnabled=true}={}){
 return runInNewContext(source+'\n({title,body,actions})',{
  title:'',body:'',actions:'',preview,canSave,lastSavedText,placementEnabled,game:{},
  D:{marketRulesMode:()=>rules,storeMarketMode:()=>store,stage4Mode:()=>true,upkeep:()=>20},
  money:n=>n+'円',symbolMarkup:()=>'<i aria-hidden="true"></i>',
  $:id=>{assert.equal(id,'settings-source');return {querySelector:tag=>{assert.equal(tag,'details');return {outerHTML:details};}};},
  button:(text,action)=>`<button data-action="${action}">${text}</button>`
 });
}

test('save menu distinguishes a validated record, no record, storage failure and preview',()=>{
 assert.match(menu().body,/このブラウザに自動保存されます。<br><strong>保存済み/);
 assert.match(menu({lastSavedText:null}).body,/<strong>未保存/);
 assert.match(menu({canSave:false}).body,/<strong>保存できません/);
 assert.doesNotMatch(menu({canSave:false}).body,/保存済み/);
 assert.match(menu({preview:true,canSave:false}).body,/<strong>試遊中・保存しません/);
});

test('export and reset are separate, while actionable transition stays outside archived options',()=>{
 const {body,actions}=menu({rules:false});
 assert.match(body,/記録を書き出す.*記録を読み込む/);
 assert.match(body,/market-rules-adopt.*<details><summary>.*以前の記録・方式/);
 assert.match(body,/<details>.*market-export-before[\s\S]*<\/details>[\s\S]*上書きされます.*settings-reset/);
 assert.match(actions,/閉じる/);
 assert.match(menu().body,/market-rules-export-before/);
 assert.doesNotMatch(menu().body,/market-rules-adopt/);
 assert.match(menu({rules:false,store:false,placementEnabled:false}).body,/connected-export-before/);
 assert.match(app,/confirm\(preview\?'試遊を最初からやり直しますか？':'新しい蒸留所で始めますか？現在の進行は上書きされます。/);
});

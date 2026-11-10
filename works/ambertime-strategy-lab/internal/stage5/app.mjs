import {runScenario} from './scenarios.mjs';
import {createCheckpoint,appendTail,restore,sourceFingerprint,POLICY} from './persistence.mjs';
import {buildMemory,remember} from './memory.mjs';
import {canonical} from './model.mjs';
const $=id=>document.getElementById(id);let saved;
$('run').addEventListener('click',async()=>{
 $('run').disabled=true;$('broken').disabled=true;$('status').textContent='比較中…';
 try{
  const {result,model}=await runScenario({months:12,seed:42,pattern:'distributed'});
  const fingerprint=await sourceFingerprint({synthetic:true,revision:12,model});
  const checkpoint=await createCheckpoint(model,{revision:12,sourceFingerprint:fingerprint});
  // A no-op committed revision demonstrates the tail/revision boundary without inventing sales.
  saved=await appendTail(checkpoint,{revision:13,sourceFingerprint:await sourceFingerprint({synthetic:true,revision:13,model}),commands:[]});
  const recovered=await restore(JSON.parse(JSON.stringify(saved)),{...saved.head,policyVersion:POLICY});
  if(canonical(recovered.model)!==canonical(model))throw Error('復元結果が一致しません');
  $('status').textContent='旧モデルとの一致・JSON復元後の一致を確認しました。';
  $('result').textContent='合成12か月・seed 42・分散納品。正式ゲームの実行結果ではありません。';
  $('diagnostic').textContent=JSON.stringify(result,null,2);$('broken').disabled=false;
  const source={core:{products:[]},brands:[{id:1,name:'比較酒'}],releases:[1,2].map(id=>({id,productId:id,brandId:1,caskId:1,bottledMonth:id,age:24,sourceGeneration:1,bottles:54,sold:54,revenue:540,price:10,profile:{age:24,type:'refill',roughness:.25,character:.7,wood:.3}}))};
  const wine=remember(buildMemory(source),2);$('memory').replaceChildren();const art=document.createElement('div');art.className='bottle';art.innerHTML=wine.svg;const text=document.createElement('p');text.textContent=`発売ID ${wine.id}・商品ID ${wine.productId}・初代の樽。外観と風味を保持。製法・全取引・正式collectorへの互換性は情報不足。`;$('memory').append(art,text);
 }catch(error){$('status').textContent='検証失敗：'+error.message;}
 finally{$('run').disabled=false;}
});
$('broken').addEventListener('click',async()=>{const corrupt=structuredClone(saved);corrupt.tail=[];try{await restore(corrupt,{...saved.head,policyVersion:POLICY});$('status').textContent='検証失敗：欠落を検出できませんでした。';}catch(error){$('status').textContent='tail欠落を拒否しました。正式接続時は旧読取を維持する契約です。';$('diagnostic').textContent=JSON.stringify({readSource:'legacy',reason:error.message,synthetic:true},null,2);}});

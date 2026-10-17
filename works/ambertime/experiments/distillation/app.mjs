import {MODELS,profileAt,createRecipe,repeatRecipe} from './models.mjs?v=1';
import {ageExperiment} from './adapters.mjs?v=1';
import {stillArt} from '../../distillery-art.mjs';
import {PARALLEL_PARAMETERS as P} from '../../economy-parameters.mjs';
const $=id=>document.getElementById(id),model=id=>MODELS.find(m=>m.id===id),validSeed=n=>Number.isInteger(n)&&n>=1&&n<=4294967295;
const q=new URLSearchParams(location.search),requested=Number(q.get('seed'));
let seed=validSeed(requested)?requested:20261015,modelId='current',progress=0,phase='ready',paused=false,timer=null,generation=0,comparisonPosition=65;
$('still').innerHTML=stillArt();$('seed').value=String(seed);
const note=t=>{$('notice').textContent=t;};
function halt(){generation++;if(timer!==null)clearTimeout(timer);timer=null;}
function schedule(){
 halt();if(phase!=='distilling'||paused||document.hidden||progress>=99)return;const token=generation;
 timer=setTimeout(()=>{if(token!==generation||document.hidden||paused)return;timer=null;progress++;if(progress===99)note('採取がいっぱいです。抽出を止められます。');render();schedule();},P.distillStepMs);
}
function begin(){halt();progress=0;phase='distilling';paused=false;note('');render();schedule();}
function setModel(id){if(!model(id))return;halt();modelId=id;progress=0;phase='ready';paused=false;note(model(id).label+'に切り替えました。シードは同じです。');render();compare();}
function setMeter(el,value){el.style.setProperty('--value',value);el.setAttribute('aria-valuenow',String(value));el.setAttribute('aria-valuetext',value.toFixed(2)+' / 1 · 特徴の強さ');}
function render(){
 const r=profileAt(modelId,progress,seed),active=phase==='distilling';document.body.dataset.running=String(active&&!paused&&!document.hidden&&progress<99);document.body.style.setProperty('--collection',r.litres/40);
 for(const b of $('models').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.model===modelId));
 $('model-detail').textContent=model(modelId).detail;$('phase').textContent=phase==='ready'?'仕込み前':phase==='stopped'?'できた原酒':progress<30?'採取中':paused?'一時停止 · 集めた原酒の見込み':'集めた原酒の見込み';
 $('volume').textContent=r.litres.toFixed(1)+' L';$('phrase').textContent=phase==='ready'?'抽出を始め、好きなところで止めます。':r.phrase;
 $('gauges').hidden=phase==='ready'||r.phase==='collecting';if(! $('gauges').hidden){setMeter($('rough'),r.roughness);setMeter($('aroma'),r.character);}
 $('fraction').hidden=modelId!=='b'||progress<30||phase==='ready';$('fraction').textContent=r.instant?'いまの留分：'+r.instant.phrase:'';
 $('start').hidden=active||phase==='stopped';$('stop').hidden=!active;$('stop').disabled=progress<30;$('pause').hidden=!active;$('pause').disabled=progress>=99;$('pause').textContent=paused?'再開':'一時停止';
 $('conditions-text').textContent='シード '+seed+' · 同じ個体差から再試行します。';
}
const meterHtml=(label,value)=>'<div class="axis"><span>'+label+'</span><div class="meter" role="meter" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="1" aria-valuenow="'+value+'" aria-valuetext="'+value.toFixed(2)+' / 1 · 特徴の強さ" style="--value:'+value+'"><span></span></div></div>';
function compare(){
 const p=comparisonPosition,months=Number($('age').value),type=$('cask').value;
 const rows=MODELS.map(m=>({model:m,raw:profileAt(m.id,p,seed)})).map(x=>({...x,aged:ageExperiment(x.raw,type,months)}));
 $('compare-context').textContent='シード '+seed+' · 抽出位置 '+p+' · '+(months?months+'か月熟成':'蒸留直後')+(months?' · 比率保持は実験上の仮説':'');
 $('cards').innerHTML=rows.map(({model:m,aged:r})=>'<article class="card" data-card="'+m.id+'"><h2>'+m.label+'</h2><span class="card-volume">'+r.litres.toFixed(1)+' L</span><p>'+r.phrase+'</p>'+meterHtml('刺激',r.roughness)+meterHtml('原酒の香り',r.character)+'</article>').join('');
 $('wood-note').hidden=months===0;$('wood-note').textContent=months?'樽の香り '+rows[0].aged.wood.toFixed(2)+' / 1.35 · 全案共通の熟成計算':'';
 const b=rows[2],names={light:'軽い香り',fruit:'果実',grain:'穀物'};
 $('mixture-table').innerHTML='<table><caption>案B · 抽出位置 '+p+'</caption><thead><tr><th>香り</th><th>集めた原酒</th><th>いまの留分</th></tr></thead><tbody>'+Object.keys(names).map(k=>'<tr><th>'+names[k]+'</th><td>'+(b.aged.composition[k]*100).toFixed(1)+'%</td><td>'+(b.raw.instant.composition[k]*100).toFixed(1)+'%</td></tr>').join('')+'</tbody></table>';
 $('mixture-note').textContent=months?'熟成では既存の刺激・香り・樽の計算を使い、香りの構成比だけを保つ仮説です。':'樽へ移すのは、留分を収量で重み付けした原酒全体です。';
}
$('models').addEventListener('click',e=>{const b=e.target.closest('[data-model]');if(b)setModel(b.dataset.model);});
$('start').addEventListener('click',begin);$('retry').addEventListener('click',begin);
$('pause').addEventListener('click',()=>{if(phase!=='distilling'||progress>=99)return;paused=!paused;render();schedule();});
$('stop').addEventListener('click',()=>{if(phase!=='distilling'||progress<30)return;halt();phase='stopped';paused=false;const recipe=createRecipe({modelId,seed,stopAt:progress,type:$('cask').value});const actual=repeatRecipe(recipe);note('');comparisonPosition=progress;$('position').value=String(progress);render();compare();if(actual.progress!==progress)throw Error('製法の再現が一致しません。');});
for(const b of document.querySelectorAll('[data-position]'))b.addEventListener('click',()=>{comparisonPosition=Number(b.dataset.position);$('position').value=String(comparisonPosition);compare();});
$('compare-form').addEventListener('submit',e=>{e.preventDefault();const n=Number($('position').value);if(!Number.isInteger(n)||n<30||n>99)return;comparisonPosition=n;compare();});
for(const id of ['age','cask'])$(id).addEventListener('change',()=>{const n=Number($('position').value);if(Number.isInteger(n)&&n>=30&&n<=99)comparisonPosition=n;else $('position').value=String(comparisonPosition);compare();});
$('seed-form').addEventListener('submit',e=>{e.preventDefault();const n=Number($('seed').value);if(!validSeed(n)){note('シードは1〜4294967295で指定します。');return;}seed=n;begin();compare();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){halt();render();}else{render();schedule();}});window.addEventListener('pagehide',halt);window.addEventListener('pageshow',()=>{render();schedule();});
render();compare();

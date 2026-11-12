import {scenarios} from './fixture.mjs';
import {extractMemory,compactView,measure} from './memory.mjs?consignment=night-stage4-v01';
const $=id=>document.getElementById(id),frames={current:$('current'),compact:$('compact')};
let tab='shops',memory=null,downloadUrl=null;
for(const s of scenarios)$('scenario').add(new Option(s.label,s.id));
$('scenario').value=scenarios.find(s=>s.id==='generations')?.id??scenarios[0].id;
function send(side){const s=scenarios.find(s=>s.id===$('scenario').value);frames[side].contentWindow.postMessage({type:'small-memory-input',tab,payload:side==='compact'?memory:s.source},location.origin);}
function refresh(){const s=scenarios.find(s=>s.id===$('scenario').value);memory=JSON.parse(JSON.stringify(extractMemory(s.source)));$('sizes').textContent=`全記録の比較入力：${measure(s.source).toLocaleString()} bytes ／ B案の表示記憶：${measure(memory).toLocaleString()} bytes（JSON・UTF-8）`;
 const list=document.createElement('ul');for(const text of compactView(memory).limits??[]){const li=document.createElement('li');li.textContent=text;list.append(li);}$('limits').replaceChildren(list);
 if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(new Blob([JSON.stringify(memory,null,2)],{type:'application/json'}));$('download').href=downloadUrl;
 for(const side of Object.keys(frames))send(side);
}
for(const side of Object.keys(frames))frames[side].addEventListener('load',()=>send(side));
$('scenario').addEventListener('change',refresh);
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{tab=button.dataset.tab;for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b===button));for(const side of Object.keys(frames))send(side);});
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{document.querySelector('.comparison').dataset.mode=button.dataset.mode;for(const b of document.querySelectorAll('button[data-mode]'))b.setAttribute('aria-pressed',String(b===button));});
refresh();

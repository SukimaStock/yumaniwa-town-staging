import * as M from './model.mjs';
import {bottleArt} from '../../../room-object-art.mjs';
import {symbolMarkup} from '../../../pixel-symbols.mjs';
import {fontReady} from '../../../font-loader.mjs';
const $=id=>document.getElementById(id),clone=x=>structuredClone(x),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LOCATIONS=[{id:'hand',name:'手元'},{id:'retail',name:'直販売',taste:'少量の資金回収'},{id:'town-liquor',name:'酒屋',taste:'煙・厚み'},{id:'supermarket',name:'スーパー',taste:'麦・果実'}];
const storageKey=M.STORAGE_KEY??'ambertime-market-design-v01';
let state,selected=null,source='hand',quantity='1',scenario='matched',opener=null,saveFailure=false;
const money=n=>'£'+Number(n??0).toLocaleString('en-GB',{minimumFractionDigits:0,maximumFractionDigits:2});
const count=(p,at)=>at==='hand'?p.hand:at==='retail'?p.retail:(p.shops?.[at]??0);
const products=()=>state.products??[];
const product=id=>products().find(p=>String(p.id)===String(id));
const location=id=>LOCATIONS.find(l=>l.id===id);
const monthSales=(p,at)=>Array.isArray(state.lastSales)?state.lastSales.filter(s=>String(s.productId??s.id)===String(p.id)&&(s.venue??s.shopId??'retail')===at).reduce((n,s)=>n+(s.count??s.sold??0),0):0;
const text=(id,value)=>{$(id).textContent=String(value);};
function notify(message,error=false,id='result'){text(id,message);$(id).classList.toggle('error',error);}
function persist(text){if(saveFailure)throw Error('保存できないため、変更していません。');localStorage.setItem(storageKey,text);}
function install(next){persist(M.serialize(next));state=next;scenario=state.scenario??scenario;selected=null;render();}
function act(action){try{state=M.transact(state,action,persist);render();return true;}catch(e){notify(e.message,true,$('bottle-dialog').open?'transfer-result':'result');return false;}}
try{const saved=localStorage.getItem(storageKey);state=saved?M.load(saved):M.create({mode:'candidate',scenario});scenario=state.scenario??scenario;}catch(e){state=M.create({mode:'candidate',scenario});queueMicrotask(()=>notify('保存を読み込めませんでした。新しい試遊を表示しています。',true));}
function bottle(p,at){const n=count(p,at),sold=monthSales(p,at);return `<button class="bottle ${sold?'has-sale':''} ${n===0?'retired':''}" data-product="${esc(p.id)}" data-source="${at}" aria-label="${esc(p.name)}、${location(at).name}${n}本${sold?'、今月'+sold+'本販売':''}">${bottleArt(p.wood??0)}<span class="bottle-text"><span class="bottle-name">${esc(p.name)}</span><span class="bottle-age">${p.age}か月</span><span class="bottle-count">${n}本</span>${sold?`<span class="sold">今月 −${sold}本</span>`:''}</span></button>`;}
function render(){
 const active=document.activeElement,key=active?.dataset.product,at=active?.dataset.source;
 text('month',`${state.month}か月`);text('cash',money(state.cash));text('revenue',money(state.revenue??state.totalRevenue??0));
 for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));
 $('hand').innerHTML=products().filter(p=>count(p,'hand')>0).map(p=>bottle(p,'hand')).join('')||'<p class="empty">瓶は棚に並んでいます</p>';
 text('hand-total',`${products().reduce((n,p)=>n+count(p,'hand'),0)}本`);
 $('outlets').innerHTML=LOCATIONS.slice(1).map(l=>`<section class="outlet" aria-label="${l.name}の棚"><div class="outlet-heading">${symbolMarkup(l.id==='retail'?'stock':'store')}<h2>${l.name}</h2><span class="taste">${state.mode==='candidate'?l.taste:l.id==='retail'?'': '麦を好む'}</span></div><div class="outlet-shelf" data-shelf="${l.id}">${products().filter(p=>count(p,l.id)>0||monthSales(p,l.id)>0).map(p=>bottle(p,l.id)).join('')||'<p class="empty">棚は空です</p>'}</div></section>`).join('');
 text('diagnostics',JSON.stringify({mode:state.mode,scenario:state.scenario,month:state.month,cash:state.cash,diagnostics:state.diagnostics??{},lastSales:state.lastSales??[],products:products().map(p=>({name:p.name,age:p.age,price:p.price,hand:p.hand,retail:p.retail,shops:p.shops,sold:p.totalSold??p.sold??0}))},null,2));
 for(const b of document.querySelectorAll('[data-scenario]'))b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario));
 if(selected&&$('bottle-dialog').open)renderBottle();
 if(key&&!active.isConnected)document.querySelector(`[data-product="${CSS.escape(key)}"][data-source="${CSS.escape(at)}"]`)?.focus({preventScroll:true});
}
function renderBottle(){
 const p=product(selected);if(!p)return close('bottle-dialog');
 text('bottle-title',p.name);$('bottle-overview').innerHTML=`<div class="overview">${bottleArt(p.wood??0)}<div>${p.age}か月・${money(p.price)}<small>${esc(p.flavorLabel??'')}</small></div></div>`;
 for(const b of document.querySelectorAll('[data-quantity]'))b.setAttribute('aria-pressed',String(b.dataset.quantity===quantity));
 $('sources').innerHTML=LOCATIONS.map(l=>`<button data-origin="${l.id}" aria-pressed="${source===l.id}" ${count(p,l.id)>0?'':'disabled'}><span>${l.name}</span><span>${count(p,l.id)}本</span></button>`).join('');
 const amount=quantity==='all'?count(p,source):Math.min(Number(quantity),count(p,source));
 $('destinations').innerHTML=LOCATIONS.filter(l=>l.id!==source).map(l=>{const tooYoung=l.id==='supermarket'&&p.age<12;return `<button data-target="${l.id}" ${amount>0&&!tooYoung?'':'disabled'}><span>${l.id==='hand'?'手元へ引き取る':l.name+'へ渡す'}<small>${tooYoung?'12か月から':`現在 ${count(p,l.id)}本`}</small></span><span>${tooYoung?'':`＋${amount}本`}</span></button>`;}).join('');
}
function openProduct(id,at){selected=id;source=at;quantity='1';opener=document.activeElement;notify('',false,'transfer-result');renderBottle();$('bottle-dialog').showModal();$('bottle-dialog').querySelector('[data-close]').focus({preventScroll:true});}
function close(id){$(id).close();if(id==='bottle-dialog'){selected=null;opener?.focus({preventScroll:true});opener=null;}}
$('hand').onclick=$('outlets').onclick=e=>{const b=e.target.closest('[data-product]');if(b)openProduct(b.dataset.product,b.dataset.source);};
$('bottle-dialog').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.quantity){quantity=b.dataset.quantity;renderBottle();}if(b.dataset.origin){source=b.dataset.origin;notify('',false,'transfer-result');renderBottle();}if(b.dataset.target){const p=product(selected),n=quantity==='all'?count(p,source):Math.min(Number(quantity),count(p,source)),target=b.dataset.target;if(act({type:'move',productId:p.id,from:source,to:target,count:n}))notify(`${location(source).name}から${location(target).name}へ${n}本移しました。`,false,'transfer-result');}};
$('month-step').onclick=()=>{const before=state.cash;if(act({type:'month'})){const n=products().reduce((sum,p)=>sum+(typeof p.lastSold==='number'?p.lastSold:0),0),sales=Array.isArray(state.lastSales)?state.lastSales.reduce((sum,x)=>sum+(x.count??x.sold??0),0):n;notify(`${sales}本販売・${state.cash-before>=0?'+':''}${money(state.cash-before)}`);}};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(b.dataset.mode===state.mode)return;try{install(M.create({mode:b.dataset.mode,scenario:state.scenario}));notify('同じ初期条件で始めました。');}catch(e){notify(e.message,true);}};
$('settings').onclick=()=>{scenario=state.scenario;for(const b of document.querySelectorAll('[data-scenario]'))b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario));$('settings-dialog').showModal();$('settings-dialog').querySelector('[data-close]').focus({preventScroll:true});};
for(const b of document.querySelectorAll('[data-scenario]'))b.onclick=()=>{scenario=b.dataset.scenario;for(const n of document.querySelectorAll('[data-scenario]'))n.setAttribute('aria-pressed',String(n===b));};
$('reset').onclick=()=>{try{install(M.create({mode:state.mode,scenario}));close('settings-dialog');notify('同じ初期条件で始めました。');}catch(e){notify(e.message,true,'settings-error');}};
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>close(b.dataset.close));
$('bottle-dialog').addEventListener('cancel',e=>{e.preventDefault();close('bottle-dialog');});
window.marketLab=Object.freeze({snapshot:()=>clone(state),storageKey,failSave:flag=>{saveFailure=Boolean(flag);},reset:options=>{install(M.create(options??{mode:'candidate',scenario:'matched'}));},diagnostics:()=>({source,selected,quantity,saveFailure,storageKey})});
render();fontReady.then(()=>document.body.dataset.fontReady='true');

// Isolated QA: real presentation components and extracted policy UI functions.
// All commits are in-memory model roundtrips, never the official persistence path.
import * as D from '../partner-orders.mjs';
import * as H from '../ui-details.mjs?qa=ui3-20261111';
import {ECONOMY_PARAMETERS as P} from '../economy-parameters.mjs';
import {createMarketUI,availableMarketShops} from '../market-ui.mjs?qa=ui3-20261111';
import {marketPartnerScopeForMap} from '../map-partners.mjs?qa=ui3-20261111';
import {createM0Observation} from '../m0-observation.mjs?qa=ui3-20261111';
import {computeViewport} from '../canvas-layout.mjs';
import {installUniformTypography} from '../font-uniform.mjs';
import {fontReady} from '../font-loader.mjs';
import {bottleArt} from '../room-object-art.mjs';
import {fill} from './brands-helpers.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,id='',extra='')=>'<button type="button" data-action="'+action+'" data-id="'+id+'" '+extra+'>'+text+'</button>';
const fixture=await (await fetch(new URL('./fixtures/placement-established-six.json',import.meta.url))).json();
let sales=D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(fixture.raw))),view={stage:4,selectedShop:null},m0=null,ui,failNext=false,message='';
const typography=installUniformTypography('',document.documentElement);
function resize(){const v=computeViewport({width:innerWidth,height:innerHeight,dpr:devicePixelRatio});typography.resize(v);$('scene-root').dataset.viewport=JSON.stringify(v);Object.assign($('scene-root').style,{position:'fixed',inset:'0'});ui?.update({visible:!$('action-dialog').open,sessionActive:true});m0?.update();report();}
function strict(game){const raw=D.serializeDistillery(game);return D.restoreDistillery(raw);}
ui=createMarketUI({document,model:D,state:()=>sales,art:p=>bottleArt(p.wood),scopeForState:s=>marketPartnerScopeForMap(s,view,availableMarketShops(s)),act:fn=>{sales=strict(fn(sales));ui.update({visible:true,sessionActive:true});m0?.update();report();return true;},openProduct(){},openStockist(){},announceSaved:text=>{message=text;report();}});
m0=createM0Observation({document,state:()=>sales,room:()=> 'sales',modal:()=> $('action-dialog').open?{kind:'bottler-panel'}:null,view:()=>view,onViewChange:next=>{view=next;ui.update({visible:true,sessionActive:true});report();},onModeChange:()=>report()});
let policyGame=fill(D.newBottlingPolicyDistillery(42),{progress:65,type:'refill'});policyGame=D.bottleBranded(policyGame,policyGame.core.casks[0].id,{},1);policyGame=D.hireBottlingStaff(policyGame);policyGame=D.setBottlingPolicy(policyGame,{mode:'age',age:24,count:7});
const app=await (await fetch(new URL('../shop-app.mjs?qa=ui3-20261111',import.meta.url))).text();
const policySource=app.slice(app.indexOf('function validPlanDraft('),app.indexOf('function bottlingChoiceView('));
const inputSource=app.slice(app.indexOf('function updateBottleDraft('),app.indexOf("$('dialog-body').addEventListener('change'",app.indexOf('function updateBottleDraft(')));
const branchStart=app.indexOf(" if(['policy-count-less','policy-count-more','policy-condition-less','policy-condition-more'].includes(a)");
if(branchStart<0)throw Error('Policy control branch missing');
const branch=app.slice(branchStart,app.indexOf(" if(a==='bottling-toggle'",branchStart));
const createPolicy=new Function('D','P','H','$','button','esc','initial',`let game=initial,modal=null;const {bottlingPolicyCountChoices,stepBottlingPolicyCount,stepBottlingCondition,policyNumber}=H;${policySource}\n${inputSource}\nreturn {open(){modal={kind:'bottler-panel',planDraft:{...D.operationDefaults(game).auto,...D.commonBottlingPolicy(game)}};$('dialog-body').innerHTML=bottlingPolicyView();},input:updateBottleDraft,action(a){const kind='bottler-panel';${branch}},draft:()=>modal?.planDraft,committed:()=>D.commonBottlingPolicy(game),save(){if(!validPlanDraft(modal?.planDraft))return false;const d=modal.planDraft,plan=d.mode==='age'?{mode:'age',age:d.age,count:d.count}:{mode:'stock',threshold:d.threshold,count:d.count};game=D.restoreDistillery(D.serializeDistillery(D.setBottlingPolicy(game,plan,Object.fromEntries(['age','threshold'].filter(k=>Number.isInteger(d[k])&&d[k]>=0&&d[k]<=(k==='age'?1200:999)).map(k=>[k,d[k]])))));return true;},legacy(count){game=D.setBottlingPolicy(game,{mode:'age',age:24,count});},close(){modal=null;}};`);
const policy=createPolicy(D,P,H,$,button,esc,policyGame);
function closePolicy(){policy.close();$('action-dialog').close();ui.update({visible:true,sessionActive:true});m0.update();report();}
$('close-policy').addEventListener('click',closePolicy);$('action-dialog').addEventListener('cancel',()=>{policy.close();queueMicrotask(()=>{ui.update({visible:true,sessionActive:true});m0.update();report();});});
for(const type of ['input','change'])$('dialog-body').addEventListener(type,e=>{policy.input(e);report();});
$('dialog-body').addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(!a)return;if(a==='bottling-policy-save'){if(failNext){failNext=false;message='模擬保存失敗・確定設定は変更していません';}else message=policy.save()?'メモリ内モデルへ保存・復元一致（正式保存ではありません）':'入力を確認してください';}else policy.action(a);report();});
function report(){if(!document.documentElement.dataset.ready)return;const header=document.querySelector('.m0-handle'),stage=document.querySelector('.m0-stage'),rect=el=>el?.getBoundingClientRect().toJSON(),h=rect(header),s=rect(stage),scope=marketPartnerScopeForMap(sales,view,availableMarketShops(sales));parent.postMessage({ui3Report:{fixture:'UIのみ・保存領域を読み書きしません',size:[innerWidth,innerHeight],message,mapView:view.stage,marketScope:scope.stage,fallback:scope.label,shops:scope.shops.map(s=>s.id),m0:m0?.mode,header:h,selector:s,centerDelta:h&&s?Math.abs((h.left+h.width/2)-(s.left+s.width/2)):null,policyDraft:policy?.draft(),policyCommitted:policy?.committed(),condition:rect($('bottling-condition')),quantity:rect($('bottling-quantity')),dialogBody:rect($('dialog-body')),focused:document.activeElement?.id||document.activeElement?.dataset?.action}},new URL(import.meta.url).origin);}
window.addEventListener('message',e=>{if(e.source!==parent||!e.data?.ui3Command)return;const c=e.data.ui3Command;if(c==='policy'){m0.close();policy.open();$('action-dialog').showModal();ui.update({visible:false,sessionActive:true});m0.update();}if(c==='sales'){if($('action-dialog').open)closePolicy();m0.close();ui.update({visible:true,sessionActive:true});}if(c==='map')m0.open();if(c==='legacy1'||c==='legacy7'){policy.legacy(c==='legacy1'?1:7);if($('action-dialog').open)policy.open();}if(c==='fail'){failNext=true;message='次のメモリ内保存を模擬失敗にします';}requestAnimationFrame(report);});
window.addEventListener('resize',resize);await fontReady;document.documentElement.dataset.ready='true';resize();ui.update({visible:true,sessionActive:true});report();

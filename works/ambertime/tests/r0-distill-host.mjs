import {createWarehouseRoomController} from '../warehouse-room-controller.mjs';
// Execute current application boundaries. DOM/clock/notice adapters are inert;
// formal operations, serialization, conditional writes and handlers are real.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {manualCompletedRuns} from '../distill-learning.mjs';
import {distillToolsView,rangeRestartAvailable} from '../distill-tools-view.mjs';
import {distillationReadout,spiritProfile} from '../spirit-view.mjs';
import {manualCards} from '../brewing-cards.mjs';
import {createDistillRoomController} from '../distill-room-controller.mjs';
import {writeCandidate,FORMAL_SAVE_KEY} from '../placement-save.mjs';
import {ECONOMY_PARAMETERS as P} from '../economy-parameters.mjs';
import {barrel} from '../cask-glass-art.mjs';
import {glassColor} from '../flavor-color.mjs';
export const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
export function extract(name){
 const start=source.indexOf('function '+name+'(');assert(start>=0,name);let depth=0,quote=null,escape=false,line=false,block=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){
  const c=source[i],next=source[i+1];
  if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}
  if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}
  if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}
  if(c==="'"||c==='"'||c==='`'){quote=c;continue;}
  if(c==='{')depth++;else if(c==='}'&&--depth===0){const text=source.slice(start,i+1);new vm.Script(text);return text;}
 }throw Error('Unclosed function '+name);
}
export function host({preview=false,state=D.selectFlavorCards(D.newMarketRulesDistillery(42),{malt:'plain',ferment:'short'}),restored=false}={}){
 let raw=JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(state)),userPaused:false,elapsed:0}),writes=0,reads=0,fail=false;
 const storage={getItem(){reads++;return raw;},setItem(key,value){writes++;if(fail)throw Error('storage denied');raw=value;}};
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},hidden:true,textContent:'',innerHTML:'',open:false,classList:{toggle(){}},querySelector(){return {focus(){}};},removeAttribute(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const ctx={D,createDistillRoomController,createWarehouseRoomController,manualCompletedRuns,distillToolsView,rangeRestartAvailable,distillationReadout,spiritProfile,manualCards,writeCandidate,SAVE_KEY:FORMAL_SAVE_KEY,P,barrel,glassColor,localStorage:storage,
  document:{hidden:false,activeElement:null},T:{minimumStop:30},$ :node,
  stopClock(){},schedule(){},message(){},noteMapReach(){},automaticNews:{push(){}},automaticEvents:()=>[],soldOutLabel:()=>'',caskName:String,
  placementUI:{reset(){}},showStaffOpportunity(){},showShopOffer(){},showGeneration(){},showInitialMapNotice(){},vaultPanels(){},shopOffers:()=>[],comparisonKinds:[],
  esc:String,uiText:String,displayReason:String,money:n=>'£'+n,button:(text,action,id='',extra='')=>'<button data-action="'+action+'" data-id="'+id+'" '+extra+'>'+text+'</button>',
  queueMicrotask:fn=>fn(),initial:state,initialRaw:raw,initialPreview:preview,restored};
 vm.createContext(ctx);
 vm.runInContext(`let game=initial,room='distill',modal=null,userPaused=false,canSave=!initialPreview,preview=initialPreview,shownFillSpiritId=restored&&game.still.phase==='filling'?game.core.spirit.id:null,lastSavedText=initialRaw,elapsed=0,runtimeHalted=false,selectedCaskId=null,modalReturnFocus=null,modalReturnObject=null,pointerInteraction=false,mapLabelObserver=null,pendingCountdown=null;
 const warehouseRoom=createWarehouseRoomController();
 const distillRoom=createDistillRoomController();distillRoom.confirm({},game.core.lastDistillation);
 const countdown={active:false,start(fn){this.active=true;pendingCountdown=fn;},cancel(){this.active=false;pendingCountdown=null;}};
 function storageNotice(text){$('storage-notice').textContent=text;$('storage-notice').hidden=!text;}
 function render(){syncModal();}
 ${['save','act','prepareDistillation','finishDistillation','currentDistillTools','startFromLever','commitFill','syncModal','closeModal'].map(extract).join('\n')}
 globalThis.api={startFromLever,finishDistillation,fill:commitFill,tools:currentDistillTools,game:()=>game,modal:()=>modal,canSave:()=>canSave,room:()=>room,render,
 runCountdown(){const fn=pendingCountdown;pendingCountdown=null;countdown.active=false;if(fn)fn();},cancelCountdown(){countdown.cancel();},
 stepTo(n){while(game.still.distillation.progress<n)game=D.distillStep(game);},
 setGame(s){game=s;},closeFill:closeModal,
 prepareNext(){distillRoom.confirm({},game.core.lastDistillation);room='distill';},
 node:id=>$(id)};`,ctx);
 return {api:ctx.api,persisted:()=>raw,writes:()=>writes,reads:()=>reads,failWrites:()=>{fail=true;},conflict:()=>{raw='external-save';}};
}

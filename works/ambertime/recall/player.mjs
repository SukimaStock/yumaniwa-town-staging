// Main presentation only: reads fixed recall sentences; never advances or saves a model.
import {drawScene,sceneDimensions} from './pixel-scene.mjs?v=h4-2-1';
import {RECALL_DEBUG_SCENES} from './debug-scene.mjs?v=h3-3b-live-1';
import {uniformMetrics} from '../font-uniform.mjs?v=uniform-messages-r1';
const legacyArt=Object.freeze({cask:'bottle',counter:'counter',distant:'street',visitor:'distillery',letter:'letter',shop:'shop'});
const STYLES=`
.at-recall-player{box-sizing:border-box;color:#f0e6c8;background:#19141e;border:0;padding:0;width:min(360px,100vw);max-width:100vw;max-height:calc(100dvh - 16px);margin:auto;overflow:auto;overscroll-behavior:contain;font-family:AmberMisaki,system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.5;box-shadow:none}
.at-recall-player::backdrop{background:#19141eee}
.at-recall-player *{box-sizing:border-box}
.at-recall-player header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px}
.at-recall-player h2,.at-recall-player p{margin:0;font:inherit}
.at-recall-player h2{font-weight:400}
.at-recall-player button{font:inherit;color:inherit;background:#282832;border:2px solid #5a5a64;border-radius:0;min-height:44px;padding:8px 12px;box-shadow:none;cursor:pointer;touch-action:manipulation}
.at-recall-player button:disabled{opacity:.4;cursor:default}
.at-recall-player button:hover:not(:disabled){background:#282832;border-color:#f0e6c8}
.at-recall-player button:focus-visible{outline:2px solid #dca050;outline-offset:3px}
.at-recall-player [data-recall-action=close]{width:44px;flex:none;padding:4px;font-size:24px}
.at-recall-player .at-recall-picture{display:flex;justify-content:center;align-items:center;width:100%;min-height:0;border:0;padding:0;background:transparent}
.at-recall-player .at-recall-picture:hover:not(:disabled){background:transparent}
.at-recall-player .at-recall-picture:disabled{opacity:1;cursor:default}
.at-recall-player canvas{display:block;image-rendering:pixelated;max-width:none}
.at-recall-player .at-recall-caption{min-height:128px;padding:20px 16px;display:flex;flex-direction:column;justify-content:center;gap:12px;text-align:center}
.at-recall-player [data-recall-date]{color:#c1bdb0}
.at-recall-player [data-recall-sentence]{overflow-wrap:anywhere;text-wrap:pretty}
.at-recall-player nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:0 12px 12px}
.at-recall-player nav button{padding-inline:6px}
.at-recall-player [data-recall-counter]{min-width:40px;text-align:center}
.at-recall-player nav [data-recall-action=next]{border-color:#a0785a}
@media(max-height:480px){.at-recall-player .at-recall-caption{padding-block:12px;min-height:0}}
/* All readers control progression; neither motion mode has a timer or animation. */
.at-recall-player,.at-recall-player *{animation:none!important;transition:none!important}
`;

export function createRecallPlayer({document,window=globalThis,scenes=RECALL_DEBUG_SCENES}={}){
 if(!document)throw Error('回想のプレビューを準備できません。');
 const style=document.createElement('style');style.textContent=STYLES;document.head.append(style);
 const dialog=document.createElement('dialog');dialog.className='at-recall-player';dialog.setAttribute('aria-labelledby','at-recall-title');
 dialog.innerHTML=`<header><h2 id="at-recall-title"></h2><button type="button" data-recall-action="close" aria-label="回想を閉じる">×</button></header>
 <button type="button" class="at-recall-picture" data-recall-action="picture" aria-label="次の場面へ"><canvas width="120" height="72" aria-hidden="true"></canvas></button>
 <div class="at-recall-caption" aria-live="polite" aria-atomic="true"><p data-recall-date></p><p data-recall-sentence></p></div>
 <nav aria-label="回想の場面"><button type="button" data-recall-action="previous">戻る</button><span data-recall-counter aria-label="場面番号"></span><button type="button" data-recall-action="next">次へ</button></nav>`;
 document.body.append(dialog);
 const $=q=>dialog.querySelector(q),picture=$('.at-recall-picture'),canvas=$('canvas');
 const previous=$('[data-recall-action="previous"]'),forward=$('[data-recall-action="next"]');
 let index=0,playing=[],mode='debug',onComplete=null,returnFocus=null,finishing=false,epoch=0;
 function size(){
  if(!dialog.open||!playing.length)return;
  const width=Math.max(1,Math.min(360,window.innerWidth||360)),height=Math.max(1,window.innerHeight||640);
  const typography=uniformMetrics({scale:Math.min(width/360,height/640),dpr:Math.max(1,Math.min(3,window.devicePixelRatio||1))});
  dialog.style.fontSize=Math.max(16,typography.cssSize)+'px';
  const native=sceneDimensions(playing[index]);
  const available=picture.clientWidth||width,heightLimit=Math.max(native.height,height-260);
  const scale=Math.max(1,Math.floor(Math.min(available/native.width,heightLimit/native.height)));
  canvas.style.width=native.width*scale+'px';canvas.style.height=native.height*scale+'px';
 }
 function render(){
  const view=playing[index],last=index===playing.length-1;
  $('[data-recall-date]').textContent=view.date;$('[data-recall-sentence]').textContent=view.sentence;
  $('[data-recall-counter]').textContent=`${index+1} / ${playing.length}`;
  previous.disabled=index===0;picture.disabled=last;
  forward.textContent=last?(mode==='handover'?'次の代へ':'閉じる'):'次へ';
  const native=sceneDimensions(view);canvas.width=native.width;canvas.height=native.height;
  drawScene(canvas.getContext('2d'),view);size();
 }
 function restoreFocus(){const target=returnFocus;returnFocus=null;target?.focus?.({preventScroll:true});}
 function close(){epoch++;if(dialog.open)dialog.close();restoreFocus();}
 async function next(){
  if(!dialog.open||finishing)return;
  if(index<playing.length-1){index++;render();return;}
  // Keep the final scene until the async handover has settled. A rejected save
  // closes to the underlying recovery UI, without reporting a successful move.
  finishing=true;const token=epoch;
  try{if(mode==='handover')await onComplete?.();}
  catch{ /* The owning runtime displays the save failure. */ }
  finally{if(token===epoch)close();}
 }
 function back(){if(!dialog.open||finishing||index===0)return;index--;render();}
 dialog.addEventListener('click',async event=>{
  if(!dialog.open||finishing)return;
  const target=event.target.closest('[data-recall-action]');
  if(!target||!dialog.contains(target)||target.disabled)return;
  const action=target.dataset.recallAction;
  if(action==='close')close();else if(action==='previous')back();else if(action==='next'||action==='picture')await next();
 });
 dialog.addEventListener('keydown',async event=>{
  if(!dialog.open||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowLeft'){event.preventDefault();back();}
  else if(event.key==='ArrowRight'){event.preventDefault();await next();}
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!finishing)close();});
 dialog.addEventListener('close',()=>{if(!dialog.open)restoreFocus();});
 window.addEventListener?.('resize',size);
 window.visualViewport?.addEventListener?.('resize',size);
 if(window.ResizeObserver)new window.ResizeObserver(size).observe(dialog);
 function open(options={}){
  if(dialog.open)return;
  const values=options.scenes??scenes,nextMode=options.mode??'debug';
  if(!Array.isArray(values)||values.length===0||values.some(v=>typeof v?.date!=='string'||typeof v?.sentence!=='string'||typeof v?.scene!=='string'))throw Error('回想の場面を読み取れません。');
  if(!['debug','handover','history'].includes(nextMode)||nextMode==='handover'&&typeof options.onComplete!=='function')throw Error('回想の操作を確認できません。');
  playing=values.map(v=>({date:v.date,sentence:v.sentence,scene:v.scene,art:typeof v.art==='string'?v.art:legacyArt[v.scene]??'neutral'}));
  epoch++;mode=nextMode;onComplete=options.onComplete??null;index=0;finishing=false;
  $('#at-recall-title').textContent=options.title??'二代目の回想';returnFocus=document.activeElement;
  dialog.showModal();render();forward.focus({preventScroll:true});
 }
 return {open,close,isOpen:()=>dialog.open};
}

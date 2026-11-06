// H3-3B scene prototype. Debug-only presentation; never reads or writes a game save.
export const RECALL_DEBUG_SCENES = Object.freeze([
  {date:'2054年1月',scene:'cask',sentence:'先代が樽に詰めた「石蔵」を瓶詰めした。'},
  {date:'2054年4月',scene:'counter',sentence:'自家販売で「石蔵」に「果実の香りがよく出ていますね。」という反応があった。'},
  {date:'2056年5月',scene:'distant',sentence:'海外の飲食文化圏に口コミが届いた。'},
  {date:'2058年10月',scene:'visitor',sentence:'海外の飲食文化圏で銘柄を知った人が蒸留所を訪れた。'},
  {date:'2063年1月',scene:'letter',sentence:'全国の飲食のつながりから問い合わせが届いた。'},
  {date:'2078年1月',scene:'shop',sentence:'先代の頃に酒を届けた町の酒店に「石蔵」が届いた。'}
]);

const INK='#e3d9bc',GOLD='#d2ad70',WALL='#273632',DARK='#142226',WOOD='#594538',WOOD2='#826245',SKY='#30474e',WINDOW='#c6a76e',GLASS='#bfcebd';

// Low-resolution Canvas deliberately uses the existing AmberTime colors and no assets.
export function drawRecallDebugScene(canvas,kind){
 const c=canvas.getContext('2d');if(!c)return;
 const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const bottle=(x,y,s=1)=>{r(x+4*s,y,4*s,5*s,WOOD2);r(x+2*s,y+5*s,8*s,21*s,'#547166');r(x,y+9*s,12*s,12*s,'#72866f');r(x+2*s,y+13*s,8*s,6*s,INK);r(x+4*s,y+14*s,4*s,3*s,GOLD);};
 const person=(x,y)=>{r(x+5,y,10,10,'#b59678');r(x+3,y+10,14,18,'#596960');r(x,y+15,3,15,'#596960');r(x+17,y+15,3,15,'#596960');r(x+4,y+28,5,8,DARK);r(x+11,y+28,5,8,DARK);};
 const window=(x,y,w=34,h=26)=>{r(x-3,y-3,w+6,h+6,'#172729');r(x,y,w,h,WINDOW);r(x+Math.floor(w/2)-1,y,2,h,WOOD);r(x,y+Math.floor(h/2),w,2,WOOD);};
 c.clearRect(0,0,256,144);r(0,0,256,144,DARK);
 if(['cask','counter','letter'].includes(kind)){
  r(0,0,256,93,WALL);r(0,93,256,51,WOOD);r(0,92,256,4,'#1b2b2c');
  window(175,18,49,38);r(0,22,146,5,'#48534a');r(0,49,146,4,'#48534a');
  for(let i=0;i<4;i++)r(11+i*35,25,20,24,'#3a493e');
  if(kind==='cask'){
   for(let x of [22,70,118]){r(x,73,33,26,WOOD2);r(x+4,67,25,38,'#76543a');r(x+4,76,25,3,'#293c3b');r(x+4,96,25,3,'#293c3b');}
   r(165,102,64,7,'#b39360');bottle(191,65,2);
  }else if(kind==='counter'){
   person(37,62);person(188,63);r(64,89,125,40,WOOD2);r(60,86,133,6,'#ad8b60');bottle(116,62,1);r(129,80,14,6,'#b8c8ba');
  }else{
   r(45,88,164,7,'#a1845d');r(58,95,136,35,WOOD2);r(87,74,83,41,'#ddc9a0');r(100,88,56,3,'#7f876f');r(100,98,43,3,'#7f876f');r(118,73,20,14,'#b99f75');bottle(197,69,1);
  }
 }else if(kind==='distant'){
  r(0,0,256,91,SKY);r(0,91,256,53,'#283a35');r(0,116,256,28,'#1e302d');
  for(const [x,h,w] of [[4,56,45],[54,79,48],[110,64,39],[157,85,44],[209,62,38]]){r(x,111-h,w,h,'#273633');r(x+4,107-h,w-8,4,'#46584c');for(let yy=118-h;yy<102;yy+=17)for(let xx=x+7;xx<x+w-6;xx+=14)r(xx,yy,6,9,'#b79a64');}
  person(45,100);person(178,98);bottle(124,95,1);
 }else if(kind==='visitor'){
  r(0,0,256,94,SKY);r(0,94,256,50,'#34443c');r(38,18,164,87,'#536052');r(34,18,172,8,'#283832');r(93,39,50,66,'#283531');r(99,44,38,56,'#73583f');r(109,60,18,25,'#303f38');window(51,40,30,27);window(163,40,24,27);r(0,119,256,25,WOOD);person(167,84);r(112,102,65,4,'#8c7756');
 }else if(kind==='shop'){
  r(0,0,256,93,SKY);r(0,93,256,51,'#384438');r(38,22,176,91,'#566052');r(31,20,190,9,'#273633');r(40,32,173,12,'#b18b59');for(let x=42;x<208;x+=28)r(x,32,13,12,'#e2c99a');window(55,55,55,43);r(135,55,59,58,'#2c3b37');r(141,61,46,46,'#8d7050');r(151,63,26,30,'#bda073');bottle(71,67,1);bottle(86,67,1);r(0,113,256,31,'#314036');r(0,120,256,5,'#596453');
 }
 // Light stipple, visually consistent across scenes.
 for(let i=0;i<8;i++)r(9+i*29,133,10,2,'#485447');
}

const STYLES=`
.at-recall-debug{box-sizing:border-box;width:min(96vw,650px);max-height:min(96dvh,820px);margin:auto;padding:0;color:var(--ink,#e3d9bc);background:var(--night,#172227);border:1px solid var(--line,#46534b);box-shadow:0 20px 80px #0009;font-family:inherit;overscroll-behavior:contain}
.at-recall-debug::backdrop{background:#091418e8}
.at-recall-debug *{box-sizing:border-box}
.at-recall-wrap{padding:clamp(12px,3vw,22px);display:grid;gap:12px}
.at-recall-head{display:flex;justify-content:space-between;align-items:start;gap:12px}
.at-recall-kicker,.at-recall-meta,.at-recall-help{font-size:12px;color:var(--muted,#aaa995)}
.at-recall-head h2{font-size:18px;font-weight:500;margin:3px 0 0}
.at-recall-close{min-width:44px;min-height:44px;padding:8px}
.at-recall-image{display:block;width:100%;min-height:unset;padding:0;border:1px solid #46534b;background:#142226;cursor:pointer;aspect-ratio:16/9;overflow:hidden}
.at-recall-image:hover{background:#142226}
.at-recall-image canvas{display:block;width:100%;height:100%;image-rendering:pixelated}
.at-recall-content{min-height:94px;display:flex;flex-direction:column;justify-content:center;gap:5px;text-align:center}
.at-recall-content p{font-size:15px;line-height:1.65;margin:0;text-wrap:pretty}
.at-recall-meter{height:3px;display:flex;gap:5px;overflow:hidden}
.at-recall-meter span{height:100%;flex:1;background:#46534b}
.at-recall-meter span[aria-current=true]{background:var(--amber,#d2ad70)}
.at-recall-controls{display:flex;gap:7px;justify-content:space-between}
.at-recall-controls button{flex:1;min-width:0;padding:9px 4px;min-height:44px}
.at-recall-controls button.primary{background:var(--paper,#cec19c);color:#25302b;border-color:var(--paper,#cec19c)}
.at-recall-help{text-align:center;margin:0;line-height:1.4}
.at-recall-debug button:focus-visible{outline:2px solid var(--amber,#d2ad70);outline-offset:3px}
.at-recall-fade{animation:at-recall-enter .18s ease-out}
@keyframes at-recall-enter{from{opacity:.52}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.at-recall-fade{animation:none}.at-recall-debug *{transition:none!important}}
@media(max-width:420px){.at-recall-content p{font-size:14px}.at-recall-wrap{gap:8px}}
`;

export function createRecallDebugPreview({document,window=globalThis,scenes=RECALL_DEBUG_SCENES}={}){
 if(!document||!Array.isArray(scenes)||scenes.length===0)throw Error('回想のプレビューを準備できません。');
 const style=document.createElement('style');style.textContent=STYLES;document.head.append(style);
 const dialog=document.createElement('dialog');dialog.className='at-recall-debug';dialog.setAttribute('aria-labelledby','at-recall-title');
 dialog.innerHTML=`<div class="at-recall-wrap">
  <header class="at-recall-head"><div><span class="at-recall-kicker">デバッグ用サンプル</span><h2 id="at-recall-title">二代目の回想</h2></div><button class="at-recall-close" type="button" data-recall-action="close" aria-label="回想を閉じる">×</button></header>
  <div class="at-recall-meta"><span data-recall-counter></span></div>
  <button type="button" class="at-recall-image" data-recall-action="next" aria-label="次の場面へ"><canvas width="256" height="144" aria-hidden="true"></canvas></button>
  <div class="at-recall-content" aria-live="polite"><span class="at-recall-meta" data-recall-date></span><p data-recall-sentence></p></div>
  <div class="at-recall-meter" aria-hidden="true" data-recall-meter></div>
  <div class="at-recall-controls"><button type="button" data-recall-action="previous">戻る</button><button type="button" data-recall-action="pause">一時停止</button><button type="button" class="primary" data-recall-action="next">次へ</button></div>
  <p class="at-recall-help">画面タップでも進みます。実際の進行と保存は変更しません。</p>
 </div>`;
 document.body.append(dialog);
 const $=selector=>dialog.querySelector(selector),frame=$('.at-recall-content'),picture=$('.at-recall-image');
 const previous=$('[data-recall-action="previous"]'),pause=$('[data-recall-action="pause"]'),forward=$('.at-recall-controls [data-recall-action="next"]');
 const meter=$('[data-recall-meter]');
 let index=0,paused=false,timer=null,returnFocus=null,playingScenes=scenes,mode='debug',onComplete=null;
 const prefersReduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const clear=()=>{if(timer!==null){window.clearTimeout(timer);timer=null;}};
 const schedule=()=>{clear();if(dialog.open&&!paused&&!prefersReduced()&&!document.hidden&&index<playingScenes.length-1)timer=window.setTimeout(()=>{index++;render();},5000);};
 function render(){
  const s=playingScenes[index],last=index===playingScenes.length-1;
  $('[data-recall-counter]').textContent=`${index+1} / ${playingScenes.length}`;
  $('[data-recall-date]').textContent=s.date;
  $('[data-recall-sentence]').textContent=s.sentence;
  drawRecallDebugScene($('canvas'),s.scene);
  previous.disabled=index===0;
  picture.disabled=last;
  forward.textContent=last?(mode==='history'?'閉じる':'次の代へ'):'次へ';
  pause.textContent=paused?'再生':'一時停止';pause.setAttribute('aria-pressed',String(paused));
  if(prefersReduced()){paused=true;pause.textContent='再生';pause.disabled=true;}else pause.disabled=last;
  meter.replaceChildren(...playingScenes.map((_,i)=>{const cell=document.createElement('span');if(i<=index)cell.setAttribute('aria-current','true');return cell;}));
  frame.classList.remove('at-recall-fade');void frame.offsetWidth;frame.classList.add('at-recall-fade');
  schedule();
 }
 function close(){clear();if(dialog.open)dialog.close();returnFocus?.focus?.({preventScroll:true});returnFocus=null;}
 function next(){if(index===playingScenes.length-1){if(mode==='handover')try{onComplete?.();}finally{close();}else close();return;}index++;render();}
 function back(){if(index===0)return;index--;render();}
 const actions={next,previous:back,close,pause:()=>{if(prefersReduced())return;paused=!paused;render();}};
 dialog.addEventListener('click',e=>{const target=e.target.closest('[data-recall-action]');if(target&&dialog.contains(target))actions[target.dataset.recallAction]?.();});
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('close',clear);
 dialog.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowLeft'){e.preventDefault();back();}else if(e.key==='ArrowRight'){e.preventDefault();next();}});
 document.addEventListener('visibilitychange',schedule);
 function open(options={}){if(dialog.open)return;
  const values=options.scenes??scenes;
  if(!Array.isArray(values)||values.length===0||values.some(v=>typeof v?.sentence!=='string'||typeof v?.date!=='string'||typeof v?.scene!=='string'))throw Error('回想の場面を読み取れません。');
  const nextMode=options.mode??'debug';
  if(!['debug','handover','history'].includes(nextMode)||nextMode==='handover'&&typeof options.onComplete!=='function')throw Error('回想の操作を確認できません。');
  playingScenes=values;mode=nextMode;onComplete=options.onComplete??null;
  $('#at-recall-title').textContent=options.title??'二代目の回想';
  $('.at-recall-kicker').textContent=nextMode==='debug'?'デバッグ用サンプル':'';
  $('.at-recall-help').hidden=nextMode!=='debug';
  returnFocus=document.activeElement;index=0;paused=false;dialog.showModal();render();picture.focus({preventScroll:true});
 }
 return {open,close,isOpen:()=>dialog.open};
}

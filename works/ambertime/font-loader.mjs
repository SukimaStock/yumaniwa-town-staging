// One local, unchanged font. Font state is transient display state, never game state.
export const FONT_STACK='"AmberMisaki",system-ui,-apple-system,"Noto Sans JP",sans-serif';
const root=document.documentElement;
root.dataset.fontState='loading';
let release,attempts=0,inFlight=false,retryTimer=null;
export const fontReady=new Promise(resolve=>{release=resolve;});
const finish=state=>{
 if(root.dataset.fontState==='ready'||root.dataset.fontState===state)return;
 root.dataset.fontState=state;release(state);
 if(state==='ready'){clearTimeout(timeout);clearTimeout(retryTimer);retryTimer=null;}
 document.dispatchEvent(new Event('amber-font-change'));
};
const isMisaki=face=>face.family.replace(/["']/g,'')==='AmberMisaki';
const loaded=()=>[...document.fonts].some(face=>isMisaki(face)&&face.status==='loaded');
// A failed FontFace keeps its rejected promise. Changing this one CSS source
// creates a fresh CSS-connected face, without registering a duplicate family.
function renewSource(){
 for(const sheet of document.styleSheets){
  let rules;try{rules=sheet.cssRules;}catch{continue;}
  for(const rule of rules??[])if(rule.type===CSSRule.FONT_FACE_RULE&&rule.style.fontFamily.replace(/["']/g,'')==='AmberMisaki'){
   const url=new URL('./fonts/misaki_gothic_2nd.ttf',import.meta.url);url.searchParams.set('amber-font-retry',String(attempts));
   rule.style.setProperty('src','url("'+url.href+'") format("truetype")');return true;
  }
 }
 return false;
}
function retry(){
 if(root.dataset.fontState==='ready'||attempts>=3||retryTimer!==null)return;
 retryTimer=setTimeout(()=>{retryTimer=null;load();},attempts<2?1500:4000);
}
async function load(){
 if(inFlight||root.dataset.fontState==='ready'||attempts>=3)return;
 inFlight=true;attempts++;
 try{
  if(attempts>1)renewSource();
  const faces=await document.fonts.load('16px "AmberMisaki"','蒸留 貯蔵庫 £0123 バーボン');
  if(faces.some(face=>isMisaki(face)&&face.status==='loaded')||loaded())finish('ready');
  else{finish('fallback');retry();}
 }catch{if(loaded())finish('ready');else{finish('fallback');retry();}}
 finally{inFlight=false;}
}
function recover(){
 if(document.hidden||root.dataset.fontState==='ready')return;
 if(loaded())finish('ready');else if(!inFlight)retry();
}
const timeout=setTimeout(()=>finish('fallback'),1800);
if(!document.fonts){clearTimeout(timeout);finish('fallback');}
else{
 document.fonts.addEventListener('loadingdone',recover);
 document.addEventListener('visibilitychange',recover);
 window.addEventListener('pageshow',recover);
 window.addEventListener('online',recover);
 load();
}

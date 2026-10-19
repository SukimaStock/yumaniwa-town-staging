// One local, unchanged font. Font state is transient display state, never game state.
export const FONT_STACK='"AmberMisaki",system-ui,-apple-system,"Noto Sans JP",sans-serif';
const root=document.documentElement;
root.dataset.fontState='loading';
let release;
export const fontReady=new Promise(resolve=>{release=resolve;});
const finish=state=>{root.dataset.fontState=state;release(state);document.dispatchEvent(new Event('amber-font-change'));};
if(!document.fonts){finish('fallback');}
else{
 const timeout=setTimeout(()=>finish('fallback'),1800);
 document.fonts.load('16px "AmberMisaki"','蒸留 貯蔵庫 £0123 バーボン').then(faces=>{
  clearTimeout(timeout);finish(faces.length?'ready':'fallback');
 }).catch(()=>{clearTimeout(timeout);finish('fallback');});
}

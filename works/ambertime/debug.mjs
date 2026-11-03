// An independent diagnostic page. Reading or exporting never starts the game.
import {FORMAL_SAVE_KEY,FORMAL_SOURCES} from './placement-save.mjs?v=formal-copy-r1';

const records=document.getElementById('records');
const notice=document.getElementById('notice');
const definitions=[
 {id:'main',key:FORMAL_SAVE_KEY,label:'現在の記録',filename:'ambertime-save.json'},
 ...FORMAL_SOURCES.map(s=>({id:s.id,key:s.key,label:s.label,filename:'ambertime-'+s.id+'.json'})),
];

function describe(raw){
 try{
  const session=JSON.parse(raw),game=session?.game;
  if(session?.version!==2||game?.version!==20||!game.core||!Array.isArray(game.operations))return '形式を確認できません（書き出しは可能）';
  const parts=['進行 '+game.operations.length+'操作'];
  if(Number.isInteger(game.core.month))parts.push('月 '+game.core.month);
  if(Number.isFinite(game.core.cash))parts.push('資金 £'+game.core.cash.toLocaleString('en-GB',{maximumFractionDigits:0}));
  return parts.join(' · ');
 }catch{return '読み取れない記録（書き出しは可能）';}
}
function download(text,filename){
 const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function render(){
 records.replaceChildren();notice.textContent='';
 for(const item of definitions){
  const row=document.createElement('div'),info=document.createElement('div'),heading=document.createElement('strong'),detail=document.createElement('small');
  row.className='record';heading.textContent=item.label;info.append(heading,detail);row.append(info);
  let raw;
  try{raw=localStorage.getItem(item.key);}
  catch{detail.textContent='このブラウザの記録にアクセスできません';records.append(row);continue;}
  if(raw===null){detail.textContent='記録なし';records.append(row);continue;}
  detail.textContent=describe(raw);
  const button=document.createElement('button');button.type='button';button.textContent='書き出す';
  button.addEventListener('click',()=>{
   try{
    const current=localStorage.getItem(item.key);
    if(current!==raw){render();notice.textContent='記録が変更されたため一覧を更新しました。';return;}
    download(raw,item.filename);
   }catch{notice.textContent='記録を書き出せませんでした。';}
  });
  row.append(button);records.append(row);
 }
}
document.getElementById('refresh').addEventListener('click',render);
window.addEventListener('storage',event=>{if(definitions.some(item=>item.key===event.key))render();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
render();

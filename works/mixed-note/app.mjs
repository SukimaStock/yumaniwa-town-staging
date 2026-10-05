import { compose, remember, validateEntry } from './detection.mjs';
import {kana,katakana} from './composition.mjs';
import {convertSource} from './conversion.mjs';
import {convertKana} from './mozc.mjs';
import { readState, writeState } from './state.mjs';
const $=id=>document.getElementById(id);
let storage;
try { storage=window.localStorage; } catch { storage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}}; }
const loaded=readState(storage);
let state=loaded.state, segments=[], overrides={}, selected=-1, composing=false, draftComposing=false, timer=null, undo=null, copySelection=null, previewVersion=0, pendingPreview=false, previewSource=null;
const autoSaveAllowed=!loaded.error;
$('source').value=state.source; $('draft').value=state.draft;
$('draft').setSelectionRange(state.draft.length,state.draft.length);
$('last-source').textContent=state.lastSource||'まだありません。';
$('save-status').textContent=loaded.error??'下書きはこのブラウザに保存します。';
const status=message=>{$('status').textContent=message;};
function save(){
  $('last-source').textContent=state.lastSource||'まだありません。';
  state.source=$('source').value; state.draft=$('draft').value;
  const error=autoSaveAllowed?writeState(storage,state):loaded.error;
  $('save-status').textContent=error??'このブラウザに保存しました。';
}
function closeChoice(){selected=-1;$('choices').hidden=true;}
async function preview(){
  clearTimeout(timer);timer=null;
  if(composing) return;
  const version=++previewVersion, source=$('source').value;
  overrides={};closeChoice();pendingPreview=true;previewSource=null;
  $('commit').disabled=true;$('refresh').disabled=true;
  status(source?'漢字候補を準備しています。初回は辞書を読み込みます。':'');
  try {
    const next=await convertSource(source,state,convertKana);
    if(version!==previewVersion||source!==$('source').value||composing)return;
    segments=next;previewSource=source;pendingPreview=false;paint();
    status(source?'文節をタップして漢字候補を選べます。':'');
  }catch(error){
    if(version!==previewVersion||source!==$('source').value)return;
    segments=[];pendingPreview=false;paint();status(error.message+' 原文はそのまま残っています。');
  }finally{if(version===previewVersion)$('refresh').disabled=false;}
}
function paint(){
  $('preview').replaceChildren();
  segments.forEach((s,i)=>{
    if(s.language==='literal'){$('preview').append(document.createTextNode(s.text));return;}
    const button=document.createElement('button');button.type='button';
    button.textContent=overrides[i]?.text??s.text;button.dataset.language=s.language;
    button.classList.toggle('uncertain',s.uncertain&&!overrides[i]);
    button.title=s.reason;button.setAttribute('aria-label',`${button.textContent}：${s.reason}。表記を選ぶ`);
    button.addEventListener('click',()=>{selected=i;$('choice-title').textContent=`「${s.raw}」の表記`;$('custom').value=button.textContent;$('choices').hidden=false;showCandidates(s);});
    $('preview').append(button);
  });
  $('commit').disabled=pendingPreview||previewSource!==$('source').value||composing||draftComposing||!$('source').value;
}
function showCandidates(segment){
  $('kanji-candidates').replaceChildren();
  for(const text of segment.candidates??[]){const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=()=>choose(text,'kanji');$('kanji-candidates').append(button);}
}
function choose(text,language){
  if(selected<0||composing) return;
  overrides[selected]={text,language};closeChoice();paint();
}
$('choice-original').onclick=()=>choose(segments[selected]?.raw??'','en');
$('choice-kana').onclick=()=>choose(kana(segments[selected]?.raw??''),'ja');
$('choice-katakana').onclick=()=>choose(katakana(segments[selected]?.raw??''),'ja');
$('choice-custom').onclick=()=>{
  if(selected<0||!$('custom').value.trim())return;
  choose($('custom').value,'custom');
};
$('choice-close').onclick=closeChoice;
$('source').addEventListener('focus',()=>{
  if(copySelection){$('draft').setSelectionRange(...copySelection);copySelection=null;}
});
$('source').addEventListener('compositionstart',()=>{composing=true;++previewVersion;previewSource=null;clearTimeout(timer);closeChoice();$('commit').disabled=true;});
$('source').addEventListener('compositionend',()=>{composing=false;save();preview();});
$('source').addEventListener('input',event=>{
  save();++previewVersion;previewSource=null;
  if(composing||event.isComposing) return;
  // Avoid stale candidates while editing; never mutate the native textarea.
  $('commit').disabled=true;closeChoice();clearTimeout(timer);timer=setTimeout(preview,120);
});
$('draft').addEventListener('compositionstart',()=>{draftComposing=true;$('commit').disabled=true;});
$('draft').addEventListener('compositionend',()=>{draftComposing=false;save();paint();});
$('draft').addEventListener('input',()=>{undo=null;$('undo').disabled=true;save();});
$('refresh').onclick=preview;
$('example').onclick=()=>{
  if(composing) return;
  if($('source').value.trim()){status('書きかけを下書きへ入れてから、例を試せます。');return;}
  $('source').value='kyouhaPUMPOKOno prototypewotsukutta.\nI like the touch feeling.'; save();preview();
};
$('commit').onclick=()=>{
  if(composing||draftComposing||pendingPreview||previewSource!==$('source').value||!$('source').value)return;
  const raw=$('source').value;
  undo={state:structuredClone(state),draft:$('draft').value,source:raw};
  const text=compose(segments,overrides), draft=$('draft'), at=draft.selectionStart, end=draft.selectionEnd;
  // Native selection insertion works for middle edits as well as append.
  draft.setRangeText(text,at,end,'end');
  Object.entries(overrides).forEach(([i,value])=>{
    if(['en','ja'].includes(value.language)) state.memory=remember(state.memory,segments[i].raw,value.language);
  });
  state.lastSource=raw;$('source').value='';save();preview();dictionaryView();
  $('undo').disabled=false;status('下書きに入れました。必要なら、ひとつ戻せます。');
};
$('undo').onclick=()=>{
  if(!undo||composing||draftComposing)return;
  if($('source').value){status('書きかけがあるため戻せません。先にコピーして保管してください。');return;}
  state=undo.state;$('draft').value=undo.draft;$('source').value=undo.source;
  undo=null;$('undo').disabled=true;save();preview();dictionaryView();status('確定前に戻しました。');
};
$('copy').onclick=async()=>{
  const text=$('draft').value;if(!text){status('下書きが空です。');return;}
  try { await navigator.clipboard.writeText(text);status('コピーしました。noteに貼り付けられます。'); }
  catch { copySelection=[$('draft').selectionStart,$('draft').selectionEnd];$('draft').focus();$('draft').select();status('自動コピーを使えません。選択した文章を長押ししてコピーしてください。'); }
};
function download(text,filename){
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
$('export').onclick=()=>{
  let text=$('draft').value;
  if($('source').value)text+='\n\n--- 未確定の原文 ---\n'+$('source').value;
  download(text,'mixed-note-draft.txt');status('下書きを書き出しました。');
};
function dictionaryView(){
  $('dictionary-list').replaceChildren();
  state.dictionary.forEach((entry,i)=>{
    const li=document.createElement('li'),label=document.createElement('span'),button=document.createElement('button');
    label.textContent=`${entry.raw} → ${entry.value}`;button.textContent='削除';button.type='button';
    button.setAttribute('aria-label',`${entry.raw}の登録を削除`);
    button.onclick=()=>{undo=null;$('undo').disabled=true;state.dictionary.splice(i,1);save();dictionaryView();preview();};
    li.append(label,button);$('dictionary-list').append(li);
  });
  $('memory-count').textContent=`修正の記憶：${Object.keys(state.memory).length}語`;
}
$('dictionary-form').onsubmit=event=>{
  event.preventDefault();const raw=$('reading').value.trim().toLowerCase(),value=$('surface').value.trim();
  const error=validateEntry(raw,value);
  if(error){$('dictionary-message').textContent=error;return;}
  if(state.dictionary.length>=500&&!state.dictionary.some(e=>e.raw===raw)){$('dictionary-message').textContent='辞書は500語までです。';return;}
  undo=null;$('undo').disabled=true;state.dictionary=state.dictionary.filter(e=>e.raw!==raw);state.dictionary.push({raw,value});
  save();dictionaryView();preview();$('dictionary-form').reset();$('dictionary-message').textContent='登録しました。';
};
$('forget').onclick=()=>{state.memory={};undo=null;$('undo').disabled=true;save();dictionaryView();preview();status('修正の記憶を消しました。');};
// Capture final state before Safari backgrounding; source is never sent to a conversion API.
window.addEventListener('pagehide',save);
preview();dictionaryView();

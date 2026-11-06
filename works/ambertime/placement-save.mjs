import {migrateRecentLedger,advanceRecentLedger,assertRecentLedger} from './recent-ledger.mjs?v=s2-1';
import {replayDistilleryOperations} from './partner-orders.mjs?v=market-rules-r1&touch=1';
import {initializeCaskSlots,assertCaskSlots,reconcileCaskSlots} from './cask-slots.mjs?v=s1-1';
import {compactFormalGame,expandFormalGame,assertFormalSize,MAX_SESSION_CODE_UNITS} from './save-codec.mjs?v=h1-b2-1';
// Formal and legacy session boundary. The native model owns state validation and replay.
export const LEGACY_SAVE_KEY='sukimastock.ambertime.wholesale.v20';
export const PLACEMENT_SAVE_KEY='sukimastock.ambertime.placement-trial.v1';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
export const requested=search=>new URLSearchParams(search).get('placement')==='1';
export function assertMode(game,enabled){
 assert(typeof enabled==='boolean'&&enabled===(game?.placement?.version===1),'この保存は別の方式のものです。元の記録を残して停止しています。');
 return game;
}
const sessionKeys=['version','game','userPaused','elapsed'];
const migrateLedger=game=>migrateRecentLedger(game,{replay:observer=>replayDistilleryOperations(game,observer)});
function parseSession(text,{monthMs,stepMs}={}){
 assert(typeof text==='string'&&text.length<MAX_SESSION_CODE_UNITS,'保存を読み取れません。元の記録は残しています。');
 assert(Number.isInteger(monthMs)&&monthMs>0&&Number.isInteger(stepMs)&&stepMs>0,'時間の設定を確認できません。');
 let session;try{session=JSON.parse(text);}catch{throw Error('保存を読み取れません。元の記録は残しています。');}
 assert(session&&typeof session==='object'&&!Array.isArray(session)&&Object.keys(session).length===(sessionKeys.length+(session.version>=4?1:0)+(session.version===5?1:0))&&sessionKeys.every(k=>Object.hasOwn(session,k))&&(session.version<4||Object.hasOwn(session,'caskSlots'))&&(session.version!==5||Object.hasOwn(session,'recentLedger'))&&[2,3,4,5].includes(session.version)&&session.game?.version===20&&typeof session.userPaused==='boolean'&&Number.isInteger(session.elapsed)&&session.elapsed>=0&&session.elapsed<monthMs&&session.elapsed%stepMs===0,'この保存は開けません。元の記録を残して停止しています。');
 if(session.version>=3)assert(JSON.stringify(session)===text,'新しい保存の形式を確認できません。元の記録を残して停止しています。');
 return session;
}
export function isCompactSession(text){
 try{const session=JSON.parse(text);return [3,4,5].includes(session?.version);}catch{return false;}
}
export function isCurrentSession(text){
 try{return JSON.parse(text)?.version===5;}catch{return false;}
}
export function readSession(text,{enabled,restore,monthMs,stepMs}={}){
 assert(typeof restore==='function','保存を読み取れません。元の記録は残しています。');
 const session=parseSession(text,{monthMs,stepMs});
 assertMode(session.game,enabled);
 const raw=session.version>=3?expandFormalGame(session.game):assertFormalSize(JSON.stringify(session.game));
 const game=restore(raw);
 assertMode(game,enabled);
 const caskSlots=session.version>=4?assertCaskSlots(game,session.caskSlots).slice():initializeCaskSlots(game);
 const recentLedger=session.version===5?assertRecentLedger(game,session.recentLedger):migrateLedger(game);
 return {game,userPaused:session.userPaused,elapsed:session.elapsed,caskSlots,recentLedger};
}
export function serializeSession(game,{userPaused,elapsed,caskSlots=initializeCaskSlots(game),recentLedger=migrateLedger(game)},{serialize,restore,enabled,monthMs,stepMs}={}){
 assert(typeof serialize==='function'&&typeof restore==='function','正式な保存の確認方法がありません。');
 assertMode(game,enabled);
 const raw=assertFormalSize(serialize(game)),compact=compactFormalGame(raw);
 assertCaskSlots(game,caskSlots);assertRecentLedger(game,recentLedger);
 const text=JSON.stringify({version:5,game:compact,userPaused,elapsed,caskSlots,recentLedger});
 // The exact candidate passes the same reader used at startup before any write.
 const restored=readSession(text,{enabled,restore,monthMs,stepMs});
 assert(JSON.stringify(restored.game)===raw&&JSON.stringify(restored.caskSlots)===JSON.stringify(caskSlots)&&JSON.stringify(restored.recentLedger)===JSON.stringify(recentLedger),'保存から戻した記録が一致しません。元の記録を残して停止しています。');
 return text;
}
export function writeCandidate(storage,key,expected,text){
 assert(typeof key==='string'&&(expected===null||typeof expected==='string')&&typeof text==='string','保存の指定を確認できません。');
 assert(storage.getItem(key)===expected,'別の画面で保存が変わりました。元の記録を残して停止しています。');
 storage.setItem(key,text);
 assert(storage.getItem(key)===text,'保存を確認できません。進行を止めています。');
 return text;
}

// Standard play copies a chosen older record into a separate destination.
// Neither source key is a write target, and an existing destination never falls back.
export const FORMAL_SAVE_KEY='sukimastock.ambertime.main.v1';
export const FORMAL_SOURCES=Object.freeze([
 Object.freeze({id:'legacy',key:LEGACY_SAVE_KEY,label:'これまでの記録',enabled:false}),
 Object.freeze({id:'placement',key:PLACEMENT_SAVE_KEY,label:'配分版の記録',enabled:true})
]);
export function formalSources(storage,options){
 return FORMAL_SOURCES.flatMap(source=>{
  const raw=storage.getItem(source.key);if(raw===null)return [];
  try{return [{...source,raw,session:readSession(raw,{...options,enabled:source.enabled}),error:null}];}
  catch(error){return [{...source,raw,session:null,error:error.message}];}
 });
}
export function copyToFormal(storage,source,{policy='listed',prepare,adopt,serialize,encodeSession,...options}={}){
 const known=FORMAL_SOURCES.find(x=>x.id===source?.id&&x.key===source?.key);
 assert(known&&typeof source.raw==='string','引きつぐ記録を確認してください。元の記録は残っています。');
 assert(storage.getItem(FORMAL_SAVE_KEY)===null,'正式版の保存が見つかりました。上書きせず停止しています。再読み込みしてください。');
 const session=readSession(source.raw,{...options,enabled:known.enabled});
 let text=source.raw,destinationGame=session.game;
 if(!known.enabled){
  assert(typeof prepare==='function'&&typeof adopt==='function'&&typeof serialize==='function','引きつぎの準備ができません。元の記録は残っています。');
  const game=adopt(prepare(session.game),policy);destinationGame=game;
  text=JSON.stringify({version:2,game:JSON.parse(serialize(game)),userPaused:session.userPaused,elapsed:session.elapsed});
 }
 if(encodeSession)text=encodeSession(destinationGame,{userPaused:session.userPaused,elapsed:session.elapsed,caskSlots:reconcileCaskSlots(destinationGame,session.caskSlots),recentLedger:advanceRecentLedger(session.game,destinationGame,session.recentLedger)});
 // Validate the exact candidate before storage and before live state is assigned.
 readSession(text,{...options,enabled:true});
 assert(storage.getItem(known.key)===source.raw,'元の記録が別の画面で変わりました。引きつがず停止しています。再読み込みしてください。');
 writeCandidate(storage,FORMAL_SAVE_KEY,null,text);
 // Map notices are UI metadata. Their failure cannot overwrite either game source.
 let mapCopied=false;
 try{const raw=storage.getItem(known.key+'.map-reveal.v1'),meta=JSON.parse(raw),valid=n=>Number.isInteger(n)&&n>=0&&n<=6;
  if(raw!==null&&valid(meta?.shown)&&(meta.version===1||meta.version===2&&valid(meta.announced))&&storage.getItem(FORMAL_SAVE_KEY+'.map-reveal.v1')===null){storage.setItem(FORMAL_SAVE_KEY+'.map-reveal.v1',raw);mapCopied=true;}
 }catch{}
 return {text,mapCopied};
}

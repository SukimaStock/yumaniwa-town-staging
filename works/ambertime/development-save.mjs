import {assertRecall} from './recall/collector.mjs?v=bar-v01-1';
import {assertHistoryRecord} from './history-record.mjs?v=s4-1';
import {assertCaskSlots} from './cask-slots.mjs?v=s1-1';
import {assertRecentLedger} from './recent-ledger.mjs?v=s3-1';
import {compactFormalGame,expandFormalGame,compactLosslessGame,expandLosslessGame,assertFormalSize,MAX_SESSION_CODE_UNITS} from './save-codec.mjs?v=lossless-v1&codec=v03';
import {encodeExactJSON,decodeExactJSON,isLosslessEnvelope} from './lossless-json.mjs?v=lossless-v1&codec=v03';

// One current development format. Historical readers remain research tools only.
export const DEVELOPMENT_SAVE_VERSION=8;
export const SUPPORTED_FORMAL_VERSIONS=Object.freeze([8,9]);
export const FORMAL_SAVE_KEY='sukimastock.ambertime.main.v1';
const keys=['version','game','userPaused','elapsed','caskSlots','recentLedger','historyRecord','recallRecord'];
function require(ok,code,message){if(!ok)throw Object.assign(Error(message),{code});}
function assertMode(game,enabled){require(enabled===true&&game?.placement?.version===1,'invalid-session','この記録は現在の開発版では開けません。');}
export function isCurrentSession(text){try{const value=JSON.parse(text);return value?.version===8||(value?.version===9&&isLosslessEnvelope(value.data,'session'));}catch{return false;}}
export function readSession(text,{enabled,restore,monthMs,stepMs}={}){
 require(typeof text==='string'&&text.length<MAX_SESSION_CODE_UNITS,'invalid-session','記録を読み取れません。');
 let session;try{session=JSON.parse(text);}catch{throw Object.assign(Error('記録を読み取れません。'),{code:'invalid-session'});}
 require(session&&typeof session==='object'&&!Array.isArray(session),'invalid-session','記録を読み取れません。');
 const lossless=session.version===9;
 if(lossless){require(isLosslessEnvelope(session.data,'session'),'unsupported-version','保存の表現に対応していません。');require(JSON.stringify(Object.keys(session))===JSON.stringify(['version','data'])&&JSON.stringify(session)===text,'invalid-session','記録の形式を確認できません。');session=JSON.parse(decodeExactJSON(JSON.stringify(session.data),'session'));}
 require(session.version===DEVELOPMENT_SAVE_VERSION,'unsupported-version','以前の開発版の記録です。新しく始めてください。');
 require(typeof restore==='function'&&Number.isInteger(monthMs)&&monthMs>0&&Number.isInteger(stepMs)&&stepMs>0,'invalid-session','保存の確認方法がありません。');
 require(Object.keys(session).length===keys.length&&keys.every(k=>Object.hasOwn(session,k))&&session.game?.version===20&&typeof session.userPaused==='boolean'&&Number.isInteger(session.elapsed)&&session.elapsed>=0&&session.elapsed<monthMs&&session.elapsed%stepMs===0&&(lossless||JSON.stringify(session)===text),'invalid-session','記録の形式を確認できません。');
 assertMode(session.game,enabled);
 const game=restore(lossless?expandLosslessGame(session.game):expandFormalGame(session.game));
 assertMode(game,enabled);
 const caskSlots=assertCaskSlots(game,session.caskSlots).slice();
 const recentLedger=assertRecentLedger(game,session.recentLedger);
 const historyRecord=assertHistoryRecord(game,session.historyRecord);
 const recallRecord=assertRecall(game,session.recallRecord,historyRecord);
 return {game,userPaused:session.userPaused,elapsed:session.elapsed,caskSlots,recentLedger,historyRecord,recallRecord};
}
export function serializeSession(game,{userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord},{serialize,restore,enabled,monthMs,stepMs,encoding='legacy-v8'}={}){
 require(typeof serialize==='function'&&typeof restore==='function','invalid-session','正式な保存の確認方法がありません。');
 assertMode(game,enabled);
 require(encoding==='legacy-v8'||encoding==='lossless-v1','invalid-session','保存形式を確認できません。');const lossless=encoding==='lossless-v1';
 const raw=lossless?serialize(game):assertFormalSize(serialize(game));
 assertCaskSlots(game,caskSlots);assertRecentLedger(game,recentLedger);assertHistoryRecord(game,historyRecord);assertRecall(game,recallRecord,historyRecord);
 const logical=JSON.stringify({version:DEVELOPMENT_SAVE_VERSION,game:lossless?compactLosslessGame(raw):compactFormalGame(raw),userPaused,elapsed,caskSlots,recentLedger,historyRecord,recallRecord});
 const text=lossless?JSON.stringify({version:9,data:JSON.parse(encodeExactJSON(logical,'session'))}):logical;
 // Validate exactly what will be written using the same official reader as boot.
 const restored=readSession(text,{enabled,restore,monthMs,stepMs});
 require(JSON.stringify(restored.game)===raw&&JSON.stringify(restored.caskSlots)===JSON.stringify(caskSlots)&&JSON.stringify(restored.recentLedger)===JSON.stringify(recentLedger)&&JSON.stringify(restored.historyRecord)===JSON.stringify(historyRecord)&&JSON.stringify(restored.recallRecord)===JSON.stringify(recallRecord),'invalid-session','保存から戻した記録が一致しません。');
 return text;
}
export function writeCandidate(storage,key,expected,text){
 require(key===FORMAL_SAVE_KEY&&(expected===null||typeof expected==='string')&&typeof text==='string','invalid-session','保存の指定を確認できません。');
 require(storage.getItem(key)===expected,'conflict','別の画面で保存が変わりました。再読み込みしてください。');
 storage.setItem(key,text);
 require(storage.getItem(key)===text,'readback','保存を確認できません。進行を止めています。');
 return text;
}

// Explicit trial boundary only. The native model owns serialization and replay.
export const LEGACY_SAVE_KEY='sukimastock.ambertime.wholesale.v20';
export const PLACEMENT_SAVE_KEY='sukimastock.ambertime.placement-trial.v1';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
export const requested=search=>new URLSearchParams(search).get('placement')==='1';
export function assertMode(game,enabled){
 assert(typeof enabled==='boolean'&&enabled===(game?.placement?.version===1),'この保存は別の方式のものです。元の記録を残して停止しています。');
 return game;
}
export function readSession(text,{enabled,restore,monthMs,stepMs}={}){
 assert(typeof text==='string'&&typeof restore==='function','保存を読み取れません。元の記録は残しています。');
 assert(Number.isInteger(monthMs)&&monthMs>0&&Number.isInteger(stepMs)&&stepMs>0,'時間の設定を確認できません。');
 let session;try{session=JSON.parse(text);}catch{throw Error('保存を読み取れません。元の記録は残しています。');}
 const keys=['version','game','userPaused','elapsed'];
 assert(session&&typeof session==='object'&&!Array.isArray(session)&&Object.keys(session).length===keys.length&&keys.every(k=>Object.hasOwn(session,k))&&session.version===2&&session.game?.version===20&&typeof session.userPaused==='boolean'&&Number.isInteger(session.elapsed)&&session.elapsed>=0&&session.elapsed<monthMs&&session.elapsed%stepMs===0,'この保存は開けません。元の記録を残して停止しています。');
 assertMode(session.game,enabled);
 const game=restore(JSON.stringify(session.game));
 assertMode(game,enabled);
 return {game,userPaused:session.userPaused,elapsed:session.elapsed};
}
export function writeCandidate(storage,key,expected,text){
 assert(typeof key==='string'&&(expected===null||typeof expected==='string')&&typeof text==='string','保存の指定を確認できません。');
 assert(storage.getItem(key)===expected,'別の画面で保存が変わりました。元の記録を残して停止しています。');
 storage.setItem(key,text);
 assert(storage.getItem(key)===text,'保存を確認できません。進行を止めています。');
 return text;
}

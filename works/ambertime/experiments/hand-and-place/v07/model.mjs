// v07 changes one UI route only. All game rules and native records remain v06 C.
import * as Native from '../v06/model.mjs';
import {checksum} from '../../shop-expansion/v01/model.mjs';
export const {F,STORES,recipeText}=Native;
export const VERSION='ambertime-hand-and-place/0.7';
const clone=x=>structuredClone(x),assert=(ok,text)=>{if(!ok)throw Error(text);};
export function create({seed=42,scenario='standard'}={}){const game=Native.create({seed,scenario,mode:'C'});return {game,commands:[],initial:{seed,scenario}};}
export function dispatch(session,action){
 assert(session?.game?.mode==='C'&&Array.isArray(session.commands),'このLabの試遊状態を選んでください。');assert(action&&typeof action.type==='string','操作を確認してください。');const command=clone(action);let result;
 if(command.type==='retail-deliver'){
  // Native reclaim may succeed before delivery validation fails. Work only on a draft.
  const draft=clone(session.game);
  Native.dispatch(draft,{type:'reclaim',lotId:command.lotId,count:command.count});
  result=Native.dispatch(draft,{type:'deliver',lotId:command.lotId,shopId:command.shopId,count:command.count,orderId:command.orderId??null});
  const check=Native.validate(draft);assert(check.ok,'在庫の整合性を確認できないため、渡していません。');
  session.game=draft;result={...result,outcome:'retail-delivered',nativeOutcome:result.outcome,source:'retail'};
 }else result=Native.dispatch(session.game,command);
 session.commands.push(command);return result;
}
export const validate=session=>Native.validate(session.game);
export function exportLog(session){const data={schema:VERSION,initial:clone(session.initial),commands:clone(session.commands),native:Native.exportLog(session.game)};return {...data,checksum:checksum(data)};}
export function replay(log){
 if(log?.schema===Native.VERSION){
  assert(log.initial?.mode==='C','v06のC方式のログを選んでください。A/B方式はv06で再現できます。');
  const game=Native.replay(log);return {game,commands:game.actions.map(({month,...action})=>clone(action)),initial:{seed:game.seed,scenario:game.initialScenario}};
 }
 assert(log?.schema===VERSION,'v07、またはv06のC方式の操作ログを選んでください。');
 const {checksum:hash,...data}=log;assert(checksum(data)===hash,'ログが変更されています。');
 assert(Array.isArray(log.commands),'操作ログを確認してください。');const session=create(log.initial);
 for(const command of log.commands)dispatch(session,command);
 assert(checksum(exportLog(session))===checksum(log),'操作ログと再現結果が一致しません。');return session;
}

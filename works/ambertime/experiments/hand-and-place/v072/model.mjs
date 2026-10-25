// v072 groups one release's allocation choices. Game rules remain the v07/v06 C rules.
import * as Previous from '../v07/model.mjs';
import * as Native from '../v06/model.mjs';
import {checksum} from '../../shop-expansion/v01/model.mjs';
export const {F,STORES,recipeText}=Previous;
export const VERSION='ambertime-hand-and-place/0.72';
const clone=x=>structuredClone(x),assert=(ok,text)=>{if(!ok)throw Error(text);};
export const create=options=>Previous.create(options);
export const validate=session=>Previous.validate(session);
export function dispatch(session,action){
 assert(session?.game?.mode==='C'&&Array.isArray(session.commands),'このLabの試遊状態を選んでください。');
 assert(action&&typeof action.type==='string','操作を確認してください。');
 const command=clone(action),draft={game:clone(session.game),commands:[],initial:clone(session.initial)};let result;
 if(command.type==='allocate-all'){
  const l=draft.game.lots.find(l=>l.id===command.lotId);assert(l,'発売回を選んでください。');
  assert(Number.isInteger(command.retail)&&command.retail>=0,'自家販売に残す本数を0以上の整数で指定してください。');
  assert(Array.isArray(command.deliveries)&&command.deliveries.length<=STORES.length,'渡す店を確認してください。');
  const ids=new Set();let total=command.retail;
  for(const d of command.deliveries){
   assert(d&&STORES.some(n=>n.id===d.shopId)&&!ids.has(d.shopId),'渡す店を重複なく選んでください。');ids.add(d.shopId);
   assert(Number.isInteger(d.count)&&d.count>=0,'今回渡す本数を0以上の整数で指定してください。');total+=d.count;
   const id=d.orderId??null,o=id===null?null:draft.game.orders.find(o=>o.id===id);
   assert(id===null||(o&&o.shopId===d.shopId&&o.status==='open'&&draft.game.shops[d.shopId].orderId===id),'この店の未対応の希望を選んでください。');
  }
  assert(total<=l.stock+l.retail,'手元と未販売分の合計以内で指定してください。');
  const changes=command.deliveries.some(d=>d.count>0)||command.retail!==l.retail;
  if(!changes)return {outcome:'unchanged',lotId:l.id,retail:l.retail,hand:l.stock,deliveries:[],text:'配分は変わっていません。'};
  const difference=command.retail-l.retail,deliveries=[];
  if(difference<0)Previous.dispatch(draft,{type:'reclaim',lotId:l.id,count:-difference});
  if(difference>0)Previous.dispatch(draft,{type:'allocate',lotId:l.id,count:difference});
  for(const n of STORES){const d=command.deliveries.find(d=>d.shopId===n.id);if(d?.count>0)deliveries.push(Previous.dispatch(draft,{type:'deliver',lotId:l.id,shopId:n.id,count:d.count,orderId:d.orderId??null}));}
  const parts=[];if(difference!==0)parts.push(`自家販売を${l.retail}本に`);
  for(const n of STORES){const d=command.deliveries.find(d=>d.shopId===n.id);if(d?.count>0)parts.push(`${n.name}へ${d.count}本`);}
  result={outcome:'allocated-all',lotId:l.id,retail:l.retail,hand:l.stock,deliveries,text:parts.join('、')+(deliveries.length?'届けました。':'変更しました。')};
 }else result=Previous.dispatch(draft,command);
 assert(validate(draft).ok,'在庫の整合性を確認できないため、変更していません。');
 session.game=draft.game;session.commands.push(command);return result;
}
export function exportLog(session){const data={schema:VERSION,initial:clone(session.initial),commands:clone(session.commands),native:Native.exportLog(session.game)};return {...data,checksum:checksum(data)};}
export function replay(log){
 if(log?.schema===Previous.VERSION||log?.schema===Native.VERSION)return Previous.replay(log);
 assert(log?.schema===VERSION,'v072、v07、またはv06のC方式の操作ログを選んでください。');
 const {checksum:hash,...data}=log;assert(checksum(data)===hash,'ログが変更されています。');assert(Array.isArray(log.commands),'操作ログを確認してください。');
 const session=create(log.initial);for(const command of log.commands)dispatch(session,command);
 assert(checksum(exportLog(session))===checksum(log),'操作ログと再現結果が一致しません。');return session;
}

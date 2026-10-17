// QA only: run native checkpoints through the same public player actions.
// This does not import, repair or alter real browser saves.
import * as Current from '../../partner-orders.mjs?v=0.10.2';
export function replayCheckpoint(source,D=Current){
 if(source.origin!==null)throw Error('検証用の新規蒸留所の操作履歴だけを扱います。');
 let s=D.newDistillery(source.seed);
 function progress(n){if(!Number.isInteger(n)||s.still.phase!=='distilling'||n<s.still.distillation.progress)throw Error('検証用の抽出操作が不正です。');let guard=0;while(s.still.distillation.progress<n){if(++guard>100)throw Error('抽出が進みません。');s=D.distillStep(s);}}
 for(const o of source.operations){s=D.endTasting(s);const v=o.value;switch(o.key){
 case 'start':s=D.startDistillation(s);break;
 case 'stop':progress(v);s=D.stopDistillation(s);break;
 case 'fill':s=D.fillBarrel(s,v);break;
 case 'month':if(v?.progress!==null)progress(v?.progress);s=D.tickDistillery(s);break;
 case 'sample':s=D.sampleDistillery(s,v);break;
 case 'choose':s=D.chooseDistillery(s,v.id,v.key);break;
 case 'bottle':s=D.bottleNow(s,v);break;
 case 'price':s=D.setSalePrice(s,v.tier,v.productId);break;
 case 'list':s=D.listBottles(s,v);break;
 case 'accept':s=D.acceptOffer(s,v?.id,v?.termId);break;
 case 'decline':s=D.declineOffer(s);break;
 case 'assign':s=D.assignCask(s,v.id,v.termId);break;
 case 'unassign':s=D.cancelContract(s,v);break;
 case 'order-assign':s=D.assignOrder(s,v);break;
 case 'order-cancel':s=D.cancelOrder(s);break;
 case 'pause-trade':s=D.pauseTrade(s);break;
 case 'resume-trade':s=D.resumeTrade(s);break;
 case 'end-trade':s=D.endTrade(s);break;
 case 'reconcile-trade-start':s=D.reconcileTradeHistory(s);break;
 default:throw Error('検証用の未対応操作 '+o.key);
 }}
 s=D.endTasting(s);if(source.still.phase==='distilling')progress(source.still.distillation.progress);
 if(source.tastingId!==null)s=D.sampleDistillery(s,source.tastingId);
 D.serializeDistillery(s);return s;
}
export function firstDifference(a,b,path='state'){
 if(Object.is(a,b))return null;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return {path,fixture:a,browser:b};
 const keys=new Set([...Object.keys(a),...Object.keys(b)]);for(const k of keys){const d=firstDifference(a[k],b[k],path+'.'+k);if(d)return d;}return null;
}

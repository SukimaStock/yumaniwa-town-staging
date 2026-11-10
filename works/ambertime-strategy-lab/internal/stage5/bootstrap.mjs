// Independent v8-copy inspection. Never writes storage or constructs fictional events.
import * as D from '../../../ambertime/partner-orders.mjs';
import {readSession} from '../../../ambertime/development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../../../ambertime/economy-parameters.mjs';
const copy=value=>JSON.parse(JSON.stringify(value));
const options={enabled:true,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
// Corruption hint only. raw is retained for exact source comparison; this is not authentication.
function fingerprint(text){let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function bootstrapV8(text,{revision}={}){
 if(typeof revision!=='string'||!revision.trim())throw Error('Explicit source revision required');
 const session=readSession(text,options),game=session.game;
 const releases=game.releases.map(release=>{
  const live=game.core.products.find(product=>product.id===release.productId);
  return {releaseId:release.id,productId:release.productId,release:copy(release),currentProduct:live?copy(live):null,
   stock:live?.stock??null,stockCoverage:live&&Number.isSafeInteger(live.stock)?'complete':'unknown'};
 });
 const ids=new Set(releases.map(r=>r.releaseId));
 const receipts=(game.shop?.deliveries??[]).map(row=>({receipt:copy(row),releaseReference:ids.has(row.releaseId)?'complete':'unknown',consumerSales:'unknown',historicalMethod:'unknown'}));
 return {
  schemaVersion:'ambertime-v8-copy-inspection/1',policyVersion:'conservative-observed-only/1',independent:true,eligibleForRuntime:false,
  source:{revision,fingerprint:fingerprint(text),fingerprintKind:'non-authenticating-exact-raw-retained',raw:text,formalVersion:8,month:game.core.month,operationCount:game.operations.length},
  current:{core:copy(game.core),brands:copy(game.brands),releases,shop:copy(game.shop??null),trade:copy(game.trade??null),generations:copy(game.generations??null)},
  observed:{deliveryReceipts:receipts,historyRecord:copy(session.historyRecord)},
  protected:{town:copy(game.labConnection??null),recallRecord:copy(session.recallRecord)},
  // A source-history cursor is not an incremental-model transaction cursor.
  transactionCursor:null,
  coverage:{currentCore:'complete',currentGameProjection:'partial',releaseIdentities:'complete',observedDeliveryReceipts:'complete',historicalDeliveryTimeline:'partial',consumerSales:'unknown',historicalDeliveryMethods:'unknown',chosenDialogue:'unknown',actualDisplayedDialogue:'unknown',provenance:'partial',town:'opaque-preserved',recalls:'opaque-preserved'},
  unknown:['No inferred customer sell-through for wholesale','No inferred historical delivery method','No invented missing cask or generation provenance','No reconstruction of past chosen/displayed dialogue or cooldown; deterministic history regeneration is not observation','No transaction cursor synthesized from operation count','Absent live product is not proof of zero stock'],
  limitations:['Not an executable replacement game state','Source revision is an external string label, not the persistence contract integer revision; no automatic promotion','Full original v8 copy is retained; this projection is not save compression','Town and recall remain formal opaque facts; no receipt regeneration','Partial legacy history is not promoted to complete coverage']
 };
}
export function matchesBootstrapSource(projection,text,revision){return projection?.source?.revision===revision&&projection.source.raw===text&&projection.source.fingerprint===fingerprint(text);}

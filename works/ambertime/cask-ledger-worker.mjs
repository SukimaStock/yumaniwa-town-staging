import * as D from './partner-orders.mjs?v=store-market-main-r1';
import {buildCaskLedger} from './cask-ledger.mjs?v=stage4-r3';

// Validation and full historical replay stay off the rendering thread.
// The caller owns snapshot identity, caching and cancellation.
self.onmessage=({data})=>{
 const requestId=data?.requestId;
 try{
  const {state}=data,manual=D.nearbyComparisonFacts(state,{includeManualSources:true});
  const caskIds=[...new Set([
   ...state.core.casks,...state.core.archive,...(state.records??[]),...(state.releases??[]),
   ...manual.manualSources,...(state.recipeBook?.entries??[]).map(recipe=>recipe.source)
  ].map(cask=>cask.caskId??cask.id).filter(Number.isFinite))];
  const facts=D.nearbyComparisonFacts(state,{caskIds,includeManualSources:true});
  const ledger=buildCaskLedger(state,{facts,replay:observer=>D.replayDistilleryOperations(state,observer)});
  self.postMessage({requestId,ledger});
 }catch{
  self.postMessage({requestId,error:true});
 }
};

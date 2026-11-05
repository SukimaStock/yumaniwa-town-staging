// Offline read-only measurements of the real, public projection paths.
// These are Node data-generation timings, not DOM, worker transfer or Safari timings.
import * as D from '../partner-orders.mjs?v=market-rules-r1';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
import {buildCaskLedger} from '../cask-ledger.mjs';
import {buildDistilleryHistory} from '../distillery-history.mjs';

const count = rows => rows?.length ?? 0;
const uniqueIds = (rows,key) => [...new Set(rows.map(row=>row?.[key]).filter(Number.isFinite))];
const timed = fn => {
  const start = performance.now(),value = fn();
  return {value,ms:performance.now()-start};
};

/**
 * Runs the same release/shop/cask/history data projections as the current UI.
 * Caller supplies a detached parsed formal state. Run benchmarks serially in an isolated
 * process. The query-qualified D import deliberately matches worker imports.
 * Timings include any validation demanded by a path; no validation is skipped.
 * Counts describe source arrays scanned, not measured iteration totals: several
 * paths repeat array scans and clone every historical snapshot during replay.
 */
export async function measureLedger(state) {
  const sources = {
    operations:count(state.operations),releases:count(state.releases),records:count(state.records),
    deliveries:count(state.shop?.deliveries),relations:count(state.shop?.relations),
    currentCasks:count(state.core?.casks),archivedCasks:count(state.core?.archive),
    townEvents:count(state.labConnection?.town?.events),
  };
  const rows = [...(state.releases??[]),...(state.records??[])];
  const releaseFacts = timed(()=>D.nearbyComparisonFacts(state,{
    productIds:uniqueIds(rows,'productId'),caskIds:uniqueIds(rows,'caskId'),
  }));
  const release = timed(()=>buildReleaseLedger(state,{facts:releaseFacts.value}));
  const shops = timed(()=>buildShopLedger(state));

  // Exactly the cask worker's two validated fact-accesses and cold replay.
  const caskStart = performance.now();
  const manual = timed(()=>D.nearbyComparisonFacts(state,{includeManualSources:true}));
  const caskIds = [...new Set([
    ...(state.core?.casks??[]),...(state.core?.archive??[]),...(state.records??[]),
    ...(state.releases??[]),...manual.value.manualSources,
    ...(state.recipeBook?.entries??[]).map(recipe=>recipe.source),
  ].map(cask=>cask?.caskId??cask?.id).filter(Number.isFinite))];
  const caskFacts = timed(()=>D.nearbyComparisonFacts(state,{caskIds,includeManualSources:true}));
  const casks = timed(()=>buildCaskLedger(state,{
    facts:caskFacts.value,replay:observer=>D.replayDistilleryOperations(state,observer),
  }));
  const caskTotalMs = performance.now()-caskStart;
  const history = timed(()=>buildDistilleryHistory(state));

  // Match recipeRows() identity coalescing, and yearly history UI pagination.
  const recipes = new Set([
    ...casks.value.recipes.saved,...casks.value.recipes.unsaved,
    ...(casks.value.recipes.latestManual?[casks.value.recipes.latestManual]:[]),
  ].map(row=>row.caskId).filter(Number.isFinite));
  const years = new Map();
  for(const event of history.value.events){
    const year = Math.floor(event.month/12);
    years.set(year,(years.get(year)??0)+1);
  }
  const established = shops.value.filter(shop=>shop.established);
  return {
    sources,
    timingsMs:{
      releaseFacts:releaseFacts.ms,releaseProjection:release.ms,
      releaseTotal:releaseFacts.ms+release.ms,shopProjection:shops.ms,
      caskManualFacts:manual.ms,caskFacts:caskFacts.ms,
      caskProjectionWithColdReplay:casks.ms,caskWorkerDataTotal:caskTotalMs,
      historyProjectionWithColdReplay:history.ms,
    },
    screens:{
      recipes:{generated:recipes.size,visiblePerPage:Math.min(20,recipes.size),pageSize:20},
      casks:{generated:count(casks.value.casks),visiblePerPage:Math.min(20,count(casks.value.casks)),pageSize:20},
      releases:{generated:count(release.value.entries),visible:count(release.value.entries),pageSize:null},
      shops:{generated:count(shops.value),established:established.length,visiblePerPage:Math.min(20,established.length),pageSize:20},
      shopDetails:established.map(shop=>({id:shop.id,generated:shop.deliveries.length,
        visiblePerPage:Math.min(20,shop.deliveries.length),pageSize:20})),
      history:{generated:count(history.value.events),yearButtons:years.size,pageSize:50,
        years:[...years].map(([year,generated])=>({elapsedYear:year,generated,visiblePerPage:Math.min(50,generated)}))},
      generations:{generated:count(history.value.generations),
        rows:history.value.generations.map(g=>({id:g.id,completed:g.completed,visibleMilestones:count(g.events)}))},
    },
    caveats:[
      'Projection generation only; DOM formatting/painting, postMessage cloning, workers and iPhone Safari are not measured.',
      'Source counts are array cardinalities, not loop iteration counts. Nested scans and snapshots can revisit all prior records for every operation.',
      'Release facts start cold in this process; later cask facts are warm in the same module, unlike a newly created independent UI worker. caskProjectionWithColdReplay is still a full replay.',
      'nearbyComparisonFacts validates and may use its module-local prefix cache; it must not be reported as cold full restoration.',
      'History and cask public observer paths always perform a cold operation replay, independently of validation cache.',
      'Recipes, casks and deliveries paginate after full projection; releases currently render all entries.',
      'UI caches are snapshot/operation keyed and avoid repeated work only while the applicable snapshot remains unchanged.',
    ],
  };
}

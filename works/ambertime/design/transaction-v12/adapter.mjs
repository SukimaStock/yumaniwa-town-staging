// Independent single-tick Lab. Not imported by production; no generic shared-town API.
import {performance} from 'node:perf_hooks';
import {createOwnedTownJournal} from '../town-v11/journal.mjs';
let active = null;
const ABANDON = Object.freeze({kind:'discard-forward-town'});
function plainGraphNodes(value, into=new Set()) {
  if (value===null || typeof value!=='object' || into.has(value)) return into;
  if (!Array.isArray(value) && Object.getPrototypeOf(value)!==Object.prototype)
    throw Error('Bounded Lab requires plain object/array state');
  into.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key!=='string') throw Error('Symbol state property unsupported');
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if (!('value' in descriptor)) throw Error('Accessor state property unsupported');
    plainGraphNodes(descriptor.value,into);
  }
  return into;
}
function assertTownBoundary(state) {
  if (!state?.labConnection?.town) throw Error('Connected town required');
  const town=state.labConnection.town, townNodes=plainGraphNodes(town);
  const {town:unused,...labRest}=state.labConnection;
  const rest={...state,labConnection:labRest};
  // Replacing labConnection during projection must not break cross-root aliases.
  const restNodes=plainGraphNodes(rest);
  if (restNodes.has(state.labConnection)) throw Error('labConnection cross-root alias unsupported');
  for (const object of townNodes) if (restNodes.has(object)) throw Error('Town/current cross-boundary alias unsupported');
}
function projectClone(value,town) {
  const lab=value.labConnection;
  const projection={...value,labConnection:Object.fromEntries(Object.entries(lab).filter(([key])=>key!=='town'))};
  const detached=structuredClone(projection);
  detached.labConnection=Object.fromEntries(Object.keys(lab).map(key=>[key,key==='town'?town:detached.labConnection[key]]));
  return detached;
}
// Called only by the exact cloneReplayState hook. Unhandled inputs use original body.
export function tryForwardClone(value) {
  if (!active || !value || typeof value!=='object' || !value.core || !value.labConnection) return null;
  if (value===active.entry) {
    active.entryCloneCalls++;
    if (active.entryCloneCalls===1) {
      active.trace.push('first-entry-fork'); active.projectedClones++;
      return {value:projectClone(value,active.town)};
    }
    // Crucial: low-funds/generation rollback clones the ORIGINAL plain old state.
    // Do not rewind a single shared proxy and pretend all logical snapshots match.
    active.trace.push('original-state-native-clone'); return null;
  }
  if (value.labConnection.town===active.town) {
    active.trace.push('forward-owned-clone'); active.projectedClones++;
    return {value:projectClone(value,active.town)};
  }
  active.trace.push('unrecognized-full-state-native-clone'); return null;
}
// Fixed source hooks expose phase names only, never tentative model objects.
export function observePhase(name) {
  if (!active) return;
  active.trace.push(name);
  active.hooks[name]?.();
}
export function runTick(tick,input,hooks={}) {
  if (active) throw Error('Nested/concurrent Lab transaction unsupported');
  let t=performance.now();const entry=structuredClone(input);
  const metrics={entryMs:performance.now()-t,trace:[]};
  t=performance.now();assertTownBoundary(entry);metrics.boundaryAuditMs=performance.now()-t;
  t=performance.now();const journal=createOwnedTownJournal(entry.labConnection.town);metrics.townForkMs=performance.now()-t;
  let result,transactionMetrics,discarded=false,context;
  t=performance.now();
  try {
    transactionMetrics=journal.execute(town=>{
      context={entry,town,hooks,entryCloneCalls:0,projectedClones:0,trace:metrics.trace};active=context;
      try {result=tick(entry);hooks.afterTick?.();} finally {active=null;}
      if (result?.labConnection?.town!==town) throw ABANDON;
    },{afterWrite:hooks.afterTownWrite,beforeCommit:hooks.beforeCommit,afterCommit:hooks.afterCommit});
  } catch(error) {
    active=null;if(error!==ABANDON) throw error;discarded=true;
  }
  metrics.tickMs=performance.now()-t;
  // No game or journal object has escaped while work was tentative.
  t=performance.now();
  const output=discarded?structuredClone(result):projectClone(result,journal.snapshot());
  metrics.exitMs=performance.now()-t;
  hooks.beforePublish?.(); // A throw discards the private output; nothing was published.
  return {game:output,metrics:{...metrics,discardedForwardTown:discarded,projectedClones:context?.projectedClones??0,journal:transactionMetrics??null}};
}

// D1 research-only heuristic: NOT a GitHub status check or safety authorization.
// Inputs are immutable, reviewable fact summaries, not PR-authored declarations.
const SYSTEM = /^(?:\.github\/|tools\/|tests\/|data\/|engine\/|scripts\/|CHANGE-|AGENTS\.md|OPERATIONS\.md|index\.html$|style\.css$)/;
const DANGEROUS = /(?:^|\/)(?:package(?:-lock)?\.json|manifest\.(?:json|webmanifest)|service-worker\.[cm]?js|sw\.[cm]?js|work-meta\.js|standalone-export\.json|build[^/]*|export[^/]*)(?:$|\/)/i;
const CONTRACT = /(?:localStorage|sessionStorage|indexedDB|serviceWorker|\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|postMessage|\beval\s*\(|new\s+Function|\bimport\s*\(|\brequire\s*\(|\bWorker\s*\(|\b(?:save|storage|schema|migration|persist|token|auth)\b|https?:\/\/)/i;
const SAME_WORK = /^works\/([a-z][a-z0-9-]{2,48})\/(.+)$/;
const safe = p => typeof p === 'string' && !p.split('/').some(x => !x || x === '.' || x === '..' || x.startsWith('.'));
const unique = x => [...new Set(x)];
// All facts supplied by a trusted Git-data collector; unknown means Protect.
export function classify(change) {
  const escalate = (reason) => ({route:'C',reason,gate:'FULL_REVIEW',confidence:'needs-review'});
  if (!change || !Array.isArray(change.files) || change.files.length === 0) return escalate('NO_VERIFIABLE_DIFF');
  if (change.trustedFacts !== true) return escalate('UNTRUSTED_FACTS');
  if (change.baseIsAncestor !== true || change.exactHead !== true) return escalate('UNVERIFIED_GIT_RELATION');
  if (change.changesProduction === true || change.changesRelease === true) return escalate('RELEASE_BOUNDARY');
  if (change.touchesSharedRuntime === true || change.touchesPersistence === true || change.touchesGameRules === true) return escalate('CONTRACT_OR_GAME_RULE');
  if (change.dependenciesReviewed !== true || change.relevantTestsIdentified !== true) return escalate('INCOMPLETE_REVIEW');
  if (change.files.some(f => !f || !safe(f.path) || !['added','modified','removed','renamed'].includes(f.status))) return escalate('BAD_FILE_RECORD');
  if (change.files.some(f => SYSTEM.test(f.path) || DANGEROUS.test(f.path))) return escalate('PROTECTED_PATH');
  if (change.files.some(f => typeof f.addedText !== 'string' || CONTRACT.test(f.addedText))) return escalate('CONTRACT_SIGNAL_OR_UNKNOWN_CONTENT');
  const ids=unique(change.files.map(f => SAME_WORK.exec(f.path)?.[1] ?? null));
  if (ids.length !== 1 || ids[0] === null) return escalate('MULTI_WORK_OR_OUT_OF_WORK');
  if (change.files.some(f => !['added','modified'].includes(f.status))) return escalate('DELETION_OR_RENAME');
  if (change.isolatedLab === true && change.labEntryWasAbsentAtBase === true &&
      change.files.every(f => f.status === 'added' && f.path.startsWith('works/'+ids[0]+'/'+change.labDirectory+'/')) &&
      typeof change.labDirectory === 'string' && /^[-a-z0-9]+$/.test(change.labDirectory) &&
      change.noExistingEntryPointModified === true && change.noRuntimeReachability === true && change.sameWorkImportsVerified === true &&
      change.noExternalSideEffects === true) {
    return {route:'A',reason:'ISOLATED_NESTED_LAB_CANDIDATE',gate:'SCOPED_LAB_CHECKS',confidence:'candidate'};
  }
  if (change.activeWorkAtBase === true && change.singleWorkOnly === true &&
      change.diffSemanticsReviewed === true && change.noExternalSideEffects === true &&
      change.noContractChange === true) {
    return {route:'B',reason:'SCOPED_ACTIVE_WORK_CANDIDATE',gate:'RELATED_REGRESSION',confidence:'candidate'};
  }
  return escalate('NOT_PROVEN_ISOLATED');
}

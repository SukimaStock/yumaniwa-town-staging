// Explicit replay boundary; v18 and earlier keep their original full-batch operations.
export const PARTIAL_BOTTLING=Object.freeze({version:19,rules:'partial-bottling'});
export const DELEGATION=Object.freeze({version:20,rules:'delegated-distillery'});
export const delegationMode=s=>s?.version===DELEGATION.version&&s.rules===DELEGATION.rules;
export const partialMode=s=>s?.version===PARTIAL_BOTTLING.version&&s.rules===PARTIAL_BOTTLING.rules||delegationMode(s);

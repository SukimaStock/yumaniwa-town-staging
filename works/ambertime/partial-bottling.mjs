// Explicit replay boundary; v18 and earlier keep their original full-batch operations.
export const PARTIAL_BOTTLING=Object.freeze({version:19,rules:'partial-bottling'});
export const partialMode=s=>s?.version===PARTIAL_BOTTLING.version&&s.rules===PARTIAL_BOTTLING.rules;

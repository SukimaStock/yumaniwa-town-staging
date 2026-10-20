import {partialMode} from './partial-bottling.mjs?v=0.40-partial-bottling';
// A recorded execution boundary preserves legacy delegation without retrospective fees.
export const DISTILLER=Object.freeze({version:18,rules:'distiller',hireCost:40,salary:12});
export const staffMode=s=>s?.version===DISTILLER.version&&s.rules===DISTILLER.rules||partialMode(s);

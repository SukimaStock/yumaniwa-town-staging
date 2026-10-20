import {generationMode} from './generations.mjs?v=0.40-partial-bottling';
// An explicit execution boundary keeps v14 and earlier operation replay unchanged.
// Bottled inventory reuses listed: false is storage, true is retail.
export const BOTTLE_STORAGE=Object.freeze({version:15,rules:'bottle-storage'});
export const bottleStorageMode=s=>s?.version===BOTTLE_STORAGE.version&&s.rules===BOTTLE_STORAGE.rules||generationMode(s);

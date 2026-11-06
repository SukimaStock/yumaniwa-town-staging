// Fixed presentation-only examples. Sentence strings are existing debug samples.
// The edition/scenes/event/ids shape is the completed-recall presentation boundary.
import {RECALL_DEBUG_SCENES} from '../recall/debug-scene.mjs';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const EDITION=freeze({generation:2,scenes:[
 {month:336,sentence:RECALL_DEBUG_SCENES[5].sentence,event:{kind:'delivery',ids:{shopId:'town-liquor',brandId:'ishigura'},scene:{kind:'shop',entity:{id:'town-liquor',name:'町の酒店'}}}},
 {month:364,sentence:RECALL_DEBUG_SCENES[2].sentence,event:{kind:'arrival',ids:{regionId:'overseas-food'}}},
 {month:400,sentence:RECALL_DEBUG_SCENES[0].sentence,event:{kind:'bottling',ids:{brandId:'ishigura'}}},
 {month:444,sentence:RECALL_DEBUG_SCENES[4].sentence,event:{kind:'inquiry',ids:{regionId:'national-food'}}}
]});
export const EXAMPLE_NAMES=Object.freeze(['店との関係','町の外への口コミ','過去の酒','問い合わせ']);

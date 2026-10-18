import * as D from '../partner-orders.mjs';
import {advance,fill,resolve} from './brands-helpers.mjs';
export {advance,fill,resolve};
export function twoManualRecipes(){let s=fill(D.newRecipeDistillery(42),{progress:35,type:'refill'});const first=s.core.casks.at(-1).id;s=D.saveRecipe(s,first,'早め');s=advance(s,1);s=fill(s,{progress:85,type:'bourbon'});const second=s.core.casks.at(-1).id;s=D.saveRecipe(s,second,'後半');return {s,first,second};}
// Each retained source is earned by a real manual fill. Real retail receipts
// fund the next batch; no direct editing of balances or operation ledgers.
export function manualCareer(count=25,{saveEach=false}={}){let s=D.newRecipeDistillery(42),first=null;for(let i=0;i<count;i++){s=resolve(s);if(s.generations.active.phase==='review')s=D.handoverGeneration(s,s.generations.active.id);s=fill(s,{progress:65,type:'refill'});const c=s.core.casks.at(-1);first??={caskId:c.id,batchId:c.batchId,month:s.core.month};if(saveEach&&i<64){s=D.saveRecipe(s,c.id);D.serializeDistillery(s);}if(s.generations.active.phase==='review')s=D.handoverGeneration(s,s.generations.active.id);s=advance(s,6);s=D.bottleBranded(s,c.id,i?{brandId:1}:{name:'川霧'});s=D.setSalePrice(s,'low',s.result.productId);s=D.listBottles(s,s.result.productId);if(s.generations.active.phase==='review')s=D.handoverGeneration(s,s.generations.active.id);s=advance(s,6);}return {s,first};}

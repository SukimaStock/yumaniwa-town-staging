import {staffMode} from './distiller.mjs?v=0.19staff';
// Selected manual recipes are observations, not another production model.
export const RECIPE_BOOK=Object.freeze({version:17,rules:'recipe-book',maxEntries:64});
export const recipesMode=s=>s?.version===RECIPE_BOOK.version&&s.rules===RECIPE_BOOK.rules||staffMode(s);
export function selectedUsualRecipe(s){
 const selected=recipesMode(s)?s.recipeBook.entries.find(r=>r.id===s.recipeBook.selectedId):null;
 return selected?structuredClone(selected):s.usual?.recipe?structuredClone(s.usual.recipe):null;
}

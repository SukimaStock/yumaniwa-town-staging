import {sourcePalette as P} from './codea-object-art.mjs';
import {STAFF_ENCOUNTER_TEXT} from './staff-encounter-text.mjs?v=hiring-s2-1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The same 8×18 front-facing silhouette as recall/pixel-scene, on a 16×24
// native canvas. One rect unit is one cell, displayed at exactly 3× (48×72).
// No character identity or simulation data; only apron colors distinguish jobs.
export function staffPortraitCells(kind){
 if(!Object.hasOwn(STAFF_ENCOUNTER_TEXT,kind))return [];
 const cells=[[6,3,4,1,16],[5,4,6,4,12],[5,4,2,1,16],[4,8,8,9,14],
  [5,17,2,4,16],[9,17,2,4,16]];
 const apron=kind==='distill'?11:19;
 cells.push([6,8,1,3,apron],[9,8,1,3,apron],[6,11,4,6,apron],
  [7,12,2,1,kind==='distill'?20:14],[4,13,2,2,12],[10,13,2,2,12]);
 return cells.map(([x,y,w,h,color])=>({x,y,w,h,color:P[color]}));
}
export function staffEncounterMarkup(kind){
 if(!Object.hasOwn(STAFF_ENCOUNTER_TEXT,kind))return '';
 const art=staffPortraitCells(kind).map(c=>`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${c.color}"/>`).join('');
 return `<div class="staff-encounter" data-staff-encounter="${kind}"><svg class="staff-portrait" viewBox="0 0 16 24" width="48" height="72" aria-hidden="true" focusable="false" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${art}</svg><p class="staff-encounter-line">${esc(STAFF_ENCOUNTER_TEXT[kind])}</p></div>`;
}

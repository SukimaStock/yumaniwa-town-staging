import * as M from '../model.mjs';
import {advanceMonthly,createCaskNotes} from '../monthly.mjs?v=0.6';
let state,requestedMonth;
const $=id=>document.getElementById(id);
function reset(){let core=M.distill(M.newGame(42),1);core=M.fillCask(core,'bourbon',10);core=M.fillCask(core,'refill',10);core=M.bottle(core,null);state={core,notesById:Object.fromEntries(core.casks.map(c=>[c.id,createCaskNotes(c)]))};requestedMonth=core.month;$('status').textContent='試料を戻しました';render();}
function render(){const c=state.core;$('state').textContent=JSON.stringify({month:c.month,cash:c.cash,casks:c.casks.map(b=>({id:b.id,age:b.age,litres:b.litres})),stock:c.products[0].stock,revenue:c.totals.revenue,upkeep:c.totals.upkeep,lastMonth:c.lastMonth,tasting:Object.values(state.notesById).some(n=>n.view==='tasting'),decisions:state.decisions??[]},null,2);}
function advance(month){try{const before=state;state=advanceMonthly(state,{expectedMonth:month});$('status').textContent=state===before?'時間は停止中':'月次更新しました';}catch(e){$('status').textContent=e.message;}render();}
$('month').addEventListener('click',()=>{requestedMonth=state.core.month;advance(requestedMonth);});
$('stale').addEventListener('click',()=>advance(requestedMonth));
$('taste').addEventListener('click',()=>{const note=state.notesById[state.core.casks[1].id];note.view=note.view==='tasting'?'watching':'tasting';$('status').textContent=note.view==='tasting'?'試飲中':'試飲を終えました';render();});
$('reset').addEventListener('click',reset);
for(const b of document.querySelectorAll('[data-room]'))b.addEventListener('click',()=>{$('room').textContent=b.dataset.room;});
reset();

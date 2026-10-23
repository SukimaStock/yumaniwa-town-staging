import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),rows=[];
for(const stage of ['baseline','clock','final']){
 const data=JSON.parse(await fs.readFile(new URL(stage+'-results.json',dir),'utf8'));assert.deepEqual(data.errors,[]);
 for(const r of data.results.filter(r=>r.metrics)){
  assert.equal(r.after.month-r.before.month,r.requestedMonths);
  const m=r.metrics,nominal=6000/r.rate*r.requestedMonths,value=(key,field)=>m[key]?.[field]??'';
  rows.push([stage,r.name,r.requestedMonths,r.rate,r.wallMs,nominal,r.requestedMonths?r.wallMs-nominal:'',value('render','n'),value('render','ms'),value('renderProgress','n'),value('validateDistillery','n'),value('validateDistillery','ms'),value('structuredClone','n'),value('structuredClone','ms'),value('save','n'),value('save','ms'),value('scene-draw','n'),value('scene-draw','ms'),value('scene-drawTimeBar','n'),r.cdpDelta.TaskDuration*1000]);
 }
 const h=data.results.find(r=>r.name==='automatic-hidden-resume');assert.equal(h.hiddenBefore.elapsed,h.hiddenAfter.elapsed);assert.equal(h.hiddenBefore.progress,h.hiddenAfter.progress);assert.equal(h.hiddenBefore.month,h.hiddenAfter.month);assert.deepEqual(h.hiddenMetrics,{});
}
await fs.writeFile(new URL('comparison.csv',dir),'stage,case,months,rate,wall_ms,nominal_ms,wall_error_ms,full_render_n,full_render_ms,progress_render_n,strict_validate_n,strict_validate_ms,clone_n,clone_ms,save_n,save_ms,full_canvas_n,full_canvas_ms,timebar_paints_n,cdp_task_ms\n'+rows.map(r=>r.join(',')).join('\n')+'\n');
console.log(JSON.stringify({rows:rows.length,stages:3,hiddenStateUnchanged:true,errors:[]}));

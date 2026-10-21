import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as M from './model.mjs';
const seeds=[20261021,42,7,137,2026,314159,271828,65537],checkpoints=[120,360,720,1200],rows=[],runs=[];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function quiet(s){const major=s.events.filter(e=>['rumor','visit','inquiry','trade','resurface'].includes(e.type));let start=0,result={months:0,start:0,end:0};for(const e of [...major,{month:s.month}]){if(e.month-start>result.months)result={months:e.month-start,start,end:e.month};start=e.month;}return result;}
for(const seed of seeds)for(const policy of M.POLICIES)for(const mode of M.MODES){
 const s=M.create({seed,policy:policy.id,mode:mode.id});
 for(const month of checkpoints){M.advance(s,month);const a=M.summarize(s);rows.push({seed,policy:policy.id,mode:mode.id,month,produced:a.produced,delivered:a.delivered,inventory:a.inventory,counts:a.counts,firstOverseas:a.firstOverseas,discovered:a.discovered.length,handling:a.trading.length,shippedTo:Object.values(s.nodes).filter(n=>n.received>0).length,pendingInterest:a.pendingInterest.length,localRoot:Number(a.localRoot.toFixed(6)),longestMemory:a.longestMemory,quiet:quiet(s)});}
 const log=M.exportLog(s),repeated=M.exportLog(M.advance(M.create(s.initial),1200));if(hash(log)!==hash(repeated)||!log.validation.ok)throw Error('Failed reproducibility or integrity');
 runs.push({seed,policy:policy.id,mode:mode.id,sha256:hash(log),jsonBytes:Buffer.byteLength(JSON.stringify(log)),validation:log.validation,unconvertedInquiries:s.events.filter(e=>e.type==='inquiry'&&!s.trades.some(t=>t.sourceId===e.id)).length,failedOrSkippedTrials:s.attempts.filter(t=>t.skip||t.roll>=t.probability).length});
}
const shortRuns=Array.from({length:32},(_,i)=>{const s=M.advance(M.create({seed:i+1,mode:'chance',policy:'local'}),240);return {seed:i+1,years:20,rumors:s.events.filter(e=>e.type==='rumor').length,firstOverseas:M.summarize(s).firstOverseas};});
const sample=M.advance(M.create(),1200),events=new Map(sample.events.map(e=>[e.id,e]));
function ancestors(e){const chain=[];while(e){chain.unshift(e);e=events.get(e.sourceId);}return chain;}
const oldest=sample.events.filter(e=>e.type==='resurface').sort((a,b)=>b.age-a.age)[0],foreign=sample.arrivals.find(e=>M.NODES.find(n=>n.id===e.to).level==='海外'),rumor=sample.events.find(e=>e.type==='rumor');
const multi=sample.arrivals.find(a=>sample.events.filter(e=>e.sourceId===a.id&&['memory','interest','share'].includes(e.type)).length>=2);
const result={labVersion:M.VERSION,modelVersion:M.MODEL_VERSION,parameters:M.PARAMETERS,seeds,policies:M.POLICIES,modes:M.MODES,checkpoints,rows,runs,shortRuns,defaultSummary:M.summarize(sample),examples:{firstForeign:ancestors(foreign),firstChance:ancestors(rumor),oldestMemory:ancestors(oldest),multipleReactions:multi?[multi,...sample.events.filter(e=>e.sourceId===multi.id)]:[],quiet:quiet(sample)},notes:['Ablation of this model, not parity with v05.','Same production and initial supply; reaction feedback can change destination distribution.','Handling agreements are not purchases. Actual shipment totals are separately conserved.','Full per-run audit JSON is exported in the browser; this file keeps checkpoints, validations, hashes and selected causal excerpts.']};
writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,runs:runs.length,shortRuns:shortRuns.length,sha256:hash(result),default:result.defaultSummary,bytes:Math.max(...runs.map(x=>x.jsonBytes)),noChance20y:shortRuns.filter(x=>!x.rumors).map(x=>x.seed),examples:result.examples},null,2));

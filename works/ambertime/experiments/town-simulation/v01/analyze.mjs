// Stage2: three fixed profiles, two preselected seeds, no search or parameter tuning.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as M from './model.mjs';
export const SEEDS=[20261021,42],PROFILES=['standard','young','long'];
export function quiet(s){
 const events=M.newsEvents(s).filter(e=>!['generation','policy'].includes(e.type));
 let last=0,max=0;for(const e of [...events,{month:s.month}]){max=Math.max(max,e.month-last);last=e.month;}return max;
}
export function compare(){
 return SEEDS.flatMap(seed=>PROFILES.map(product=>{
  const s=M.create({seed,mode:'responses',policy:'mixed',product}),checkpoints=[];
  for(const month of [120,360,1200]){M.advance(s,month);checkpoints.push({month,interested:M.NODES.filter(n=>s.nodes[n.id].firstInterest!==null).map(n=>n.id),trading:M.summarize(s).trading});}
  const summary=M.summarize(s),log=M.exportLog(s),news=M.newsEvents(s),events=new Map(s.events.map(e=>[e.id,e]));
  const rumor=s.events.find(e=>e.type==='rumor'),arrival=rumor?s.arrivals.find(e=>e.sourceId===rumor.id):null;
  const chain=e=>{const list=[];while(e){list.unshift({id:e.id,type:e.type,month:e.month,reason:e.reason,from:e.from,to:e.to,releaseId:e.releaseId});e=events.get(e.sourceId);}return list;};
  return {state:s,result:{seed,product,name:M.productName(product),checkpoints,summary,likedRegions:M.NODES.filter(n=>s.nodes[n.id].firstInterest!==null).map(n=>n.id),settled:M.NODES.filter(n=>s.nodes[n.id].root>=.18&&s.nodes[n.id].interest>=.04).map(n=>n.id),reachedWithoutLiking:M.NODES.filter(n=>s.nodes[n.id].awareness>0&&s.nodes[n.id].firstInterest===null).map(n=>n.id),rawEvents:s.events.length,newsEvents:news.length,maxNewsPerMonth:Math.max(0,...Object.values(Object.groupBy(news,e=>e.month)).map(x=>x.length)),longestQuietMonths:quiet(s),firstNewsMonth:news[0]?.month??null,chanceCount:s.events.filter(e=>e.type==='rumor').length,firstChance:chain(arrival??rumor),tradeExamples:s.trades.slice(0,2).map(chain),newsExamples:news.filter(e=>['arrival','interest','inquiry','trade','rumor'].includes(e.type)).slice(0,8).map(e=>e.reason),validation:log.validation,exportBytes:Buffer.byteLength(JSON.stringify(log)),sha256:createHash('sha256').update(JSON.stringify(log)).digest('hex')}};
 }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const runs=compare();
 writeFileSync(new URL('./stage2-results.json',import.meta.url),JSON.stringify({modelVersion:M.MODEL_VERSION,seeds:SEEDS,profiles:PROFILES,mode:'responses',policy:'mixed',runs:runs.map(x=>x.result)},null,2)+'\n');
 console.log(JSON.stringify(runs.map(({result:r})=>({seed:r.seed,product:r.product,liked:r.likedRegions,settled:r.settled,trading:r.summary.trading,chance:r.chanceCount,first:r.firstNewsMonth,quiet:r.longestQuietMonths,news:r.newsEvents,raw:r.rawEvents,maxNewsMonth:r.maxNewsPerMonth})),null,2));
}

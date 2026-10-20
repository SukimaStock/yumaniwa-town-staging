import fs from 'node:fs';
import crypto from 'node:crypto';
import * as L from './model.mjs';
import * as S from './seasonal.mjs';
const originalBytes=fs.readFileSync(new URL('./results.json',import.meta.url)),original=JSON.parse(originalBytes),seeds=original.grid.seeds,years=[1,2,3,4,5,6];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const countBy=(items,key)=>items.reduce((out,x)=>{const k=key(x);out[k]=(out[k]??0)+1;return out;},{});
const recipe=c=>`${c.stop??c.recipe.stop}/${c.type}`;
const rank=(evaluation,field)=>1+field.filter(r=>r.total>evaluation.total).length;
const awards=(evaluation,field)=>evaluation.judges.filter((j,i)=>j.score>=80&&field.every(r=>j.score>r.judges[i].score)).map(j=>j.id);
const scoreSummary=(c,panel,aggregation)=>{const evaluation=S.evaluate(c,panel,{aggregation}),field=S.rivals().map(r=>S.evaluate(r,panel,{aggregation}));return {evaluation,rank:rank(evaluation,field),awards:awards(evaluation,field)};};
const comparisons=[];
for(const panelMode of ['fixed','rotating'])for(const aggregation of ['mean','median'])for(const recommendations of [false,true]){
 const records=[];
 for(const seed of seeds)for(const year of years){
  const panel=S.panelFor(seed,year,panelMode),rows=original.population.map(c=>({profile:c,...scoreSummary(c,panel,aggregation)})),top=Math.max(...rows.map(r=>r.evaluation.total)),winners=rows.filter(r=>r.evaluation.total===top);
  records.push({seed,year,panel:panel.map(j=>j.id),top,winners:winners.map(r=>({recipe:recipe(r.profile),age:r.profile.age,seed:r.profile.seed})),firstPlaceProfiles:rows.filter(r=>r.rank===1).length,recommendedProfiles:recommendations?rows.filter(r=>r.awards.length).length:0,top12Recipes:countBy([...rows].sort((a,b)=>b.evaluation.total-a.evaluation.total).slice(0,12),r=>recipe(r.profile))});
 }
 const winningRecipes=records.flatMap(r=>r.winners.map(w=>w.recipe));
 comparisons.push({panelMode,aggregation,recommendations,records,winningRecipeCounts:countBy(winningRecipes,x=>x),distinctWinningRecipes:new Set(winningRecipes).size,uniquePanels:new Set(records.map(r=>[...r.panel].sort().join('/'))).size});
}
const strategies=[];
for(const seed of seeds)for(const strategy of L.STRATEGIES)for(const panelMode of ['fixed','rotating'])for(const aggregation of ['mean','median']){
 const session=S.createSeason({seed,strategy:strategy.id,panelMode,aggregation}),records=[];
 for(const year of years){
  const panel=S.panelFor(seed,year,panelMode),rows=session.casks.map(c=>({c,...scoreSummary(c,panel,aggregation)}));
  const ordered=[...rows].sort((a,b)=>b.evaluation.total-a.evaluation.total||a.c.id-b.c.id),selected=ordered[0],awardSelected=[...rows].sort((a,b)=>b.awards.length-a.awards.length||b.evaluation.total-a.evaluation.total||a.c.id-b.c.id)[0];
  records.push({year,panel:panel.map(j=>j.id),overallChoice:selected.c.id,score:selected.evaluation.total,rank:selected.rank,actualRecommendations:selected.awards,recommendationChoice:awardSelected.c.id,recommendationChoiceRank:awardSelected.rank,recommendationsFromOneEntry:awardSelected.awards,potentialCoverageOnly:[...new Set(rows.flatMap(r=>r.awards))]});
 }
 strategies.push({seed,strategy:strategy.id,panelMode,aggregation,interpretation:'Same prepared barrels against different annual panels, without further aging. Unequal initial ages/capital. Potential coverage is not simultaneously received awards.',records,overallChoiceChanges:records.slice(1).filter((r,i)=>r.overallChoice!==records[i].overallChoice).length,recommendationChoiceChanges:records.slice(1).filter((r,i)=>r.recommendationChoice!==records[i].recommendationChoice).length});
}
const chronological=[];
for(const seed of seeds)for(const {id:strategy} of L.STRATEGIES)for(const panelMode of ['fixed','rotating'])for(const consumption of ['none','small']){
 let s=S.createSeason({seed,strategy,panelMode,consumption});const entries=[];
 for(let year=1;year<=4;year++){
  s=S.nextFair(s);const panel=S.fairStatus(s).judges,choice=[...s.casks].sort((a,b)=>S.evaluate(b,panel).total-S.evaluate(a,panel).total||a.id-b.id)[0];
  s=S.enterFair(s,choice.id);const e=s.history.at(-1);entries.push({year,caskId:e.caskId,age:e.age,rank:e.rank,total:e.evaluation.total,recommendations:e.recommendations,consumed:e.consumed,remainingLitres:e.afterLitres});
 }
 chronological.push({seed,strategy,panelMode,consumption,entries,choiceChanges:entries.slice(1).filter((r,i)=>r.caskId!==entries[i].caskId).length,reusedEntries:entries.length-new Set(entries.map(e=>e.caskId)).size,totalConsumed:s.history.reduce((n,h)=>n+(h.consumed??0),0),remainingBottles:s.casks.reduce((n,c)=>n+L.bottles(c),0)});
}
let skipped=S.nextFair(S.createSeason());skipped=S.skipFair(skipped);skipped=S.nextFair(skipped);skipped=S.annualAdvance(skipped,24);
const results={version:'ambertime-contest/0.2',baseline:{commit:'fc32dc96199bf47397a28d7743a3884fb63adb99',originalResultsSha256:hash(originalBytes),profileCount:original.population.length,grid:original.grid,unchangedOriginalScoreParity:original.population.every(c=>JSON.stringify(S.evaluate(c,L.JUDGES))===JSON.stringify(L.judge(c)))},conditions:{seeds,years,judgePool:S.JUDGE_POOL,rivals:S.rivals().map(c=>({recipe:c.recipe,age:c.age,roughness:c.roughness,character:c.character,wood:c.wood})),selection:'One barrel per annual fair. Overall policy maximizes total; alternate recommendation policy maximizes recommendation count, breaks ties by total then serial. No diversity bonus.',recommendation:'Judge score >=80 and strictly higher than each of three fixed rivals.',ranking:'Competition rank 1 + number of strictly higher rival totals, rounded scores; ties share rank.',chronological:'Four years with real 12-month aging between optional fairs. Prepared starting ages differ; no capital, cash, maintenance, turnover or subjective motivation simulation.'},comparisons,strategies,chronological,skipExample:{month:skipped.month,status:S.fairStatus(skipped),history:skipped.history},limits:['Five fixed Gaussian taste preferences, three selected annually. New two preferences are experiment hypotheses, not human tasting evidence.','Winning recipe concentration over 216 immutable profiles is diagnostic; no all-recipe optimum proof.','Recommendations on/off do not alter scores, ranks or overall policy choice. They only add an alternate record and an alternate selection criterion.','Potential award coverage is a union of alternatives, not an award count one entry can receive.','No sampling effect on flavor or score; none/small can change remaining liquid/bottle count but not selected taste under this policy.','Fixed rivals never evolve. No prediction of human entry motivation, next-batch desire or inheritance.','Ages stop at 120 months; sell/replace is needed to continue when any barrel reaches bound.']};
// Compact equivalent conditions rather than storing the same scores six times.
const groupRecords=(records,omit)=>{const grouped=new Map();for(const record of records){const payload={...record};for(const key of omit)delete payload[key];const key=JSON.stringify(payload);if(!grouped.has(key))grouped.set(key,{...payload,conditions:[]});grouped.get(key).conditions.push(omit.map(k=>record[k]));}return [...grouped.values()];};
results.comparisons=comparisons.filter(c=>c.recommendations).map(({recommendations,records,...c})=>({...c,recommendations:{enabled:'recommendedProfiles in each record',disabled:0,scoresAndRanks:'Identical on/off; no bonus or altered selection.'},recordConditionColumns:['seed','year'],records:groupRecords(records,['seed','year'])}));
results.strategies=strategies.map(({records,interpretation,...s})=>({...s,years:records.map(r=>r.year),overallChoices:records.map(r=>r.overallChoice),overallScores:records.map(r=>r.score),overallRanks:records.map(r=>r.rank),overallRecommendationCounts:records.map(r=>r.actualRecommendations.length),recommendationChoices:records.map(r=>r.recommendationChoice),recommendationChoiceRanks:records.map(r=>r.recommendationChoiceRank),recommendationsFromOneEntry:records.map(r=>r.recommendationsFromOneEntry),potentialCoverageOnly:records.map(r=>r.potentialCoverageOnly)}));
results.strategyInterpretation='Same prepared barrels, unchanged age between panels; no equal-capital comparison. All arrays align with years. Potential coverage is union across alternative barrels, not actual awards from the one entry. Panel identities resolve via comparisons conditions.';
results.headlines={chronologicalChoiceChanges:['fixed','rotating'].map(panelMode=>{const runs=chronological.filter(c=>c.panelMode===panelMode&&c.consumption==='small');return {panelMode,runs:runs.length,changes:runs.reduce((n,c)=>n+c.choiceChanges,0),transitionOpportunities:runs.length*3};}),oneEntryRecommendationComparisons:['fixed','rotating'].flatMap(panelMode=>['mean','median'].flatMap(aggregation=>['diverse','repeat'].map(strategy=>{const rows=strategies.filter(s=>s.panelMode===panelMode&&s.aggregation===aggregation&&s.strategy===strategy).flatMap(s=>s.records);return {panelMode,aggregation,strategy,entries:rows.length,entriesWithRecommendation:rows.filter(r=>r.recommendationsFromOneEntry.length).length,totalRecommendations:rows.reduce((n,r)=>n+r.recommendationsFromOneEntry.length,0)};}))),sampleEffect:'none/small selects the same barrel and produces the same scores/ranks in every paired chronological run; liquid/bottle counts can differ.'};
fs.writeFileSync(new URL('./results-v02.json',import.meta.url),JSON.stringify(results)+'\n');
console.log(JSON.stringify({parity:results.baseline.unchangedOriginalScoreParity,comparison:comparisons.filter(c=>c.recommendations).map(c=>({panel:c.panelMode,aggregation:c.aggregation,uniquePanels:c.uniquePanels,winningRecipes:c.winningRecipeCounts})),chronological:chronological.filter(c=>c.consumption==='small').map(c=>({seed:c.seed,strategy:c.strategy,panel:c.panelMode,changes:c.choiceChanges,reused:c.reusedEntries,ranks:c.entries.map(e=>e.rank)}))},null,2));

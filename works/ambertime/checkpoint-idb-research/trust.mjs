// Research decision rules. No interval is adopted as a production default.
export function auditDecision({localIntegrity,prefixBinding,modelMatches,collectorMatches,creatorMatches,migration=false,corruption=false,explicit=false,elapsedOperations=0,elapsedMonths=0,budget={}}){
 if(!localIntegrity||!prefixBinding)return {state:'corrupt-or-invalid',action:'reject-and-recover',fullReplay:true};
 if(!modelMatches||!collectorMatches||!creatorMatches)return {state:'expired',action:'full-replay-and-rebuild',fullReplay:true};
 if(migration||corruption||explicit)return {state:'audit-required',action:'independent-full-replay',fullReplay:true};
 const operationDue=Number.isFinite(budget.operations)&&elapsedOperations>=budget.operations,monthDue=Number.isFinite(budget.months)&&elapsedMonths>=budget.months;
 if(operationDue||monthDue)return {state:'audit-due',action:'independent-full-replay',fullReplay:true};
 return {state:'local-consistency-only',action:'conditional-partial-restore',fullReplay:false,guarantee:'Creator path trust; local receipts and self hashes are not authentication or independent prefix replay.'};
}
export function assessAuditCadence({restoreCount,fullReplayMs,candidateIntervals}){
 return candidateIntervals.map(interval=>({interval,independentAudits:Math.ceil(restoreCount/interval),projectedAuditMs:Math.ceil(restoreCount/interval)*fullReplayMs,measured:false,note:'Arithmetic cost projection; interval is not adopted and does not strengthen local data authentication.'}));
}

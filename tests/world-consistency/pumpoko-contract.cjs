'use strict';
const {rule,guard}=require('./timeline-audit.cjs');
module.exports=[
 guard('SEED_CONSERVATION',s=>s.mode==='journey',s=>s.travelling+s.arrived+s.lost===s.total,'seed identities not conserved'),
 guard('NO_PREMATURE_RESOLUTION',s=>s.resolved,s=>s.travelling===0,'result committed while travelling seeds remain'),
 guard('RESULT_EQUALS_ARRIVALS',s=>s.resolved,s=>s.resultCount===s.arrived,'arrivals and result differ'),
 rule('ARRIVALS_MONOTONIC',(s,p)=>p&&s.session===p.session&&s.mode==='journey'&&p.mode==='journey'&&s.arrived<p.arrived?'arrivals decreased in one run':null),
 rule('RESULT_STABLE',(s,p)=>p&&s.session===p.session&&p.resolved&&s.mode==='journey'&&(!s.resolved||p.resultCount!==s.resultCount)?'resolved result changed':null),
 guard('RESET_AT_TITLE',s=>s.event==='return-title',s=>s.mode==='prologue'&&!s.resolved&&s.arrived===0&&s.lost===0&&s.growthComplete===false,'finished run leaked into title'),
 guard('FRESH_NEXT_JOURNEY',s=>s.event==='second-journey',s=>s.mode==='journey'&&s.arrived===0&&s.lost===0&&s.total===9&&!s.resolved,'new run inherited results'),
 rule('END_BEFORE_RESET',(s,p)=>p&&s.event==='return-title'&&(!p.growthComplete||p.mode!=='journey')?'title returned before growth finished':null)
];

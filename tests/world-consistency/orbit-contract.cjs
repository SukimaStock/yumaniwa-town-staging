'use strict';
const {rule,guard,stableOn}=require('./timeline-audit.cjs');
module.exports=[
 guard('NO_PENDING_DECODED_OVERLAP',()=>true,s=>!s.pending.some(id=>s.decoded.includes(id)),'packet both pending and decoded'),
 guard('INTERPRETED_DISCOVERED',()=>true,s=>s.interpreted.every(id=>Number.isInteger(id)&&id>=1&&id<=s.found),'unknown Echo interpreted'),
 guard('DECODE_BEFORE_ECHO',()=>true,s=>s.found<=s.decoded.length,'Echo count outruns decoded DATA'),
 rule('FOUND_MONOTONIC',(s,p)=>p&&s.found<p.found?'found count fell':null),
 rule('SERA_NO_PREMATURE_DECODE',(s,p)=>p&&s.event==='SERA-recovery'&&(s.found!==p.found||JSON.stringify(s.decoded)!==JSON.stringify(p.decoded))?'SERA decoded without HOME':null),
 guard('CARRY_SURVIVES_HOME',s=>s.event==='HOME-before-analysis',s=>s.pending.length>0,'carried DATA vanished'),
 rule('PENDING_ACCOUNTED',(s,p)=>p&&p.pending.some(id=>!s.pending.includes(id)&&!s.decoded.includes(id))?'pending packet vanished':null),
 stableOn('ARCHIVE_REPLAY_INERT','archive-replay',['pending','decoded','found','read','interpreted','data'])
];

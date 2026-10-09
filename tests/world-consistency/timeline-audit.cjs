'use strict';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function auditTimeline(frames,rules){
 if(!Array.isArray(frames)||frames.length<2)return [{step:0,rule:'TRACE_LENGTH',message:'At least two snapshots required'}];
 const findings=[];
 for(let i=0;i<frames.length;i++)for(const rule of rules){
  let message;
  try{message=rule.check(frames[i],i?frames[i-1]:null,i,frames)}
  catch(error){message='Audit contract failure: '+error.message}
  if(message)findings.push({step:i,event:frames[i].event,rule:rule.id,message});
 }
 return findings;
}
const rule=(id,check)=>({id,check});
const guard=(id,when,check,message)=>rule(id,s=>when(s)&&!check(s)?message:null);
const stableOn=(id,event,fields)=>rule(id,(s,p)=>p&&s.event===event&&fields.some(k=>!equal(s[k],p[k]))?'Read-only event modified '+fields.filter(k=>!equal(s[k],p[k])).join(', '):null);
module.exports={auditTimeline,rule,guard,stableOn};

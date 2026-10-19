// Replayable public-model fixtures. No balances, flavor profiles or saved fields are patched.
import {compactFixture} from './compact-fixtures.mjs';
import * as D from '../partner-orders.mjs';
import * as B from './brands-helpers.mjs';
export async function roomFixture(kind='empty') {
 if(['full','tasting','bottle','rich','generation','destination','legacy','ready'].includes(kind)) return compactFixture(kind);
 let s=D.newStaffDistillery(42);
 if(kind==='progress'||kind==='fill'){
  s=D.startDistillation(s);
  while(s.still.distillation.progress<65)s=D.distillStep(s);
  if(kind==='fill')s=D.stopDistillation(s);
 }else if(kind.startsWith('age-')){
  const age=Number(kind.slice(4));
  if(age>=72)for(let j=0;j<8;j++){s=B.release(s,{age:6,progress:65,type:'refill',tier:'low'});s=B.advance(s,12);}
  s=B.fill(s,{progress:65,type:'bourbon'});s=B.advance(s,1);s=B.fill(s,{progress:65,type:'refill'});s=B.advance(s,Math.max(0,age-2));
  if(age>0){s=D.sampleDistillery(s,s.core.casks[0].id);s=D.endTasting(s);s=B.advance(s,1);}
 }
 D.restoreDistillery(D.serializeDistillery(s));
 return JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(s)),userPaused:true,elapsed:0});
}

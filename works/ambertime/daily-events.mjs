// Ambient presentation only: no formal operations, game RNG, session storage, or replay.
import {DAILY_EVENT_TEXT} from './daily-event-text.mjs?v=daily-v01';

export const DAILY_FREQUENCY=6; // approximately one opportunity per six completed months
const seasonFor=month=>{
  const calendarMonth=month%12+1;
  return calendarMonth>=3&&calendarMonth<=5?'春':calendarMonth>=6&&calendarMonth<=8?'夏':calendarMonth>=9&&calendarMonth<=11?'秋':'冬';
};
function hash(seed,month,salt){
  let x=(seed>>>0)^Math.imul(month+1,0x9e3779b1)^Math.imul(salt+31,0x85ebca6b);
  x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;
  return x>>>0;
}
function pool(month){
  const season=seasonFor(month);
  return DAILY_EVENT_TEXT.filter(row=>row.season==='いつでも'||row.season===season||row.season==='雨'||row.season==='晴');
}
function rawCandidate(seed,month){
  const choices=pool(month);
  return choices[hash(seed,month,2)%choices.length];
}
export function dailyEventForMonth(seed,month){
  if(!Number.isInteger(seed)||!Number.isInteger(month)||month<1||seed<1||seed>0xffffffff)return null;
  if(hash(seed,month,1)%DAILY_FREQUENCY!==0)return null;
  const choices=pool(month),recent=new Set();
  for(let m=Math.max(1,month-24);m<month;m++){
    if(hash(seed,m,1)%DAILY_FREQUENCY===0)recent.add(rawCandidate(seed,m).id);
  }
  const start=hash(seed,month,2)%choices.length;
  let selected=choices[start];
  for(let i=0;i<choices.length;i++){
    const row=choices[(start+i)%choices.length];
    if(!recent.has(row.id)){selected=row;break;}
  }
  return Object.freeze({id:`daily:${month}:${selected.id}`,kind:'ambient',eventId:selected.id,month,text:selected.text});
}
// Called strictly after a successful month transition. Never persist an unseen candidate.
export function addDailyEvent(events,before,after,{allow=true}={}){
  if(!allow||!Array.isArray(events)||!before?.core||!after?.core||
     before.seed!==after.seed||after.core.month!==before.core.month+1)return events;
  const daily=dailyEventForMonth(after.seed,after.core.month);
  return daily?[...events,daily]:events;
}

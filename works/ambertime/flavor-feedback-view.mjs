// Disposable presentation over existing facts. No replay, validation, clone,
// new comments, chemistry, timers, notifications or persistent read markers.
import {customerComments,productTitle} from './player-news.mjs?v=0.25.4';
import {shortChange} from './tasting-view.mjs?v=stage4-r2';
import {uiText} from './ui-text.mjs?v=stage4-r2';
const comparable=p=>p&&['character','wood','roughness'].every(k=>Number.isFinite(p[k]));
export function createFeedbackComments(read=customerComments){
 let key=null,rows=[];
 return {reset(){key=null;rows=[];},read(game){
  const receipts=game.labConnection?.town?.shipments??[];
  // Month/receipts/releases/brand names change the displayed facts; an
  // extraction position does not. Load starts fresh; reset explicitly clears.
  const next=JSON.stringify([game.seed,game.core.month,receipts.length,receipts.at(-1)?.id,game.releases?.length,game.brands?.map(b=>[b.id,b.name])]);
  if(next!==key){rows=read(game);key=next;}return rows;
 }};
}
export function commentExcerpt(game,comment){
 const prefix=productTitle(game,comment.releaseId)+'の';
 return comment.text.startsWith(prefix)?comment.text.slice(prefix.length):comment.text;
}
// Three game months: the recorded month and the following two. Pausing or
// backgrounding pauses the game month too; no wall-clock timer/read marker.
export const FEEDBACK_MONTHS=3;
const recent=(game,month)=>Number.isInteger(month)&&month>=0&&month<=game.core.month&&game.core.month-month<FEEDBACK_MONTHS;
const tieOrder=(a,b)=>a<b?-1:a>b?1:0;
const newest=(a,b)=>b.month-a.month||b.priority-a.priority||tieOrder(a.tie,b.tie);
export function caskFeedback(game,cask){
 const notes=game.notesById?.[cask.id]??{},last=notes.samples?.at(-1),after=last?.age??-1,candidates=[];
 const history=cask.flavor?.history??[];
 for(let i=1;i<history.length;i++){
  const h=history[i],month=Number.isInteger(cask.filledMonth)&&Number.isInteger(h.months)?cask.filledMonth+h.months:null;
  if(!recent(game,month)||typeof h.label!=='string'||!h.label||typeof history[i-1].label!=='string'||h.months<=after||h.months>cask.age||h.label===history[i-1].label)continue;
  candidates.push({kind:'name',age:h.months,month,text:'風味の名前が変わりました。',priority:3,tie:'name:'+i});
 }
 for(const [i,o] of (notes.observations??[]).entries()){
  if(!recent(game,o.month)||!Number.isInteger(o.age)||typeof o.title!=='string'||!o.title||o.age<=after||o.age>cask.age||!['wood','fading','rough','fruit','rounded','loss'].includes(o.eventId))continue;
  candidates.push({kind:'observation',age:o.age,month:o.month,text:uiText(o.title),priority:1,tie:o.eventId+':'+i});
 }
 // The first threshold-crossing month of a cumulative sample delta is not
 // saved. Compare in the context of a recent recorded fact; never invent or
 // renew an onset at core.month. The ordinary tasting comparison is unchanged.
 const anchor=candidates.slice().sort(newest)[0];
 if(anchor&&last&&last.age<cask.age&&comparable(cask)&&comparable(last.profile)){
  const change=shortChange({profile:cask},last);
  if(change!=='味わいの変化はわずか')candidates.push({kind:'sample',age:anchor.age,month:anchor.month,text:'前回から：'+uiText(change),priority:2,tie:'sample:'+anchor.tie});
 }
 const fact=candidates.sort(newest)[0];
 return fact?{...fact,caskId:cask.id}:null;
}
export function warehouseFeedback(game){
 return (game.core.casks??[]).map(c=>caskFeedback(game,c)).filter(Boolean)
  .sort((a,b)=>b.month-a.month||b.priority-a.priority||a.caskId-b.caskId||tieOrder(a.tie,b.tie))[0]??null;
}

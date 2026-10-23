// Disposable presentation over existing facts. No replay, validation, clone,
// new comments, chemistry, timers, notifications or persistent read markers.
import {customerComments,productTitle} from './player-news.mjs?v=adjust-a-r1';
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
export function caskFeedback(game,cask){
 const notes=game.notesById?.[cask.id]??{},last=notes.samples?.at(-1),after=last?.age??-1,candidates=[];
 const history=cask.flavor?.history??[];
 for(let i=1;i<history.length;i++){
  const h=history[i];if(!Number.isInteger(h.months)||typeof h.label!=='string'||!h.label||typeof history[i-1].label!=='string'||h.months<=after||h.months>cask.age||h.label===history[i-1].label)continue;
  candidates.push({kind:'name',age:h.months,month:Number.isInteger(cask.filledMonth)?cask.filledMonth+h.months:null,text:'風味の名前が変わりました。',priority:3});
 }
 for(const o of notes.observations??[]){
  if(!Number.isInteger(o.age)||typeof o.title!=='string'||!o.title||o.age<=after||o.age>cask.age||!['wood','fading','rough','fruit','rounded','loss'].includes(o.eventId))continue;
  candidates.push({kind:'observation',age:o.age,month:o.month,text:uiText(o.title),priority:1});
 }
 if(last&&last.age<cask.age&&comparable(cask)&&comparable(last.profile)){
  const change=shortChange({profile:cask},last);
  if(change!=='味わいの変化はわずか')candidates.push({kind:'sample',age:cask.age,month:game.core.month,text:'前回から：'+uiText(change),priority:2});
 }
 const fact=candidates.sort((a,b)=>b.age-a.age||b.priority-a.priority)[0];
 return fact?{...fact,caskId:cask.id}:null;
}
export function warehouseFeedback(game){
 return (game.core.casks??[]).map(c=>caskFeedback(game,c)).filter(Boolean)
  .sort((a,b)=>(b.month??-1)-(a.month??-1)||b.priority-a.priority||a.caskId-b.caskId)[0]??null;
}

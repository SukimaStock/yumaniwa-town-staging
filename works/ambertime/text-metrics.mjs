// Misaki Gothic2nd uses natural7-dot digits. Text shares size and baseline.
export const BODY_SIZE=20;
export function pixelTypography(size,unit,misaki=true){
 const pixels=Math.max(8,Math.round(size*unit/8)*8);
 return {unit,pixels,numberPixels:pixels,numberDrop:0,logical:pixels/unit};
}
export function textRuns(value){return String(value).split(/([0-9]+(?:[.,][0-9]+)*)/u).filter(Boolean).map(text=>({text,number:/^[0-9]/u.test(text)}));}
// Keep a number with its displayed unit/currency when wrapping, without changing text.
const quantities=/([£]?\d[\d,.]*(?:[ \u00a0]*(?:[/／](?:本|仕込み|回|月)|L|％|%|本|年(?:\d+か月)?|か月|月|代|たる))?)/gu;
export function textPieces(value){return String(value).split(quantities).filter(Boolean).flatMap(text=>/^[£]?\d/u.test(text)?[text]:Array.from(text));}
export function numberMarkup(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){return /\d/u.test(n.data)&&!n.parentElement.closest('input,textarea,select,option,script,style,svg,.ui-number,.ui-quantity,.pixel-icon')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}}),nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const fragment=document.createDocumentFragment();for(const piece of String(node.data).split(quantities).filter(Boolean)){if(!/^[£]?\d/u.test(piece)){fragment.append(document.createTextNode(piece));continue;}const group=document.createElement('span');group.className='ui-quantity';for(const run of textRuns(piece)){if(!run.number)group.append(document.createTextNode(run.text));else{const span=document.createElement('span');span.className='ui-number';span.textContent=run.text;group.append(span);}}fragment.append(group);}node.replaceWith(fragment);}
}

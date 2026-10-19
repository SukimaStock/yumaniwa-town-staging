// Presentation-only natural glyph sizes. Original Misaki digits are5dots tall,
// Japanese glyphs7dots tall; no glyph outlines, strings or aspect ratios change.
export const BODY_SIZE=20;
export function pixelTypography(size,unit,misaki=true){
 const pixels=Math.max(8,Math.round(size*unit/8)*8);
 return {unit,pixels,numberPixels:misaki?Math.round(pixels*7/5/8)*8:pixels,numberDrop:misaki?pixels/8:0,logical:pixels/unit};
}
export function textRuns(value){return String(value).split(/([0-9]+(?:[.,][0-9]+)*)/u).filter(Boolean).map(text=>({text,number:/^[0-9]/u.test(text)}));}
export function numberMarkup(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){return /\d/u.test(n.data)&&!n.parentElement.closest('input,textarea,select,option,script,style,svg,.ui-number,.pixel-icon')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}}),nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const fragment=document.createDocumentFragment();for(const run of textRuns(node.data)){if(!run.number)fragment.append(document.createTextNode(run.text));else{const span=document.createElement('span');span.className='ui-number';span.textContent=run.text;fragment.append(span);}}node.replaceWith(fragment);}
}

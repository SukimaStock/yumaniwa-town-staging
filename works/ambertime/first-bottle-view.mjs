// A5 presentation only: the formal first brand is still committed by bottleBranded.
import {IDENTITY_BOTTLES,IDENTITY_LABELS,bottleShape} from './brand-identity.mjs?v=0.58-first-brand';
import {bottles,codeaBottle} from './codea-object-art.mjs?v=0.62-bottle-shelf-wall';

// The label layer is derived from exactly the same Codea matrices and color
// exceptions as codeaBottle. Never author a second bottle silhouette.
export function firstBottleLabelCells(brand){
 const shape=bottleShape(brand),rows=bottles[shape];
 const result=[];
 for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){
  const index=rows[y][x];
  if(index===6||index===7||shape==='fancy'&&(x===5&&y===6||x===7&&y>=5&&y<=7))result.push([x,y]);
 }
 return result;
}
export function firstBottleLabelLayer(brand){
 const color=IDENTITY_LABELS.find(label=>label.id===brand?.label)?.color??IDENTITY_LABELS[0].color;
 const cells=firstBottleLabelCells(brand);
 return '<svg class="first-bottle-label-svg" width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'+cells.map(([x,y])=>'<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+color+'"/>').join('')+'</svg>';
}
export function firstBrandEditor(draft,{art,esc,button,error}){
 const bottleChoices=IDENTITY_BOTTLES.map(item=>button(
  '<span class="first-brand-choice-art" aria-hidden="true">'+art({...draft,bottle:item.id})+'</span><span>'+esc(item.name.replace(/ビン$/,''))+'</span>',
  'brand-bottle',item.id,'aria-pressed="'+(draft.bottle===item.id)+'" aria-label="'+esc(item.name)+'"'
 )).join('');
 const labelChoices=IDENTITY_LABELS.map(item=>button(
  '<span class="first-brand-swatch" aria-hidden="true" style="background-color:'+item.color+'"></span><span>'+esc(item.name)+'</span>',
  'brand-label',item.id,'aria-pressed="'+(draft.label===item.id)+'"'
 )).join('');
 return '<section class="first-brand" aria-label="最初のブランドを決める">'+
  '<div class="first-brand-preview"><div class="first-brand-preview-bottle" aria-hidden="true">'+art(draft)+'</div><output id="first-brand-preview-name" for="brand-name">'+esc(draft.name.trim())+'</output></div>'+
  '<fieldset><legend>ビンの形</legend><div class="brand-bottles">'+bottleChoices+'</div></fieldset>'+
  '<fieldset><legend>ラベル</legend><div class="brand-labels">'+labelChoices+'</div></fieldset>'+
  '<label for="brand-name">ブランド名</label>'+
  '<input id="brand-name" type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-describedby="brand-name-error" value="'+esc(draft.name)+'">'+
  '<p id="brand-name-error" role="status">'+esc(error(draft.name))+'</p></section>';
}
export function firstBottleCompletion(brand,productId,priceTier,{esc},staticDone=false){
 const shape=bottleShape(brand);
 // The unlabeled asset keeps the original glass, cap and silhouette; the
 // separate label pixels slide into their exact final Codea grid cells.
 const bare=codeaBottle(shape,{label:null,priceTier});
 return '<section class="first-bottle-complete"'+(staticDone?' data-static="true"':'')+' aria-label="最初の一本が完成">'+
  '<button type="button" class="first-bottle-proceed" data-action="first-bottle-proceed" data-id="'+productId+'" aria-label="'+esc(brand.name)+'。完成したビンをタップして販売室へ進む">'+
   '<span class="first-bottle-assembly" aria-hidden="true">'+
    '<span class="first-bottle-base">'+bare+'</span>'+
    '<span class="first-bottle-label">'+firstBottleLabelLayer(brand)+'</span>'+
   '</span>'+
   '<span class="first-bottle-finished-name">'+esc(brand.name)+'</span>'+
   '<span class="first-bottle-tap-hint">ビンをタップ</span>'+
  '</button></section>';
}

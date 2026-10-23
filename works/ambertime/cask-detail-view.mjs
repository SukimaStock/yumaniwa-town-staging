import {flavorTypeView} from './flavor-types.mjs?v=stage4-r2';
import {flavorMeter} from './flavor-view.mjs?v=start-map-ui-r1';
import {uiText} from './ui-text.mjs?v=stage4-r2';

// Detail-only presentation: tasting and comparison keep their full descriptions.
export function caskDetailProfile(source){
 return uiText(flavorTypeView(source))+[
  ['character','原酒のかおり'],['roughness','シゲキ・口当たり']
 ].map(([key,label])=>'<section class="tasting-flavor"><h3>'+label+'</h3>'+uiText(flavorMeter(source,key,{strengthOnly:true,label}))+'</section>').join('');
}

import {flavorTypeView} from './flavor-types.mjs?v=stage4-r2';
import {flavorMeter} from './flavor-view.mjs?v=formal-copy-r1';
import {uiText} from './ui-text.mjs?v=stage4-r2';

// Detail-only presentation: tasting and comparison keep their full descriptions.
export function caskDetailProfile(source){
 return uiText(flavorTypeView(source))+[
  ['character','かおり'],['roughness','シゲキ']
 ].map(([key,label])=>'<section class="tasting-flavor"><h3>'+label+'</h3>'+uiText(flavorMeter(source,key,{strengthOnly:true,hidePhrase:true,label}))+'</section>').join('');
}

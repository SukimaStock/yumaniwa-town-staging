// Finite authored bottle and label variants. No player text enters SVG markup.
export function brandArt(wood=0,brand={}){
 const color=wood>.6?'#946332':wood>.2?'#bb8542':'#ccad6d',slender=brand.bottle==='slender',dark=brand.label==='dark';
 const outline=slender?'M21 16H31V40Q39 45 39 53V107Q39 112 35 112H17Q13 112 13 107V53Q13 45 21 40Z':'M20 16H32V37Q44 42 44 52V107Q44 112 39 112H13Q8 112 8 107V52Q8 42 20 37Z';
 const x=slender?15:10,w=slender?22:32;
 return '<svg viewBox="0 0 52 120" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><ellipse cx="26" cy="114" rx="21" ry="3" fill="#0d1619" opacity=".5"/><rect x="20" y="5" width="12" height="10" rx="2" fill="#94734c"/><path d="'+outline+'" fill="#a9b690" fill-opacity=".12" stroke="#8f9a7d" stroke-width="1.5"/><path d="'+outline+'" fill="'+color+'" fill-opacity=".8"/><rect x="'+x+'" y="66" width="'+w+'" height="25" rx="'+(dark?5:1)+'" fill="'+(dark?'#303e3a':'#d9cba4')+'"/><path d="M20 74H32M20 79H32M23 85H29" stroke="'+(dark?'#d5c098':'#786343')+'" stroke-width="1.5"/><path d="M'+(slender?18:15)+' 49V61M'+(slender?18:15)+' 97V104" stroke="#e2d6a8" opacity=".5" stroke-width="2"/></svg>';
}

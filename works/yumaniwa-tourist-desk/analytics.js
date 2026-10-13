// Same site tracker as town-analytics.js; independent page, no town-runtime hooks.
(function(){
 'use strict';
 if(location.hostname!=='sukimastock.github.io'||!/^\/yumaniwa-town\/works\/yumaniwa-tourist-desk\/(?:index\.html)?$/.test(location.pathname))return;
 if(window.__TOURIST_DESK_ANALYTICS__)return;
 window.__TOURIST_DESK_ANALYTICS__=true;
 window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments);};
 window.plausible.init=window.plausible.init||function(options){window.plausible.o=options||{};};
 // Let the site tracker capture the pageview. Hash navigation is not a new page.
 try{window.plausible.init();const script=document.createElement('script');script.async=true;script.src='https://plausible.io/js/pa-sYe-y0PqpZapFe6FJVlK2.js';document.head.appendChild(script);}catch{}
 function track(name){try{window.plausible(name);}catch{}}
 let touched=false;
 window.trackTouristDeskTouch=function(){if(touched)return;touched=true;track('Tourist Desk Touch');};
 document.addEventListener('click',function(event){
  const a=event.target?.closest?.('a[href]');if(!a||event.defaultPrevented||a.hasAttribute('download'))return;
  try{
   const url=new URL(a.href,location.href);
   if(url.origin!==location.origin||url.pathname!=='/yumaniwa-town/')return;
   if(!url.search||(url.searchParams.get('place')&&['station_plaza','tomogushi_alley_map','leisure_center_map'].includes(url.searchParams.get('place')))||(url.searchParams.get('work')&&['pumpoko','orbit'].includes(url.searchParams.get('work'))))track('Tourist Desk to Town');
  }catch{}
 });
})();

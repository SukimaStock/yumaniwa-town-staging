// Fictional shops on a schematic, south-facing Skopje scene. These are not geo coordinates.
export const places=Object.freeze([
 Object.freeze({id:'cafe',name:'カフェ',kind:'coffee',x:299,y:282,labelX:299,labelY:316,roof:'M276 268 291 254 319 262 305 276Z',roofLight:'M291 254 319 262 305 276 299 262Z',front:'M279 269 305 277V301L279 293Z',side:'M305 277 317 265V289L305 301Z',door:'M290 280 298 282V298L290 296Z',window:'M282 277 287 279V286L282 284Z',awning:'M280 276 304 283 302 289 278 282Z',haloX:298,haloY:294}),
 Object.freeze({id:'bread',name:'パン屋',kind:'bread',x:160,y:478,labelX:198,labelY:487,roof:'M135 464 153 450 187 458 169 472Z',roofLight:'M153 450 187 458 169 472 160 456Z',front:'M138 466 169 473V497L138 490Z',side:'M169 473 185 460V484L169 497Z',door:'M152 478 162 480V495L152 493Z',window:'M141 473 148 475V484L141 482Z',awning:'M138 474 168 481 166 487 135 480Z',haloX:158,haloY:489}),
 Object.freeze({id:'books',name:'本屋',kind:'books',x:322,y:444,labelX:338,labelY:476,roof:'M299 431 315 418 344 426 328 439Z',roofLight:'M315 418 344 426 328 439 323 425Z',front:'M302 433 328 440V464L302 457Z',side:'M328 440 342 428V452L328 464Z',door:'M315 447 323 449V462L315 460Z',window:'M305 442 310 443V450L305 449Z',awning:'M303 440 327 447 325 453 300 446Z',haloX:320,haloY:455})
]);
export function getPlace(id){return places.find(p=>p.id===id)||null;}

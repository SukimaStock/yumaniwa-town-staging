// Session-only opportunity, never a persisted acknowledgement of an unseen offer.
export function createOfferPresentation(){
 let available=true;
 return {available:()=>available,shown:()=>{available=false;},continue:()=>{available=true;},reset:()=>{available=true;}};
}

// Capabilities compose with geometry. Absence of Touch means display/rotation.
import {FEEL_PROFILES} from './response.js?v=0.7.1';
import {validateMotion} from './motion.js?v=0.7.1';
import {validateManipulation} from './manipulation.js?v=0.7.1';
export const SETTINGS=Object.freeze({depth:[.04,.23],radius:[.55,1.9],pressRate:[3,16],pressStiffness:[100,500],pressDamping:[.4,1],restoreStiffness:[100,500],returnDamping:[.4,.98],tapImpulse:[1.8,3.6],holdDelay:[200,700],pullStrength:[.5,1.5],maxPull:[.1,.6],pullRadius:[1,1.9],pullStiffness:[200,600]});
export function validateFeel(feel){
 if(!Object.hasOwn(FEEL_PROFILES,feel?.profile)||!feel.overrides||typeof feel.overrides!=='object'||Array.isArray(feel.overrides))throw new TypeError('Invalid specimen: feel');
 for(const [key,value] of Object.entries(feel.overrides)){
  if(!Object.hasOwn(SETTINGS,key)||!Number.isFinite(value)||value<SETTINGS[key][0]||value>SETTINGS[key][1])throw new TypeError(`Invalid specimen: feel override ${key}`);
 }
}
export function validateBehaviors(data){
 if(data.behaviors===undefined){if(data.schema==='sukima3d-specimen/2')throw new TypeError('Invalid specimen: behaviors');return;}
 const b=data.behaviors;
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['touch','motion','manipulation'].includes(k)))throw new TypeError('Invalid specimen: unsupported behavior');
 if(Object.hasOwn(b,'touch'))validateFeel(b.touch);
 if(Object.hasOwn(b,'motion')){if(b.motion===undefined)throw new TypeError('Invalid specimen: motion settings');validateMotion(data);}
 if(Object.hasOwn(b,'manipulation'))validateManipulation(data);
}
export function touchSettings(data){
 if(data.behaviors===undefined&&data.schema==='sukima3d-specimen/1')return data.feel;
 return data.behaviors&&Object.hasOwn(data.behaviors,'touch')?data.behaviors.touch:null;
}

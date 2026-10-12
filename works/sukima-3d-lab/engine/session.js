// A small fresh-body factory, reusable by other apps without gallery/DOM state.
import {createSpecimen} from './specimen.js?v=0.5.0';
import {TouchBody} from './dynamics.js?v=0.5.0';
import {RotationBody} from './rotation.js?v=0.5.0';
import {touchSettings} from './behaviors.js?v=0.5.0';
export class SpecimenSession {
 select(definition){
  const mesh=createSpecimen(definition),touch=touchSettings(definition),body=touch?new TouchBody(mesh):new RotationBody(mesh);
  if(touch){body.setFeel(touch.profile);Object.assign(body.options,touch.overrides);body.reboundDamping=body.options.returnDamping;}
  body.orientation=definition.display.orientation.slice();
  this.body?.cancel();this.mesh=mesh;this.body=body;this.definition=definition;
  return this;
 }
 clear(){this.body?.cancel();this.body=null;this.mesh=null;this.definition=null;}
}
export {SpecimenSession as TouchSession};

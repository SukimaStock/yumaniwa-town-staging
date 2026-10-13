// A small fresh-body factory, reusable by other apps without gallery/DOM state.
import {createSpecimen} from './specimen.js?v=0.7.1';
import {TouchBody} from './dynamics.js?v=0.7.1';
import {RotationBody} from './rotation.js?v=0.7.1';
import {touchSettings} from './behaviors.js?v=0.7.1';
import {MotionPlayer} from './motion.js?v=0.7.1';
import {ManipulationPlayer} from './manipulation.js?v=0.7.1';
export class SpecimenSession {
 select(definition){
  const mesh=createSpecimen(definition),touch=touchSettings(definition),body=touch?new TouchBody(mesh):new RotationBody(mesh);
  if(touch){body.setFeel(touch.profile);Object.assign(body.options,touch.overrides);body.reboundDamping=body.options.returnDamping;}
  body.orientation=definition.display.orientation.slice();
  const motion=definition.behaviors?.motion?new MotionPlayer(definition):null;
  const manipulation=definition.behaviors?.manipulation?new ManipulationPlayer(definition,motion):null;
  this.body?.cancel();this.motion?.setPlaying(false);this.manipulation?.cancel();this.mesh=mesh;this.body=body;this.motion=motion;this.manipulation=manipulation;this.assembly=manipulation??motion;this.definition=definition;
  return this;
 }
 step(dt){this.body?.step(dt);this.motion?.step(dt);this.manipulation?.step(dt);}
 resetPose(){this.body?.resetPose(this.definition.display.orientation);this.motion?.reset();this.manipulation?.reset();}
 clear(){this.body?.cancel();this.motion?.setPlaying(false);this.manipulation?.cancel();this.body=null;this.mesh=null;this.motion=null;this.manipulation=null;this.assembly=null;this.definition=null;}
}
export {SpecimenSession as TouchSession};

// A small fresh-body factory, reusable by other apps without gallery/DOM state.
import {createSpecimen} from './specimen.js?v=0.4.1';
import {TouchBody} from './dynamics.js?v=0.4.1';
export class TouchSession {
 select(definition){
  const mesh=createSpecimen(definition),body=new TouchBody(mesh);
  body.setFeel(definition.feel.profile);Object.assign(body.options,definition.feel.overrides);body.reboundDamping=body.options.returnDamping;
  body.orientation=definition.display.orientation.slice();
  this.body?.cancel();this.mesh=mesh;this.body=body;this.definition=definition;
  return this;
 }
 clear(){this.body?.cancel();this.body=null;this.mesh=null;this.definition=null;}
}

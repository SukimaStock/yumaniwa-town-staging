// Work-local material presets. Lengths use mesh units, rates use seconds.
// These tune deformation only; rotation damping and settling live in TouchBody.
export const FEEL_PROFILES = Object.freeze({
 HARD: Object.freeze({depth:.145,radius:.78,pressRate:14,pressStiffness:460,pressDamping:.90,restoreStiffness:460,returnDamping:.78,tapImpulse:3.1}),
 SOFT: Object.freeze({depth:.205,radius:1.08,pressRate:4.8,pressStiffness:210,pressDamping:.95,restoreStiffness:185,returnDamping:.68,tapImpulse:2.9}),
 BOUNCY: Object.freeze({depth:.195,radius:.98,pressRate:6.5,pressStiffness:240,pressDamping:.85,restoreStiffness:230,returnDamping:.46,tapImpulse:3.0}),
});
export const DEFAULT_FEEL = 'SOFT';
export function springStep(position,velocity,target,stiffness,dampingRatio,dt) {
 const damping=2*Math.sqrt(stiffness)*dampingRatio;
 velocity+=((target-position)*stiffness-velocity*damping)*dt;
 return [position+velocity*dt,velocity];
}

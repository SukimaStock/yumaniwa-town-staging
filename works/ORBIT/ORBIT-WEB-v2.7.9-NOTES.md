# ORBIT Web v2.7.9 — E.V.E. original motion recovery

Scope: animation-only refinement of the separated E.V.E. voice layer.

- Keeps the v2.7.8 E.V.E. position and compact receive-layer layout.
- Restores the original Codea EveUI entrance timing: 0.4s quad-out fade/slide from roughly 30px above into position.
- Restores the original exit timing: 0.5s quad-in slide back upward while fading out.
- Restores the original speaking flicker rhythm: `sin(time * 15)` at about +/-15%, applied only to the receive hairline rather than the text.
- SYSTEM console remains separate and unchanged.
- No changes to dialogue content, RESTORE, resources, landing, MiniMap, mining FX, DATA timing, or save logic.

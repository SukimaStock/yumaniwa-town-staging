# ORBIT Web v2.7.11

## Landing availability pass

This build changes only landing availability for resource worlds.

- RESTORE-locked SERA / VOX remain visible, physical, and reachable in space, but no longer present a landing opportunity.
- Depleted SERA / VOX / LUMA remain visible and physical, but cannot be landed on again.
- Locked/depleted worlds no longer show the landing marker or receive low-speed landing assist.
- Their gravity and hard-shell collision response remain unchanged, so approaching them still feels like approaching a real world rather than an invisible wall.
- The old `SERA · SIGNAL UNREADABLE · RESTORE Lx` / `VOX · EXTRACTION OFFLINE · RESTORE Lx` flight text was removed. Progression is communicated through world behavior and the quiet hollow marker already used on the MiniMap.
- HOME remains landable at all times.
- Quiet ASTRA worlds remain landable.
- LUMA remains progression-open, as before, until its local fuel reserve is exhausted.
- Added a save migration guard: an older save made while landed on a now-invalid locked/depleted resource world resumes in flight at that physical location instead of restoring an invalid landed state.

No changes were made to RESTORE/Ritual, E.V.E. speech, MiniMap geometry, resource balance, planet visibility, gravity, collision physics, mining FX, or save schema.

# PUMPOKO — source research / authorship experiment

Research baseline: staging/main `936dbc8e5993708853a9fc945c462f8cee201c35`,
observed at task start on 2026-10-01. Production reference:
`53d31cfe98313c87cfc5ffb78e3b4e8cdaed1ca3` (read only).

This is a standalone staging experiment. The author delegated the choice of
concept, title and interaction; town placement/publication are outside this task.

## What was actually read

Google Drive `SukimaStock/Code/` is the original-source archive. Read raw
`CoffeFacrory.txt`, `Orbit.txt` and, from `Code/Rakugaki/`, the Lua in
`Tofu.codea`, `Echo.codea`, `Dust.codea`, `KororinEyes.codea`,
`Shishiodoshi.codea`, `Rainy Window.codea`. Archives were downloaded and Lua
extracted; a file listing or a title was not counted as reading the code.
No note self-analysis was used to set the conclusion.

Web cross-checks: `works/coffee-factory/sketch.js`, `works/orbit/sketch.js`,
`works/midnight-cola/sketch.js`, `works/yakitori-wars/main.js`,
`works/junkissa-dive/sketch.js`, `works/rojiura-masala/sketch.js` and
`balance-config.js`. The canonical New Work Flow, Engine 0.3 contract,
Audio Baseline, `engine/rakugaki-engine.v1.js` and current `_starter` were
read separately as infrastructure, not as evidence of taste.

## Observed numbers, with the limits of the inference

| Source | Executable evidence | What it suggests |
| --- | --- | --- |
| Dust, Lua | Fan angle follows by `.08` per draw. Wind power approaches 2.5 with `.1` while touching, returns to 1 with `.05`. Dust velocity multiplies by `.93`. | The controlled object, its output and the surrounding material have different response rates. |
| KororinEyes, Lua | Friction `.2`, restitution `.5`, rolling friction `.05`; pupils follow with `.15`; squish relaxes with `.15`, surprise size with `.2`. | A moving body contains another slower response; not just a single inertial sprite. |
| Tofu, Lua | Tofu friction `.2`, restitution `.1`, wobble decay `.92`; ginger damping 8/10 versus bonito gravity `.15` and damping 1.5/2. Soy stain width grows by `10*dt`, height by `5*dt`. | Material differences and a trace that keeps changing after impact matter more than generic bounce. |
| Echo, Lua | Ripple speed 2.4, friction `.985`, life falls `.005` per draw. Replies arrive after .5–1.2s or 1–2s, retain 45–65% energy, max depth 2/max ripples 4. | A bounded world response can arrive after the original gesture is finished. |
| Shishiodoshi, Lua | Trigger interpolation `.2`, recovery `.03`; recovering below -9 degrees snaps to -10 and emits a separate contact sound. | The return has its own pace and event; it is not the triggering motion played backwards. |
| Rainy Window, Lua | Stickiness 3.0, fog return .45; streak alpha loses `.45*.1` each update; sliding drop velocity decays `.88`. | Motion may finish while the modified surface still remembers it. |
| ORBIT, Lua → Web | Original landing spring 2.2/damping 1.65 both remain in `ORBIT_TUNE`; settle hold changed .25→.12s. Web open-space drag .9980 differs from Lua ship initialization .996. Steering assist 1.6/s applies only under thrust; release restores drift. | The numerical values were not all frozen. Preserved spring/damping and preserved coasting relationship are stronger evidence than exact port fidelity. |
| CoffeeFactory, Lua → Web | Lua liquid drains during waiting/paused using `maxLevel / waitDuration * dt`; source steam has its own age, lifetime and wobble. Web uses a spring at 3.2Hz/damping .72, workers accelerate at 44/s, finished coffee steam settles over ~1.8s. | The Web implementation adds new mechanics but retains the separation between user scheduling and the continuing process. No claim that the new worker spring was in the original. |
| Midnight Cola, Web | Cap slide .30–.48s, friction `.89^(dt*60)`, boundary bounce .42/final jitter .018. Crown friction .975, bounce .56, spin loss .72, max 2.40s/result hold .82s. | Small loss of control is bounded, and the last position is allowed to have a little individuality. |
| Junkissa Dive, Web | Gravity 980; cherry bounce .68/ground friction .82 versus cream .24/.58. Table bounce multiplies restitution by .42; speed below 42 must persist .42s. Visual angle remains after landing; receipt settle sound is .13s after drop. | Contact, settling and the settled pose are separate beats. |
| Rojiura Masala, Web | Acceleration 15/s, release deceleration 38/s, wall deceleration 44/s. Scent accumulation .62/decay .05 per second, heat scales it .5–1.3. | Some controls should stop briskly. A universal long-inertia rule would misread the author; environmental traces can carry the tail instead. |

Many Lua values are frame based. Their apparent seconds depend on frame rate;
the table intentionally does not pretend all originals share one fixed timing.

## Working hypothesis (an inference, not a universal style law)

Input starts a process but does not own every moment of it. A clear immediate
response gives permission to touch again; the resulting object, its contents,
and its environment settle on different clocks. Some uncertainty comes from
the material, within readable boundaries. Repeated touching changes an existing
situation rather than replacing it with a clean UI response.

This is not a rule to always add inertia, night, pixel art or particles.
Masala's short stopping distance is counter-evidence to a universal slow stop.
Engine lifecycle/input/audio conventions are useful plumbing, not authorship.

## Chosen experiment

A hollow half kabocha is a small vessel. Hold and drag to lean it; loose seeds
roll in its concave interior. Release it: the heavy shell rocks home first,
the contents follow later and sometimes knock against one another. A short
tap excites the shell and the contents differently. The physical arrangement
persists. The next gesture starts there.

The work inherits the separated clocks and material-dependent response, not
an existing game loop, scene, characters, assets, story, exact physics or score.
Warm daylight and smooth cut surfaces were chosen instead of treating night
or pixel art as the author's identity. Original short WAVs use decaying
inharmonic modes/noise; Engine buses start at Audio Baseline 1/1/1.

Internally considered and rejected: cutting/collecting seeds (task completion
would own the interaction), a pumpkin marble course (familiar success/failure
would dominate), and a conventional lantern (light would risk covering weak
physics). The vessel offered both direct manipulation and an independently
continuing internal event.

## Subtraction / iteration record

- No success/failure, timer, inventory, upgrades, result, save, sharing, BGM.
- No particle burst or impact flash is drawn. Contacts are physical and audible.
- No reset button: the next action continues from the current arrangement.
- A single prompt fades after use; the world does not explain its own tail.
- Kept only nine seeds; contact sounds are limited to one strongest event
  per 65ms, preventing contact chatter from becoming a wall of sound.
- The decorative paper grain was moved into one cached layer, so drawing
  texture does not compete with the interaction's frame time.

The hypothesis still needs the author's first touch. A working browser and
passing physics checks do not establish that the authorship experiment succeeded.

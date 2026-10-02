# Jump observation / author review

Only each seed's longest successful forward jump in the current run affects its
own arrived plant. There is no score, sum, average, persistence or lost-seed transfer.
The observer lives in `journey.js`, shared unchanged by game and Builder.

`JUMP` is the single calibration block: top support for 40ms arms observation;
airborne for at least 100ms, a rise of at least 2 world px, and forward travel
beyond 80px are required. Upward terrain support (`ny < -.5`) for 25ms confirms
the first candidate contact; distance uses that first contact, not subsequent
rolling. Loop side/ceiling contact interrupts a free-flight candidate and cannot
confirm success. Initial falls/transition/TEST START must first establish support.
SE speed thresholds and cooldowns are not observation inputs. Observation runs
after fixed-step collision resolution and before END freezes velocity.

The smoothstep from 80 to 360 world px gives richness 0..1. Small hops earn no
extra decoration; baseline plants stay healthy. Current-stage input samples with
rightward tilt `.38, 0` gave successful distances about 81–217px, while forward
and upward `.28, -.28` gave several 361–430px jumps and nine arrivals. These are
input-driven simulations, not measurements of enjoyment; browser input trials
are recorded separately in the PR. The limits cover the current 25px and 230px
gaps without rewarding repeated contact jitter or making distance unbounded.

Both base leaves remain; richness opens/enlarges them by up to 25–28 percent.
Small round grass tufts reveal fixed ID-derived surface positions, with a modest
common baseline tuft and subdued distant hills even without rewards. Above
richness .45, the shared `plantPose` smoothly adds up to 8 percent fruit size.
The same pose keeps its bottom on soil and sets the title reconnection camera.
Neighbour plants/tufts and focused foliage fade with the existing connection.

Normal endings return through growth / rest / central-fruit zoom / title, with
no replay button. Empty runs create no plant: a 2.4-second pause and 1.2-second
blend return to title. Both paths retain the same BGM player. The title waits
for user input; Builder runs retain their PLAY view and RESET/EDIT controls.

## Local verification

From the repository root: `node --test works/pumpoko/test-*.cjs`.
Serve the repository locally and open `works/pumpoko/`.

Explicit visual fixtures: `?dev=1&ending=1&reward=0`, with `ending=1/3/9` and
`reward=0/.5/1`. Counts, IDs and placements match across each comparison;
reward alone is injected. `?dev=1&ending=0` tests the empty return.
These fixtures are not ordinary-input evidence. `PumpkinProbe().jumps` is a
read-only development observation of ID, current flight, latest successful
contact endpoints, longest distance and richness. No such values enter the
ordinary UI, Stage JSON, existing save payloads or Analytics.

`test-jumps.cjs` compares ON/OFF physics at 30/60/120fps, first-contact distance,
per-seed max/no transfer, failure/jitter/cliff/initial fall exclusions, final
farm landing, reset/old JSON, identical slots and enlarged-fruit/title geometry.
Existing gameplay, migration/save, Builder, audio and ending regressions remain.
Audible output and iPhone feel/appearance need author confirmation. A Draft PR
is not a live staging deployment; formal verification state remains UNVERIFIED.

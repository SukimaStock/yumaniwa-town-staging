# ORBIT Web v2.7.5 — ROOT RESTORE FIX / SOURCE FX

## 1. RESTORE architecture: iframe removed completely

Repeated RESTORE could still become a black screen because v2.7.2 only changed
*how* the iframe document was supplied. The lifecycle remained:

HOME -> iframe -> child document -> callback

The original Codea game did not have that boundary. StationUI simply changed
state to Minigame and MiniGameManager drew/handled the ritual in the same app.

v2.7.5 follows that architecture more closely:

HOME Terminal
-> YES
-> persistent in-page `ritualHost`
-> ritual canvas/state
-> completion callback
-> HOME Terminal

There is:
- no iframe
- no srcdoc
- no postMessage
- no second HTML document load
- no ritual document recreation between RESTORE levels

The approved ritual implementation is initialized once and reset for each start.

`restore-ritual.html` remains only as the standalone readable/debug source.

## 2. Planet visuals

The v2.7.4 interpretation that placed ORE/DATA icons directly on planet cores
was removed.

Source behavior restored:
- planet core = color / glow only
- VOX and SERA remain identifiable by their existing world colors
- cockpit HUD retains the colored resource icons

## 3. Mining FX

v2.7.4 streak-style sparks were removed.

Source FXManager behavior restored:
- 10 small circular particles
- spawn position = 20 units outward from landed ship
- random radial speed 25..60
- life = 0.5 sec
- simple downward gravity
- ORE color = warm pale orange
- particle shrinks/fades to zero
- no line streaks / no glow tips

## 4. Pickup feedback

`+3` etc. remains.
No floating resource icon beside the number.
ORE/Data are distinguished only by restrained text color.

## Kept from v2.7.4
- colored ORE/DATA icons in top-right HUD
- integer resource pickup values
- larger UI text
- orange ship plume remains removed
- HOME terminal / RESTORE progression / story / flight unchanged

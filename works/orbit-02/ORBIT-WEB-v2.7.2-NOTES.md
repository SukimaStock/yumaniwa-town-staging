# ORBIT Web v2.7.2 — BUNDLED RESTORE RITUAL

## Evidence from the iPhone black screen

v2.7.1 advanced past the YES confirmation and showed the ritual iframe's dark
shell, but even the ritual document's static `ORBIT / RESTORE` label did not
appear.

That means:
- Terminal -> YES worked.
- `OrbitRitual.start()` worked.
- iframe became visible.
- the external child document itself did not render reliably.

So the remaining fault was not tap timing, HOME state, or the ritual gameplay.
It was the external iframe navigation seam.

## v2.7.2 architecture

`restore-ritual.html` is still kept as the readable/standalone source, but the
entire document is also bundled inside `index.html` at build time.

On RESTORE:
- no request to `restore-ritual.html?...`
- no second-page navigation
- parent decodes the bundled ritual document
- ritual is injected directly with `iframe.srcdoc`
- selected ritual + embedded mode are injected as globals before boot

The child still uses the existing completion postMessage to return to ORBIT.

This removes the local-server request as a failure point while preserving the
approved ritual implementation unchanged.

## Unchanged

- HOME Operations Terminal
- RESTORE button / confirmation UX
- ritual mechanics / visuals / copy
- RESTORE costs and level progression
- one-second launch after disconnect
- cockpit UI / ship scale
- open-universe / resources / Echo / finale

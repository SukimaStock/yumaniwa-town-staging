# ORBIT Web v2.7.1 — DIRECT RITUAL BRIDGE

## What was actually failing

The HOME terminal input path was reproduced separately:

RESTORE SYSTEM -> CONFIRM -> YES

and YES correctly calls `OrbitRitual.start("wake")`.

The approved `restore-ritual.html` was also run independently and correctly
emits `orbit-ritual-ready`.

The fragile seam was between them:

parent starts iframe
-> child sends READY by postMessage
-> parent only then makes iframe opaque / interactive

If READY is missed on iOS/local-server, the ritual document can be loading
while the iframe remains permanently transparent. The player therefore keeps
seeing the CONFIRM window and it looks as if YES did nothing.

## v2.7.1

- `OrbitRitual.start()` makes the iframe visible and interactive immediately.
- Child READY postMessage remains supported but is advisory only.
- iframe `load` is also accepted as a ready fallback.
- `tryBaseRepair()` no longer closes/rejects rituals based on `bridge.ready`.
- RESTORE completion postMessage remains unchanged.
- HOME terminal and source-inspired UI remain unchanged.

This removes the READY handshake as a single point of failure.

## Unchanged

- BASE Operations Terminal flow
- RESTORE costs / rituals / completion logic
- one-second launch after terminal disconnect
- visual scale / cockpit UI
- progression / physics / resources / Echo / finale

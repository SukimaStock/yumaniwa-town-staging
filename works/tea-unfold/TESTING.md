# Prototype validation

Run `node --test works/tea-unfold/tests/model.test.cjs` from the repository root.

Serve the repository root, then open `/works/tea-unfold/`. Canonical SSE 0.3.0
and Codea 1.0.0 are referenced unchanged, so serving only this work directory
without `engine/` is insufficient.

Check a complete 30-second trial, a gentle drag then release, a turn during
asymmetric opening, sound off/on, and replay while running and after completion.
Try a narrow portrait viewport and a desktop viewport. Native controls also
support keyboard focus and activation. Pointer cancellation, background/resume,
and resizing must not leave a held drag or reset/extend the clock.

`TeaUnfold.snapshot()` is read-only diagnostic data, not a state mutation hook.
The timer follows monotonic elapsed time while hidden, but has no background
alarm or notification. On returning, the display catches up. Long gaps are not
fed to the water simulation as a large impulse.

Browser touch emulation is not a physical iPhone Safari test. Device audio,
background suspension and the owner's assessment of feel remain separate checks.
No production release or town/Search registration is part of this prototype.

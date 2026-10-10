# PUMPOKO 02｜Touch and BGM readiness

Fresh base `72c4d3cec9f52a9a03c9036f82293a25ca119425`. Plan Lock committed before all implementation. Staging-only.

- iOS Safari loupe: game canvas selection/callout/drag/contextmenu suppression; existing pointer gestures kept.
- On the first setup, preload music resource and await playability (Engine resource state or media readyState >=3). Keep the title fruit and seed motion playable throughout loading.
- After nine seeds detach, wait on the title rather than launching the opening while BGM is loading. Previously held states and seed pose are not reset; resume ordinary opening when ready.
- Audio unavailable: provide a button to turn music off and continue; explicit mute also permits continuation.
- Existing physics, music file, Engine, stages and production are unchanged.

CI required checks must pass before merge. Real iPhone Safari loupe, slow networking, BGM playback and failure fallback remain UNVERIFIED until device review. Work-local regression should include title-to-opening, four handoffs, goal and repeat.

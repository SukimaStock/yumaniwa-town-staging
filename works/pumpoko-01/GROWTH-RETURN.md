# Visible growth after a late seed — 2026-10-08

Baseline: `pumpoko-momentum-jump-update.zip`. Apply this changed-files-only ZIP
on top of that prototype, keeping the `works/pumpoko/` paths.

Living late seeds still receive the existing camera follow and have unlimited
time to arrive. There is no forced loss, teleport, or change in arrival count.
Early arrivals wait as seeds. The existing growth order begins only after every
seed has arrived or fallen.

When that decision happens with every arrived seed offscreen, the growth and
title clocks now stay at zero while the camera returns. A nearby return takes
2.4 seconds. A distant return gently pulls back for 0.9 seconds, crosses the
route at a readable scale, and comes back in for 0.9 seconds. The overview zoom
is limited to 1.05 on the canonical course, preserving full-height terrain.
Distance determines travel duration, with peak pan speed at most 800 logical
pixels/second and gradual acceleration/deceleration. An extreme 8,000-world-pixel
return takes about 15 seconds; nearby returns remain short. This deliberately
avoids both a tiny floating panorama and a fixed-duration rush across the world.
The view is continuous and all seeds retain their physical positions. Lost
seeds still finish their short falling animation.

After return, the normal shoot/leaf/fruit timing resumes from zero, with all
arrived plants visible. The one-seed result now keeps this returned view rather
than the remote loss location. Normal visible-field arrivals retain the prior
small arrival inertia, camera path, growth timing, Hero Pumpkin and title zoom.

Physics, drag momentum/jump assistance, five-times course, rendering, audio,
Engine and Codea Lite implementation files are unchanged. Only `journey.js`
changes runtime behavior. Existing reward/audio fixtures now place their camera
at the field when testing normal growth; the byte lock is updated for this
intentional camera change. Their original behavioral assertions remain intact.

## Checks

- 12 added cases cover 1/3/8 arrivals plus remote trailer loss at 30/60/120fps;
  no growth during return; all growth visible; bounded projected pan speed and
  acceleration; nearby return; stopped trailer survival and late arrival count;
  zero-time pause; reset; and lost-seed fall completion.
- Existing 35 ending tests pass unchanged, including normal nine-seed glide,
  arrival inertia, single-seed normal view, Hero framing and title connection.
- Full runnable Node suite: 110 entries pass. Historical Stage Data proof and migration
  audit cannot finish without the full Git checkout/history; the Stage Data
  audit's five standalone structural checks pass before that known block.
- Simulation and desktop rendering do not establish iPhone touch feel or
  device animation quality. Check the long-distance pullback on the iPhone.

No repository, PR, merge, push or production deployment was performed.

# v1.2 bounded improvement evaluation

## Evidence supplied by coordinator

Local C median total: 1552 ms; native: 173 ms. Reported component times: entry 125 ms, boundary graph audit 178 ms, journal fork 274 ms, tick 854 ms, exit 137 ms. These component numbers are not independently remeasured here and sum to 1568 ms, not 1552 ms; different medians/measurement samples must not be summed as exact attribution. Across the measured cases C was reported 6–12 times slower with worse RSS.

## One minimal correction considered

Avoid redundant validation work between `assertTownBoundary(entry)` and journal construction: the first scans town to validate plain graph shape, then journal `remember(raw)` scans a detached clone of the same town again. A trusted internal validated-input certificate could permit the second shape validation to be omitted, while keeping journal known-node tracking and the complete cross-boundary alias audit.

This does not remove entry/fork/exit copies, cannot remove the first graph audit, and cannot remove known-node registration without changing adoption semantics. Its actual removable cost is less than the entire 274 ms fork phase (which also includes a town clone and necessary registration). Even an unrealistic elimination of ALL 178 ms audit and ALL 274 ms fork phase would leave roughly 1100 ms versus 173 ms, using total-minus-phases only as a rough upper-bound illustration. Thus this local correction cannot rescue the candidate's adoption decision. No additional runtime variant was implemented or measured. This is a rejection based on bounded upside, not a measured optimized result.

## Why not delete the public entry clone

The initial detached entry is the stable old branch used later by shop evidence and low-funds/generation rollback. Pointing it directly at caller input could be safe only under a stronger audited read-only tick contract and callback/concurrency restrictions. It would no longer meet this Lab's explicit requirement that the old branch itself be fully detached from the caller. The existing tests establish input non-mutation for tested paths; they are not a proof that every native early-exit/helper path is read-only for all accepted states. No such weakening was made.

Moreover deleting the entire measured 125 ms entry phase alone would still leave about 1427 ms, far from native. Entry+exit alone are reported 262 ms, already above native 173 ms, although this is not a universal lower bound for a different architecture: reducing copies would require another ownership contract and fresh proof.

## Decision

Keep the original A/B measurements and source intact. Reject this public single-tick journal architecture as a performance candidate. It remains a bounded transaction/isolation proof, not a full replay performance solution. Do not connect it to the shipped game or claim stable speedup.

A longer-lived private replay ownership boundary could amortize entry/export and avoid repeated proxy traversal, but that is a different design with historical branch/version obligations, not a small correction to this candidate. It is explicitly not implemented or validated here.

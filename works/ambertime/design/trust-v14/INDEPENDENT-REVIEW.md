# v1.4 independent research review

Reviewer: reader_audit, separate from author. Reviewed local REPORT.md, VALIDATION.md, native-probes.test.mjs, r0.lock.json, relevant Change Plan policy; earlier read-only audit of #931 formal reader/storage/test sources is in READER-AUDIT.md. This is source/document review, not independent test execution or exact remote CI certification.

## Verdict
No blocking semantic or safety error found in the reviewed research/probes. Research-only rejection of cold checkpoint alternatives is supported and appropriately limited. No new reader/Lab is required after the trust/performance gate rejects every proposed substitute; native probes are explicitly not certification of a new design. Runtime/reader/format remain outside the allowed change scope. Final exact candidate CI and pending supporting artifacts still require author completion.

## Checks
- Separates main v8/localStorage from unmerged #931 v9/IDB and old test evidence from new work.
- Distinguishes replay consistency from real-player authenticity and full-archive freshness.
- Correctly identifies volatile verified-prefix cache, same-domain hash limitations, bounded IDB proof cache and save-before-publication barrier.
- Correctly limits sidecar guarantees and does not claim replay regenerates every sidecar.
- Probes check canonical cold v8/v9, inconsistent game rejection, lawful alternate/older archives, warm cache safety, output isolation, and proof-cache identity. All are native-reader probes, not an alternative checkpoint implementation.
- Performance residual is labelled hypothetical, with nested clone time not added to replay time. No claim of achieved new cold speedup.
- Fault injection/mock IDB is not labelled native Chromium, physical quota or power-loss proof.

## Nonblocking precision notes
1. Probe title mentioning mutable input actually receives immutable JSON text. The mutations affect returned game objects; describe as returned-state isolation, not a mutable input-object attack test.
2. A SHA recomputation in the inconsistent-state probe is illustrative: digest is not passed into restoreDistillery. It demonstrates that native semantic validation rejects a payload regardless of an accompanying self-digest; it is not an end-to-end forged IDB envelope test.
3. REPORT links to READER-AUDIT/PERFORMANCE and references exact CI; ensure those files/evidence exist before final commit and do not label pending remote CI complete.

## Plan source-path typo
Locked canonicalSources lists nonexistent session-state.mjs; actual reader adapter is development-save.mjs. Report discloses this. No runtime edits, allowedPaths expansion, safety gate change, or authority change follows. Scope guard validates canonicalSources path list structurally, not existence. Change Plan policy requires fresh Plan when scope changes; none occurred here. Keeping immutable r0 and recording this research-source correction is reasonable for this research-only candidate, but is not permission to bypass any gate rejecting the plan or to edit development-save.mjs. No claim that the typo is corrected in the lock. Future implementation requires its own correct Plan.

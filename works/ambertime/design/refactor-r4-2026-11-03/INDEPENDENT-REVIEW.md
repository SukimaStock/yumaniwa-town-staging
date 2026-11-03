# R4 independent review

Reviewed by a separate agent on 2026-11-03. Exact product/test HEAD: `57f170c0a56461bd0fa77f9e62e2fbe7725b297f`; base: `75843aa2b6a3b9bf1040970602a4fb4364678ddc`. No files edited or full tests repeated by reviewer.

No correctness findings. The controller owns only selected ID, does not retain or mutate formal state/cask arrays. Reconciliation preserves strict ID lookup, first/null fallback, then formal tasting override. Decision selection remains later in root syncModal. Formal tasting/bottling, boot/reset, save-failure behavior, notifications, clocks and modal ordering remain at their original call sites. Existing test assertions and immutable oracles are unchanged apart from connecting the actual controller/read route. Model/save/RNG/month/Canvas/CSS/R2/R3 controller have no diff.

Evidence correction: the checkpoint commit message claimed new8/independent30. Registered logs at that HEAD establish baseline1193, ported22 and selection4 only; they did not contain an independent code review or browser evidence. This review provides the independent code review, not browser validation. Candidate full-suite and browser evidence are recorded separately.

## Browser methodology review

The separate reviewer also read `tests/r4-browser-warehouse.mjs`. No masked product differences or unlawful fixtures found. Fixtures use pinned baseline public model APIs and strict restore;29 checkpoints/config compare actual UI actions, formal state, saved raw, DOM, Canvas RGBA, hit regions, focus, ARIA and screenshots. CSS animation500ms and controlled Canvas time are valid equal-phase sampling of unchanged presentation sources, not proof of all animation timing. Screenshots use CSS resolution while Canvas raw data covers DPR. Synthetic visibility, physical device, VoiceOver and real BFCache limits must remain explicit.

Reviewer flagged midrun output-only serialization edits: a hash read from filesystem at write time cannot be claimed as executed source hash. Browser evidence must distinguish the final runner artifact and executed revisions and document the serialization-only change. This is evidence metadata, not a product correctness issue; preserve validated captures rather than repeat interactions merely to rewrite output.

Evidence integrity closure: parent independently reconstructed/compared Chromium executed runner with final artifact, stripping only `function write()` through the following try block. All remaining bytes identical. Executed revision hashes and output-only edits are explicit in browser/diagnostics/runner-revisions.json. No browser interaction rerun for output formatting.

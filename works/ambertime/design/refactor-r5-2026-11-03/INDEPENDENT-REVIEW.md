# R5 independent source/test/browser review

A separate agent inspected current source against immutable main `a94ceadafd5920c0a447f7b392e7db983c910575`, without editing files or repeating the full test suite. No blocking findings.

- Moved display functions/formatters preserve original bytes and existing versioned imports. No DOM/modal/worker/save/formal-state dependency added.
- Root import/definition removal only; worker processing, formal operations, focus/scroll control remain unchanged.
- R4 reinlining adapter uses actual new-module definitions; old immutable oracle remains untouched. R5 separately proves exact moved snippets/formatter/root closure, so the old source proof is not weakened by oracle replacement.
- Nullable-cask projection versus release timeline preserves old exception outcome; valid saved-release tests separately require HTML equality.
- Browser runner freezes startup source hash, uses lawful public-API fixture and real UI/keyboard/scroll/back/reload actions and worker request/response comparisons. Review inspected completed Chromium192captures/96pairs, verified per-file hashes/counts and pixel0/errors0/warmcache success. Final combined results are recorded separately, not claimed as already executed during this earlier review.
- Worker equality preserves each worker's request/response payloads/counts/order. It does not assert global arrival interleaving between independent workers.

Reviewed SHA256:

|Source|SHA256|
|---|---|
|shop-app.mjs|c62758943ee85adc9f3f496090288095378e636a4a260230d3bfe5de970240b5|
|ledger-history-view.mjs|5a94e49e71c1d31fe1e83d8be048a31bf5bc52547f604274187aafe056ad5594|
|index.html|64afc5d70d44083e3503e434396f2f8817a852788893d4d79df6c47065670e96|
|tests/r5-browser-history.mjs|f507579f84292134b63df07188e089775d26230f84beacb2d149c3a23dbcb266|

Browser executions used working-tree product hashes while Git HEAD was lock-only `a690baf54d583276f6b958d8a9e42ce33c52c41e`. The lock commit itself does not contain implementation. Final commit must match those actual tested source hashes; documentation binds the implementation via source closure, not by mislabeling the lock commit as tested product.

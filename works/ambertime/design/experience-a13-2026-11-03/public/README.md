# A1-3 public verification

PR782 merge `0c3473f4f604888fcdb581874ad73f3436dfbb9a`, Pages run41668668880 success at the same SHA. The public-only lock was fixed before execution: actual Plan Digest`9af2b8fa85bc5d0c658c17ceb261eb6d0ac27b9084426ffe7da44cb7f4f61f51`, sourceBase is the deployed merge above. Implementation base/digest are recorded separately. No product or test source changed for this verification.

Run: existing strict `tests/a1-3-browser-public.mjs`, exit0,`{"passed":true,"cases":4}`. Chromium140/WebKit26.5 × normal/reduced at375×620,DPR2. All4font states ready. Formal model result and saved bytes match expected D.stopDistillation; all4raw hashes agree. Every HTML/app/Canvas body hash matches both local bytes and the deployed merge's Git blobs:12comparisons. Pageerrors/requestfailures/transportfailures all0.

Normal cases submit all11stages at distinct Canvas opportunities, including all3originalrim and8cross stages, before one finish and the existing fill modal. Every stage satisfies its minimum dwell. Reduced cases accepted=false,0activeframes,0finish calls, and follow normal render without animation waiting. Screenshots show the resulting existing modal; stage appearance/timing/pixel proof remains in the main browser/fixed-stage record.

|Engine|Motion|Start→finish ms|Start→fill condition observed ms|Canvas submissions|
|---|---|---:|---:|---:|
|chromium|normal|868.8|944.7|11|
|chromium|reduce|0.0|41.7|0|
|webkit|normal|881.0|908.0|11|
|webkit|reduce|0.0|35.0|0|

`fillAt` is the time the public test observed open=true/kind=fill after its polling condition, not an exact physical-display timestamp or MutationObserver open timestamp. Main's natural browser record separately captures modal-open and the following RAF opportunity. Canvas submissions are browser drawing evidence, not proof of physical presentation.

## Transport boundary

The adapter is byte-identical to the previously reviewed A1-2/PR779 TLS-validation forwarding implementation. It fetches real public HTTPS responses using configured proxy and CA validation, and passes those response bytes to the same-origin browser. No local product body replacement, ignoreHTTPSErrors, or TLS verification disable. The initial cold remote load includes module/font fetch/setup through this path; that setup time is separate from the post-save animation intervals above. These results do not measure direct browser networking performance.

Physical iPhone Safari visibility/feel, physical display presentation, VoiceOver, real OS background and actual BFCache remain unverified. The author should check that the unchanged rim leads into the orthogonal cross and that its outer cells contract toward the last softly fading point before fill, without feeling held up.

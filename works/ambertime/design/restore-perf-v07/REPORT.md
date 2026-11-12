# v0.7 exact copy experiment: evidence preserved, NOT deployment approval

## Identity and boundary

Stack: #931 `0ef9ba32c72e0fcb87f5ed748c47865db099adb6` → #932 remote runtime candidate `a287c61ab694ddff16d8025ed9d746c560cf3ee9`. Local tested commit `33e620c8f2f41c5b512947621b86fb364081506b` has the same tree `5cf1f983c5a26e0597c1c0941eed3b384cdb467a`. Later evidence-only commits do not change runtime. Existing r0 Plan was committed before implementation; never rewritten.

Only three partner-orders runtime lines changed: private flavor preparation uses an immediately consumed projection before the still-retained E.fillBarrel detach; two private salary deductions no longer recopy their already-detached monthly candidate. Public detached API results, operation order, rollback, town isolation and reader acceptance remain unchanged. Formal JSON state is the scope; arbitrary getters/prototypes/cycles/custom aliases are not a newly guaranteed contract.

No Staging merge, Pages deployment or Production modification. Browser cache query closure is unchanged and must be reconciled before any future deployment. Verification status remains UNVERIFIED, not author/device approved.

## Immutable five-strategy proof

Fixture ZIP SHA256 `c5ac4378a8735be9e012e5a99ef4d9377306cdd4d1989d3295f076f5734f9653`; manifest SHA256 `28542950c859b8ce265ef6e90b776fbe6783dd720d2b1f79525520ff6b76f00b`, all 98 files verified. Per-file hashes are in `results/fixture-SHA256SUMS.json`. All are synthetic game careers, not the owner's actual save. Diversified career has two desks with actual sales 2159 + 2061, not merely registered empty desks.

Run Node v24.22.1 Linux x86_64. Command, source/script/fixture hashes and environment are embedded in every result. Reproduce:

```
python3 works/ambertime/design/restore-perf-v07/run.py REPO FIXTURES OUTPUT
```

Candidate: 5 save processes + 5 cold1/full-state/next-month/resave processes + 5 fresh cold2 processes, all 15 and parent normal exit. Complete game and sidecars equal frozen oracle; original and continued canonical save bytes match. Baseline and candidate raw result JSON plus parent completion records are preserved under `results/`. These reuse immutable original 1200-month careers; they do not claim newly generated careers. Each new restore is a separate process.

## Counter-instrumented comparison (NOT instrumentation-off ordinary speed)

|Strategy|#931 cold s|#932 cold1 s|#931 peak RSS MiB|#932 peak RSS MiB|Native copy reduction|
|---|---:|---:|---:|---:|---:|
|local|152.845|130.154|888.2|872.3|105|
|regional|79.893|88.980|564.0|555.9|105|
|bulk|105.577|94.764|593.2|598.9|105|
|small|200.324|322.662|821.7|828.3|105|
|diversified|75.713|92.549|578.2|548.4|105|

Timers/copy counters were ON. Native/helper counters overlap and must not be added. Copy reduction is established, reproducible speedup or memory improvement is NOT established. Small cold2 is around 210 seconds versus cold1 323, illustrating run variance. Independent 17-test replay lasting 1.249 seconds may have overlapped the first candidate save run. It is not hidden as uncontended evidence. Fully instrumentation-OFF paired runs are underway using separate plain.mjs and will be preserved separately; they are not completed by this report.

## Safety and regression results

Independent exact-three-line review: no blocking flaw within formal JSON contract. Independent rerun 17/17 PASS (16 differential + 1 exact inverse guard). Covers frozen input, graph separation, connected state aliases, reserve failure, salary-followed-by-exception, low-cash rollback and repeated automation. Additional public-operation micro probe: 6/6 completed with identical state. See micro result; diagnostic size traversal perturbs timing, not a performance claim.

Focused existing/new regression: **430 PASS / 2 FAIL of 432**, not all green. The same two failures independently reproduce at exact #931 baseline: **30 PASS / 2 FAIL of 32** in the two affected files. bar-model migration VM is missing clearEntryDiagnostic; formal-idb-main exact reader-call expectation expects four calls but unchanged #931 executes seven. Neither test or expectation was weakened. Logs preserved, including original failures.

Existing source-hash guard: #931 3/3 PASS; #932 2/3 PASS, 1 FAIL because three intended runtime lines differ. The supplemental inverse test confirms that exactly reversing those changes produces exact baseline bytes. It is not a substitute for the failed original guard and does not waive it.

## GitHub CI on exact remote a287c61a

- Change PR Gate run 43260486652: success; Scope/Risk/Impact and Plan ordering.
- Change Verification Evidence run 43260486637: success; Trusted Static evidence.
- Release Validator run 43260487560: success.
- Native browser run 43260487520: success; artifact 13962913594.

Native Chromium 151.0.7922.34 / Node22.23.4 Ubuntu22.04: adapter fault suite 12 PASS, real runtime seven subcases PASS (eight TAP including parent), huge regional suite six PASS. Huge initial verified write 44.543s; fresh browser restore 43.013s; next-month publication 1.923s; two-generation restore 43.779s. Quota injection protects old bytes/live state; corrupt head refuses restore and retains previous generation (not automatic recovery). Browser-tree RSS sum 1,837,588 KiB is not unique process memory. Physical full-device quota, OS power loss and iPhone remain unverified. CI success does not erase separate regression/source-guard failures.

## v0.9 monthly diagnosis, preliminary

Old diagnostic profile serialized every copy for size: archived explicitly as `intrusive-profile`, never ordinary speed. Candidate regional: economicMonthly full clone 1332 times, native 37.29s, logical serialized volume 4,129,711,072 code units; advanceMonth core copies 1332 / 0.80s / 50,413,443 units; advanceMonthly partial 1254 / 0.02s / 325,692 units. Helper/native overlap; do not sum. Inclusive parents include children.

The outer full copy protects public input, detached town and low-funds rollback; deleting it or sharing town is unsafe. advanceMonthly itself shallow-composes the detached result. Smaller core/cask copies are not giant town copies. Autoshipping, consignment settlement, sales/records and town updates already mutate the owned candidate rather than repeatedly cloning the full root. Automatic bottling is almost no-op on this regional career, so micro wins cannot be presented as century wins. Time-only and sampled-size runs are pending, with ordinary OFF runs separate. A new runtime experiment must have a new Plan and dependent Draft if the measured safety/benefit balance supports it. No additional runtime change has been adopted yet.

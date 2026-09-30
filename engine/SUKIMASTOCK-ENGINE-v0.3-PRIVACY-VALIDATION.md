# Engine 0.3.0 — Session Report privacy completion fix

Base: `08876795651f9ec28d926e4d16887f95fac533b3` (staging/main).
Plan: `engine-030-report-privacy`, immutable r0; implementation follows the
Plan-only commit. Staging Draft PR only; no merge or production promotion.

## Boundary and evidence

Root cause: raw `environment.search`, Asset file URLs and Engine-generated URL
failure messages reached Session Report JSON/text. Truncation did not redact them.

The existing devtools output boundary now creates sanitized copies. Page query
and fragment export presence booleans only. A small common sanitizer removes URL
query/fragment suffixes from strings and nested diagnostic data; exact registered
Asset/Audio references are handled before whitespace-delimited text references.
No parameter-name denylist or arbitrary-secret scanner is introduced. Asset
pathname/name/type, resource kind/readiness and Engine HTTP error status remain.
Report text, clipboard/fallback copy and panel use the sanitized report. Sample
sanitization precedes truncation. Internal Asset/Audio data, errors, events and
location are not rewritten; runtime inspection APIs retain original URLs.

## Automated validation

- Diagnostics: **42 PASS**, including **12 privacy regression tests**.
- Input / Boot: **27 PASS**.
- Audio / Asset: **50 PASS**.
- Starter Adoption: **5 PASS** (actual export ZIP / isolated handoff checks).
- Canary: **3 PASS**.
- Engine and Diagnostics test JS syntax: **PASS**.
- Diff whitespace check: **PASS**.
- All Engine bytes outside the existing `devtools` block match the base.

Privacy tests assert sentinel absence in both `JSON.stringify(report())` and
`reportText()`: page query/fragment; absolute, relative, root-relative,
protocol-relative, query-only, fragment-only and raw-whitespace Asset URLs;
actual Engine fetch-error construction with a mocked 404 (no network); nested
diagnostic strings/keys; Audio failure reasons; copy output and bounded samples.
They also check useful status/type/name/path fields and unchanged original URL,
error identity, events, resource state, location, RAF and timers. Mutating a
returned nested copy does not mutate runtime data.

Negative control: run the same Diagnostics tests against the base Engine in
memory; the 12 new privacy cases fail and the original 30 pass. The fixed Engine
passes all 42. The three HIGH-finding paths (environment query, Asset URL and
Engine error reason in text) are therefore closed by the tested output boundary.

Scope / Risk / Impact and trusted CI results are recorded against the exact
Draft PR head in GitHub; this document does not claim human verification.

## Unchanged and unverified

Engine 0.2.0, Codea, all five existing works, starter, canary, host/town files,
work registration and workflows are unchanged. Production remains at
`53d31cfe98313c87cfc5ffb78e3b4e8cdaed1ca3`.

Browser verification: **UNVERIFIED**. No actual browser Report UI, clipboard or
device test was performed for this fix. VM tests are not browser verification.
Current repository `verificationState` remains **UNVERIFIED**.

Runtime regression CI connection and duplicate gesture resume requests remain
separate follow-ups. No new diagnostics feature, migration or later phase work.
Rollback: revert this privacy implementation/documentation/test commit as one
unit; preserve the Plan Lock and existing Phase 1/2/3 runtime history.

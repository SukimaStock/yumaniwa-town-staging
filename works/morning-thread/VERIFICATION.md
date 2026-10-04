# First playable verification

Date: 2026-10-04
Base: `17bffca036eb18084bcdee672e3b32fb671ef1e2`
Plan digest: `38ab8b6ad9fe235fa0c779eb6958097c10eb51a3fa3b48e5d0584eb2a35061dc`

Formal Change OS verificationState remains `UNVERIFIED` under the repository contract.
The following are observed checks, not a production release or an iPhone attestation.
The exact candidate SHA is recorded in the Draft PR.

## Observed

- Work rules: **15/15 PASS** (`node --test works/morning-thread/test-model.cjs`).
  Waiting, scheduled departures, missed connection, duplicate/edit protection, exact deadline,
  failure recovery, partial route continuation, frozen announcement and 30/60/120fps records.
- Existing standard Node tests: **390/390 PASS** (`node --test tests/test-*.cjs`).
  Includes the existing real Chromium Engine input/boot fixture.
- Existing Python tests: **62/62 PASS** (`python3 -B -m unittest discover -s tests -p 'test_*.py'`).
- New real-browser script: **PASS**, Chromium 153.0.8010.0, Playwright, HTTP-served repository.
  Interaction uses actual DOM buttons and pointer events, without injecting game state.
- Home → mall → announcement → flower route → record: **08:48**.
- Escalator route → record: **08:47**.
- Cancelled lift → failure board → food/florist reroute → success: **08:50**.
- Add/remove/tap reorder, duplicate disabled in notebook, actual handle drag and subsequent tap: **PASS**.
- During the announcement, clock unchanged across a real one-second browser wait: **PASS**.
- Widths **320 / 390 / 844 / 1280**, portrait and landscape: no horizontal overflow; controls remain operable.
- Reload returns safely to the cover, ready to start again.
- Screenshots of title, home board, mall board, announcement and result inspected visually.
  Japanese system font was installed only in the test environment; the game has no external font dependency.
- Browser page exceptions: **0**. External requests: **0**.
- Engine **0.3.0** / Codea **1.0.0**, both running. WebAudio context running after the native sound button.
- Diagnostics: no error-level issues. The final automated run reports `slow-frames`:
  **20 frames (12.7%), p95 37.3ms, max 66.5ms**. This is a remaining headless measurement,
  not proof of iPhone performance. Browser automation includes screenshots and viewport resizing.
- Scope → Risk → Impact and diff whitespace checks: **PASS**. Trusted static syntax result is in the PR.

## Supplemental existing browser failures

The broad `tests/*.cjs` glob includes two standalone browser helpers in addition to the standard tests.
They fail identically in the candidate and an untouched detached worktree at the base SHA:

- `creation-draft-browser.cjs`: `#creation-save` exists but is not visible; 30s click timeout.
- `map-asset-browser.cjs`: fixture assumes `.git` is a directory, but a Git worktree has a `.git` file;
  `FileExistsError` while creating `.git` metadata.

These helpers and their fixtures are unmodified. Their failures are recorded, not marked PASS.

## Unverified / intentionally limited

- Physical iPhone Safari, safe-area behavior on actual hardware, interruption by an actual phone app,
  audible sound balance and subjective one-handed comfort.
- Real-device performance. Frame-independent rule tests do not establish device rendering speed.
- Town host entry/return, production delivery and install/SEO/OGP metadata. This Draft is standalone within staging.
- Journey records are session-local and return to the cover on reload; no new persistent save contract.
- No registered town work, merge, deployment, production change, canonical Engine/Codea change,
  or unrelated existing-work change.

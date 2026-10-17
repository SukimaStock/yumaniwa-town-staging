# Search introduction campaign preservation — 2026-10-17

- Repository: SukimaStock/yumaniwa-town-staging
- Base: 5a5231d495fbc308f276ebfcc4e50905086e593f
- Implementation checked: ae68349784738af0fc14f9997acf9d4fe00dd13b
- Plan lock first commit: 24ca743
- Plan digest: 8dce5b01a288d698e063b99d24b175705258181ce155a7e6b826525cce0d32be
- Current verification state: UNVERIFIED (formal final verification is deferred; physical-device/external checks below).

## Defect and change

The ordinary JA/EN work introduction pages had no analytics script and their existing play, town and language links discarded incoming campaign parameters. Campaign-tagged introductions therefore lost attribution before the first measured town page. The existing optional `open=1` shortcut already retained query parameters.

Only `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` are copied onto existing links when nonempty. Incoming `work`, `open`, `place`, other query parameters and fragments do not override ordinary link destinations. Existing shortcut behavior is unchanged. No events, analytics loaders, storage, UI or copy were added.

The generator regenerated exactly 20 existing introduction pages for ten selected published works. The staging-only CoffeeFactory page remains untouched. All 21 existing JA/EN page bodies, styles, canonical/hreflang, OGP/schema and robots were compared against the base and are byte-identical outside the campaign script; sitemap is unchanged. Game code and the town shell are untouched.

## Checks

- PASS: `node --test tests/test-work-search-campaigns.cjs tests/test-release-validator.cjs tests/test-work-lifecycle.cjs` — 118 tests, 0 failures.
- PASS: 66 campaign cases cover every metadata work in JA and EN, normal links, empty fields, duplicate source, Unicode values, routing override rejection, JavaScript-free fallback and existing shortcut.
- PASS: node syntax for changed CJS source/test.
- PASS: Search/Share generator `--check` using orbit,diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window,pumpoko (original sitemap order).
- PASS: Plan Lock verification, Scope Guard, Risk Gate, Impact Check at implementation SHA.
- PASS: public Production HTTP audit — all 20 JA/EN introduction pages and their OGP image URLs returned HTTP 200; canonical, language and play links present. This confirms current public assets, not the unpublished staging repair.
- PASS: independent read-only review by campaign_review of the identical implementation patch before the main-base refresh; 66 campaign tests rerun, no blocking issue. New base only contains an unrelated AmberTime update.
- PASS: actual headless Chromium desktop (1440×900) and iPhone viewport/touch emulation (390×844), 40 JA/EN cases across all ten changed works. Verified all five UTM values, fixed work identity, actual language→play clicks, no horizontal overflow, and existing open=1 shortcut on both devices. Browser supplied by @sparticuz/chromium after the ordinary Playwright browser download failed. This is Chromium emulation, not physical iPhone Safari.
- Browser evidence: `/workspace/scratch/0f35a500be52/evidence/campaign-qa/results.json` and desktop-ja.png, desktop-en.png, iphone-emulation-ja.png, iphone-emulation-en.png. QA screenshots use a temporary Japanese font for the container font environment only; repository CSS is unchanged.
- UNVERIFIED: physical iPhone/SNS in-app browser behavior and external Plausible reporting. Production remains unchanged, so this staging fix cannot produce production measurement improvements yet.

## Scope / rollback

Revert the implementation commit to restore previous generated output. Production requires a separate explicit publication instruction. No new human-facing task or UI adoption decision is created by this technical repair.

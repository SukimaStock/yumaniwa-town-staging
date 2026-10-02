# PUMPOKO naming migration — reference audit

Baseline: staging/main `8661c64d9f7dcdd4b19e9f95fbb1f58c86c046b6`, fetched at
work start on 2026-10-02. Full repository search included hidden tracked files,
`kotsu-koro`, `こつ、ころ` and spelling/punctuation variants. The old Japanese
title is already absent from current main and is not reintroduced.

| Classification | Baseline references | Treatment |
| --- | --- | --- |
| Current identity | `work-config.js` and two runtime test fixtures | ID `pumpoko`; title already `PUMPOKO` |
| Current guide | `BUILDER.md` entry path | New path; README supplies current commands/links |
| Builder export | `builder/builder.js` download filename | `pumpoko-stage.json`; import still validates content only |
| Persistent sound | `sketch.js` builds `W.id + ".sound"` | Explicit `kotsu-koro.sound`, compatibility comment |
| Persistent Builder | `builder/builder.js` fixed key | Keep `kotsu-koro-stage-builder-v1`, compatibility comment |
| Optional language | Engine derives `sse:<id>:language` | Explicit `sse:kotsu-koro:language` via existing i18n API |
| Managed storage namespace | Engine derives `sse:<id>:data:` | No work calls/registered definitions or gameplay records; no save migration |
| Historical evidence | `.change-plans/**`, `VALIDATION.md`, historical research/stage notes | Contents unchanged; work documents only move |
| Pinned historical fixture | `test-stage.cjs` runs `git show 86f1b892…:works/kotsu-koro/journey.js` | Keep original SHA/path; it reads the Git object, not the deleted runtime directory |
| Relative runtime references | Game scripts/assets/Engine, Builder shared stage scripts and `href="../"` | Same depth/layout; unchanged links resolve into `pumpoko` |
| Old URL | Two `index.html` pages under old tree | Only fixed same-site replace redirects, query/hash preserved, fallback links |
| Migration evidence/tests | This document, README and `test-migration.cjs` | Old names identify compatibility or historical baseline, not active identity |

No old name/path appears in town registries, root runtime, current external
tests, CI or export/validation tool configuration. Generic tools accept work
paths supplied by callers; the new README provides the new commands. No
work-external implementation change is needed. CI continues to use the base
owned PR gate and existing Change Operations tests; workflow content is untouched.

All 33 baseline files move with their relative layout. Only six moved text
files change: config ID, sketch persistence overrides, Builder key comment and
export name, current Builder guide, two test IDs. Everything else is byte
identical, including all seven media/logo assets, Stage Data, physics, renderer,
journey, local Codea Lite, Builder model, HTML/CSS, historical documents/fixture.
Canonical Engine/Codea and all other work trees are unchanged.

The redirects replace the fixed old work suffix of `location.pathname`, retaining
the site's prefix, and append `location.search` and `location.hash`. No query
value controls the destination. The old tree has exactly two pages and no
runtime/assets. Slash, explicit `index.html` and slashless paths are tested
mechanically and locally. The local HTTP server canonicalizes directories with
301 before HTML; actual staging behavior after merge remains unverified.

Browser checks use the same Chromium context/origin across old save and new
load, without clearing site data. The test harness may observe Builder model
creation or accelerate animation time; those changes live only in the browser
session, not the repository. Real media state establishes clock continuity,
not audible output. Actual iPhone and post-merge deployed new/old URLs remain
UNVERIFIED; no deployment or merge is part of this PR.

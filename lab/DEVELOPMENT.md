# SukimaStock LAB — staging institute

LAB is a staging research institute before works enter the town. Its repository and Pages URL are public; noindex/nofollow discourages search indexing and is not access control. This change is staging-only; it does not authorize production, author adoption, or frozen-work resumption.

## Source and generation

- `data/work-lifecycle.json`: unchanged work identity/path/status. The existing `listWorks` implicit active default covers the unregistered Feel Lab.
- `data/lab-rooms.json`: room placement, short copy, and actual tool environments only. It does not store work paths or statuses.
- All frozen `ARCHIVE.md`: unchanged source for every original section, preserved fragment ID, playable URL and archive link.
- `tools/work-lifecycle.cjs`: only the LAB render function delegates to `tools/lab-renderer.cjs`. Registry validation, transitions, promotion/snapshot protection and frozen diff checks retain their previous implementation.
- `lab/lab.css` / `lab/lab.js`: local presentation. CSS/SVG symbols do not load the experiments, engine, audio, fonts or APIs. A small hash script selects rooms; there is no persistent state or background automation.
- `lab/index.html`: generated only; local CSS/JS content hashes keep its references current.

```sh
node tools/work-lifecycle.cjs --write-lab
node tools/work-lifecycle.cjs --check
node --test tests/test-work-lifecycle.cjs
```

The institute has three floors above a basement: Motion/Touch, Observation/Bench, PUMPOKO, and Garage/Archive. Timber floors, warm pendants and small machines distinguish rooms. The entrance copy disappears while a room is selected. Narrow screens scroll naturally from the model into the selected room; desktop places that room beside the model.

## Placement

| Room | Machines |
| --- | --- |
| Motion Lab | One Motion Lab entry containing Slime, PuddleMoon, Firefly |
| Touch Lab | One SukimaStock 3D / Touch Lab entry |
| PUMPOKO | PUMPKIN × RUTABAGA, Feel Lab; PUMPOKO as the released research result; original PUMPOKO / 01 on the back shelf |
| Observation | tea-unfold / 01, tea-unfold-02 / 02 |
| Prototype Bench | ORBIT / 02, CoffeeFactory; planned shells and other unassigned playable active/candidate prototypes on the back shelf |
| Archive | Town Glance / 01–04 and Morning Thread / 01–02; future frozen entries also resolve here |
| Tool Garage | Map Factory, Map Editor through the existing town development menu, Audio Factory, Mixed Note; Cleaner (Codea), Desk (Pythonista), VectorBoy (external production environment); Engine Canary and template on the equipment shelf |

The current staging main has lifecycle entries but no Web folders for unpushable-button, notification-badge, someone-pedometer or fast-forward-clock. These four optional shells retain their lifecycle label and say “Webの筐体は準備中”; no nonexistent link is generated. Adding their real entrypoints later enables their links automatically. All required playable entries fail generation if missing.

`pumpoko-02` and `kotsu-koro` are redirects to current PUMPOKO and are omitted from placement; PUMPOKO / 01 is explicitly described as the old work. No work is relabeled or resumed. Candidate, if introduced later, displays 公開候補 rather than 公開作品.

After the independent #281/#282 change, current-base `tsumatta-tsubu` (つまった粒 — おやすみ工房 01) appears automatically on the back bench. That prototype is not modified here.

## Navigation and compatibility

- Room doors are ordinary fragment links. Browser Back/Forward and old archive fragments select the correct room. Safari back/forward-cache restoration preserves its scroll position.
- Work/tool entry links open in the same tab. Browser Back returns to the selected room. Each room explains this and has “研究所全体へ” links. Existing work pages are untouched.
- Keyboard selection uses ordinary links; the selected heading receives focus; Escape returns to the building. No focus trap, gesture capture, or user-scalable restriction is added.
- Without JavaScript, the model still links to seven visible room sections, all actual Web launches and all six expandable archive records.
- Reduced-motion removes animations and smooth scrolling. Page visibility and intersection observers pause hidden/offscreen symbols. Archive shelf machines remain still.
- Existing `lab/` URL, town development LAB link, noindex/nofollow, production exclusion, SEO/publication list and all archive/work/engine assets are preserved.

## Checks and limits

Implementation starts after the locked Plan on base `fcbbfd0a4fcf5e1d7fcdbd940bb261492db45ae4`. The earlier local branch was restarted when the independent prototype advanced main, before publishing this branch. The current lock is `.change-plans/sukimastock-lab-institute-20261012/r0.lock.json`.

Observed:

- Lifecycle/LAB regression: 24 passed, including complete archive contents, unique placement, real links, statuses, default/future placement, candidate boundaries, unsafe/missing links, seven-room navigation, legacy fragments, cache restoration, reduced motion and page pause. Navigation uses the existing Node DOM/event adapter, not a rendered browser.
- Existing Release Validator / Work Guide regressions: 41 passed. Published Search/Share generation check passed for the unchanged 10-work set. Release validator: 0 FAIL, 0 HQ_REQUIRED; its external/device/production checks remain UNVERIFIED.
- LAB generator check, JavaScript syntax and diff whitespace check passed. Exact candidate evidence is reported by the base-owned PR checks. These checks do not attest visual appearance or operation feel.

Not observed:

- Rendered 320/390px portrait, landscape and desktop layouts; actual browser hit targets and smooth return behavior.
- Actual iPhone/iPad Safari, device performance, heat/battery, author judgment of room placement or the small animations.

The available Sites workflow explicitly says: “If `$control-browser` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” Source: [Sites SKILL.md](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md). The required browser-control capability is unavailable in this execution environment, so the existing optional browser regression has been updated but is not reported as executed. No screenshot is presented as evidence.

`tests/test-work-lifecycle-browser.cjs` retains the existing town → LAB → archived work → Back and town-work regression. It also covers seven room selections, narrow/desktop no-overflow and local-only entrance requests for an environment with the required supported browser setup.

Formal `verificationState` remains `UNVERIFIED` under current `CHANGE-VERIFICATION.md`. Staging merge/Pages success, machine tests, actual browser checks and author device adoption must be reported separately.

## Revert

Revert this LAB implementation (placement, renderer, generated page, local presentation, related tests/documentation) as one change. No works, lifecycle entries, archives, town runtime, engine, SEO or production data require restoration.

# Yumaniwa Change Plan Contract v0.2

制定: 2026-09-28

この文書は、`CHANGE-OPERATIONS.md` で分類した変更を、**実装前にどの範囲・正本・検査で実行するか固定するための契約**である。

目的は計画書を増やすことではない。

- 実装前に「何を触る予定か」を明示する
- 実装中に都合よくscopeを広げない
- 実装後に「予定と実diff」を比較できる
- 必要な正本・検査・手動確認の抜けを減らす
- 軽い変更に重い儀式を要求しない

変更分類・Authorityは `CHANGE-OPERATIONS.md`、AI権限は `AGENTS.md`、日常運用は `OPERATIONS.md`、新作Releaseは `RELEASE-WORKFLOW.md`、実装後の確認記録は `CHANGE-VERIFICATION.md` を正本とする。

Change Planはそれらの代わりではなく、**一回の変更を安全に実行するための作業契約**である。

---

## 1. Plan Level

repositoryを変更する作業では、実装前にChange Planを作る。

| Plan | 主な対象 | 目的 |
| --- | --- | --- |
| Lite | CONTENT、単純PLACEMENT | scopeと正本を短く固定 |
| Standard | ASSET、通常WORK、複合変更 | 複数source・検査・手動確認を整理 |
| Full | SYSTEM、WORLD、Retirement、migration、契約変更 | 設計判断・影響・rollbackまで固定 |

既存契約内の軽微な文面修正や座標調整にFull Planを要求しない。
SYSTEM / WORLDをLite Planで済ませない。
複数Classの場合は最も重いClassに必要なPlan levelを使い、各ClassのsubflowはPlan内に残す。

---

## 2. Lifecycle

```text
REQUEST
  ↓
CLASSIFY
  ↓
AUTHORITY
  ↓
DRAFT PLAN
  ↓
OWNER / HQ DECISION（必要な場合）
  ↓
PLAN READY
  ↓
PLAN LOCK（高リスク / PR / promotion）
  ↓
IMPLEMENT
  ↓
COMPARE PLAN vs DIFF
  ↓
VALIDATE / VERIFY
  ↓
CLOSE or PROMOTE
```

状態:

- `DRAFT`: 未決判断がある。実装へ進まない
- `READY`: scope・正本・必要判断が確定
- `IN_PROGRESS`: READY Planに従いstaging変更中
- `SCOPE_REVIEW_REQUIRED`: 想定外scopeが必要。実装を止める
- `VALIDATION`: 静的検査・手動確認中
- `VERIFIED`: staging確認まで完了
- `CLOSED`: stagingだけの作業として完了
- `PROMOTION_READY`: production昇格に必要な証拠が揃った

Plan状態とRelease状態は別物である。

---

## 3. Common Fields

### Identity
- `changeId`: 変更を識別するlowercase slug
- `revision`: 0から始まるPlan revision
- `previousPlanDigest`: revision > 0 の場合だけ直前lock digest
- `revisionReason`: revision > 0 の理由
- `status`: 実装開始時は必ず `READY`
- `repository`: `owner/name`。staging/productionの取り違え防止に使う
- `change`: 何を変えるか
- `planLevel`: lite / standard / full
- `classes`: CONTENT / PLACEMENT / ASSET / WORK / SYSTEM / WORLD
- `authority`: Standard / Rule / Skill / HQ Review / Owner Decision の配列
- `environment`: `staging` / `staging-production`
- `baseSha`: **実装開始前に固定したstaging HEAD。revisionで書き換えない**

### Scope
- `canonicalSources`: 今回の正本
- `allowedPaths`: 変更してよいpath
- `conditionalPaths`: 条件成立時だけ変更してよいpath
- `forbiddenPaths`: 特に触ってはいけないpath
- `expectedChanges`: 意味として何を変えるか

### Decisions
- `ownerDecisions`
- `hqDecisions`
- `rulesApplied`

### Verification
- `staticChecks`
- `manualChecks`
- `impactChecks`: 実施・確認する登録済みImpact ID
- `impactExclusions`: 今回N/AとするImpact IDと理由
- `rollback`

### Boundaries
- `outOfScope`
- `promotion`
- `unverified`

---

## 4. Path Rules

### allowedPaths
Plan作成時点で必要と分かっているpath。可能な限りfile単位で書き、repository全体を許可しない。

### conditionalPaths
条件によって必要になるpath。条件もPlan作成時に書く。

例:

```text
index.html
  condition: data scriptのcache fingerprint更新が必要な場合のみ
```

「必要なら何でも」の逃げ道にしない。

### forbiddenPaths
allowed外は原則out-of-scopeだが、特に触りたくなった時点で設計ずれを疑うpathを明示する。

### Generated Files
生成物と正本を区別する。

```text
canonical source
  data/work-search-meta.js

generated
  w/<id>/index.html
  en/w/<id>/index.html
  sitemap.xml
```

生成物だけを直接編集するPlanを書かない。

---

## 5. Plan Lock / Risk Floor

v0.2では、**高リスク変更、staging PR、production昇格の根拠に使う変更**は、
実装前Planを `tools/change-plan-lock.cjs` でdigest化して固定する。

```sh
node tools/change-plan-lock.cjs create \
  --plan /tmp/yumaniwa-change-plan.json \
  > /tmp/yumaniwa-change-plan.lock.json

node tools/change-plan-lock.cjs verify \
  --lock /tmp/yumaniwa-change-plan.lock.json
```

RecordはPlan本文ではなく `planDigest` / `changeId` / `revision` / `repository` を参照する。
locked Planを後から書き換えるとdigest mismatchで失効する。

高リスクpathの下限は `tools/change-risk-policy.cjs` の正本に従う。
代表例:

- Change OS / workflow / 共通runtime / root HTML-CSS / Service Worker / manifest
  → SYSTEM / Full / HQ Review
- work固有runtime
  → WORK / Standard以上
- canonical asset
  → ASSET / Standard以上
- 新規・未登録の実行可能JS/HTML/CSS
  → INFOで閉じずhigh-risk review

core Impactは `impactExclusions` へ逃がせない。
また、1 profileが要求するImpactを全部N/AにしてVERIFIEDへ進めない。

日常の軽いCONTENT / PLACEMENTを一律FullやPRにしない。
ただし**PRを使う変更はPlan Lockを必須**とする。

現行の `Change PR Gate v0.2` は `pull_request_target` でPR base側のworkflow定義とgate実装を使う。
candidate branchのworkflowやgate toolを実行して自己認証しない。

high-risk PRでscope変更が必要になった場合はlocked r0を上書きせず、
いったん止めて現在のbaseからbranch/Planを作り直す。
Plan Lock tool自体はr2以降のrevision chainも検証できるが、PR gate v0.2は意図的にfresh r0一つへ制限する。

---

## 6. Lite Plan

対象: CONTENT、既存schema内の単純PLACEMENT、単一正本の小変更。

必須:

```text
Change:
Plan:
Class:
Authority:
Environment:
Base SHA:

Canonical source:
Allowed paths:
Do not touch:

Expected change:
Static check:
Manual check:

Promotion:
```

例:

```text
Change:
  curry shopを右へ2 world px移動

Plan:
  lite

Class:
  PLACEMENT

Authority:
  Owner Decision: 移動量
  Standard: 反映

Environment:
  staging only

Base SHA:
  <sha>

Canonical source:
  data/town-maps.js

Allowed paths:
  data/town-maps.js

Conditional paths:
  index.html
    only if source cache fingerprint must change

Do not touch:
  data/world-objects.js
  assets/maps/objects/shops/**
  main.js
  production

Expected change:
  curry shop placement xのみ変更
  collision / interaction / tapのabsolute位置を確認

Static check:
  Scene Contract

Manual check:
  店前の歩行
  接近
  interaction
  adjacent passage

Promotion:
  none
```

---

## 7. Standard Plan

対象: ASSET、通常WORK、WORK + ASSET + PLACEMENT、複数正本へまたがる既存契約内の変更。

Lite fieldsに加えて:

- 複数の `canonicalSources`
- `rulesApplied`
- `impactChecks`
- `dependencies`
- `rollback`
- 具体的な `manualChecks`
- production昇格時は公開対象 / 除外対象

例:

```text
Change:
  new_shop_01を灯串横丁へ配置

Plan:
  standard

Classes:
  ASSET
  PLACEMENT

Authority:
  Owner Decision: 採用画像 / 見た目の大きさ / 配置
  Rule: existing SHOP_S profile
  Standard: registry / placement反映

Canonical sources:
  YUMANIWA-PIXEL-STANDARD.md
  data/world-objects.js
  data/town-maps.js

Allowed paths:
  assets/maps/objects/shops/new_shop_01.png
  data/world-objects.js
  data/town-maps.js

Conditional paths:
  index.html
    only if cache fingerprint update is required

Do not touch:
  main.js
  town transition code
  existing shop asset files

Expected changes:
  canonical 1x asset追加
  WORLD OBJECT identity追加
  existing sceneへのplacement追加

Rules applied:
  1 logical asset pixel = 1 Yumaniwa world pixel
  existing SHOP_S profile

Impact:
  collision
  interaction
  adjacent shops
  passage width
  draw ordering

Static checks:
  Pixel Standard verification
  Scene Contract

Manual checks:
  scale
  foot
  draw order
  approach
  collision
  interaction
  mobile

Rollback:
  asset / registry / placementを同じ変更単位でrevert
```

---

## 8. Full Plan

対象: SYSTEM、WORLD、Retirement、migration、source-of-truth変更、compatibility変更、cross-cutting contract変更。

Standard fieldsに加えて:

- `problem`
- `currentContract`
- `whyExistingIsInsufficient`
- `design`
- `alternativesRejected`
- `migration`
- `compatibility`
- `boundaryCases`
- `testPlan`
- `promotionRisk`

Full PlanはHQ Review完了まで `READY` にしない。

例:

```text
Change:
  leisure centerの作品一覧をpagination対応する

Plan:
  full

Class:
  SYSTEM

Authority:
  HQ Review
  Owner Decision: 表示体験

Problem:
  作品増加で一画面の一覧が長くなる

Current contract:
  WORKSが作品の正本
  venue一覧はWORKSから動的生成

Must preserve:
  WORKSを第二一覧へ複製しない
  新作追加時のmanual menu更新を増やさない

Design:
  visible worksへ表示層だけpaginationを適用

Boundary cases:
  0
  1
  pageSize
  pageSize + 1
  final page
  open work → return
  mobile touch

Do not touch:
  work identity schema
  Search metadata
  individual work runtime

Test:
  pagination regression
  representative venue
  mobile manual test

Rollback:
  pagination renderer/stateの変更をrevert
```

---

## 9. Plan Change Rule

実装中にallowedPaths外の変更が必要になったら、**先にコードを変えてからPlanを直してはいけない。**

```text
unexpected need
    ↓
STOP
    ↓
SCOPE_REVIEW_REQUIRED
    ↓
why needed?
    ↓
same contract?
    ├─ yes → Planを明示更新 → READY
    └─ no  → HQ Review
    ↓
resume
```

Plan revisionでは最低限、`revision`、`previousPlanDigest`、`revisionReason` を持つ。
**`baseSha`、`changeId`、`repository` はrevisionで変更しない。**

Owner/HQ判断の意味が変わるscope拡張は再承認なしに進めない。
High-risk PRではv0.2 gateがr0一つを要求するため、scopeを広げる必要が出たら
そのPRで後付けPlanへ合わせず、新しいbaseからPlanを作り直す。

---

## 10. Base SHA Rule

`baseSha` は実装前のstaging HEADであり、**同じchangeIdのまま後から更新しない。**

Plan後にmainが進んだら:

1. 新HEADと対象source差分を確認する
2. 同一path変更があれば実装を止める
3. 高リスク変更は新しいbaseからbranch / Planを作り直す
4. Lite作業でも古いsource全文で上書きしない
5. 「変更後HEADを新baseにしたからdiffなし」という洗い替えを禁止する

Scope Guardは固定baseShaから実diffを比較する。

---

## 11. Diff Contract

実装後はPlanと実diffを比較する。

- changed pathはallowed / conditionalか
- conditional pathは条件が成立しているか
- forbidden pathが変わっていないか
- expectedChangesとdiffの意味が一致するか
- 正本を迂回するruntime patchが増えていないか
- generated fileだけを直接直していないか
- unrelated cleanupを混ぜていないか

無関係なcleanupは別Change Planへ分ける。

---

## 12. Impact Contract

Planには変更fileだけでなく確認すべき影響先を持つ。

例:

```text
data/works.js
  → venue menu
  → direct route
  → Search / Share
  → analytics ID
  → town awareness
  → Release Validator
```

```text
data/town-maps.js
  → rendering
  → collision
  → interaction
  → Editor / Desk
  → scene validation
  → transition adjacency
```

`tools/change-impact-rules.cjs` をImpact Rulesの正本とする。

登録済みsourceが変更された場合、導出されたImpact IDは次のどちらかで必ず扱う。

- `impactChecks`: 今回確認する
- `impactExclusions`: 今回N/Aとする理由を明示する

「変更していないからたぶん関係ない」で無言に落とさない。除外は可能だが、理由を残す。

---

## 13. Manual Verification Contract

手動確認は事前に観点を決め、実施時に確認SHAを記録する。
`staticChecks` / `impactChecks` / `manualChecks` の文字列は、後段の `CHANGE-VERIFICATION.md` でVerification Recordのcheck IDとして使うため、同じ意味のcheckを実装後に別名へ書き換えない。

```text
Manual checks:
  - iPhone
  - scene opens
  - intended position
  - walk
  - collision
  - interaction
  - return
```

確認後にコードが変わったら、影響範囲に応じて再確認する。

---

## 14. Machine-Readable Shape

`tools/change-scope-guard.cjs` は次の意味構造を入力とする。
JSONファイルの常設は必須にしない。stdinまたはrepository外の一時JSONを使ってよい。

```json
{
  "schema": "yumaniwa-change-plan/0.2",
  "changeId": "curry-shop-move-20260928",
  "revision": 0,
  "previousPlanDigest": null,
  "revisionReason": null,
  "status": "READY",
  "repository": "SukimaStock/yumaniwa-town-staging",
  "change": "curry shopを右へ2 world px移動",
  "planLevel": "lite",
  "classes": ["PLACEMENT"],
  "authority": ["Owner Decision", "Standard"],
  "environment": "staging",
  "baseSha": "<sha>",
  "canonicalSources": ["data/town-maps.js"],
  "allowedPaths": ["data/town-maps.js"],
  "conditionalPaths": [
    {
      "path": "index.html",
      "condition": "cache fingerprint update is required"
    }
  ],
  "forbiddenPaths": [
    "main.js",
    "data/world-objects.js",
    "assets/maps/objects/shops/**"
  ],
  "expectedChanges": [
    "curry shop placement x changes by +2 world px"
  ],
  "staticChecks": ["scene contract"],
  "manualChecks": ["walk past shop", "approach entrance", "interaction"],
  "impactChecks": [
    "scene.rendering",
    "scene.collision",
    "scene.interaction",
    "scene.editor-desk",
    "scene.validation",
    "scene.transition-adjacency"
  ],
  "impactExclusions": [],
  "promotion": "none"
}
```

`tools/change-scope-guard.cjs` はこのshapeを最小入力として使う。trusted high-risk gateではv0.2のみを認定し、v0.1はhistorical/legacy入力として扱う。
巨大なchange databaseは作らない。

---

## 15. Scope Guard v0.2

Scope Guardは、Change Planのpath契約と実際のGit diffを比較する読み取り専用ツールである。
意味上の正しさ、`expectedChanges` の達成、manual checkの完了までは自動認定しない。

基本:

```sh
# worktreeを検査。tracked変更に加えてuntracked fileも対象になる
node tools/change-scope-guard.cjs --plan /tmp/yumaniwa-change-plan.json

# commit済みの変更をbaseShaからHEADまで検査
node tools/change-scope-guard.cjs --plan /tmp/yumaniwa-change-plan.json --head HEAD

# JSON出力
node tools/change-scope-guard.cjs --plan /tmp/yumaniwa-change-plan.json --head HEAD --json
```

Planをrepository内へ一時保存すると、そのPlan自体も変更pathとして検出される。
原則としてrepository外の一時ファイルか `--plan -` のstdinを使う。

判定順序:

1. `forbiddenPaths` に一致 → `FAIL`
2. `conditionalPaths` に一致 → 明示確認なしでは `SCOPE_REVIEW_REQUIRED`
3. `allowedPaths` に一致 → `PASS`
4. どれにも一致しない → `FAIL scope.out-of-scope`

`forbiddenPaths` は常に優先する。
`**` やroot起点の `**/*.js` などrepository全体を広く許可するpatternはPlan自体を不正として拒否する。

conditional pathを実際に変更した場合、その条件が成立したことを人間または実行主体が確認したうえで、Planに書いたpatternを明示する。

```sh
node tools/change-scope-guard.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --conditional-ok index.html
```

`--conditional-ok` は条件そのものを機械的に証明する機能ではない。
**条件成立を明示的に認めたという記録**であり、無言のscope拡張を防ぐためのもの。

exit code:

- `0`: path scope PASS
- `1`: `FAIL` または `SCOPE_REVIEW_REQUIRED`
- `2`: Plan / CLI / Git入力が不正、または実行不能

`--head`を省略するとbaseShaと現在worktreeを比較する。
`--head`を指定するとbaseShaから指定commit/refまでを比較する。
baseShaが対象HEADのancestorでない場合は比較を拒否する。

Scope Guard PASSは**変更pathがPlan内だったことだけ**を意味する。
Validator、test、manual verification、Owner/HQ判断の代わりにはならない。

---

## 16. Impact Check v0.2

`tools/change-impact-rules.cjs` は、代表的な正本pathから「確認を忘れてはいけない影響」を導くRule台帳である。
`tools/change-impact-check.cjs` は、Scope Guardと同じbaseSha→diffを読み、変更pathに対応するImpact IDがPlanで扱われているか確認する。

v0.1の主なRule対象:

- `data/works.js`
- `data/town-maps.js`
- `data/station-plaza.js`
- `data/world-objects.js`
- `data/work-search-meta.js`
- `tools/generate-work-search-pages.cjs`
- `data/ghost-dialogue.js`
- `data/updates.js`
- `town-interaction-flow.js`
- `main.js`
- `town-analytics.js`

基本:

```sh
node tools/change-impact-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json

node tools/change-impact-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --head HEAD

node tools/change-impact-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --head HEAD \
  --json
```

登録済みImpactは、Plan内で次のどちらかにする。

```json
{
  "impactChecks": [
    "works.venue-menu",
    "works.direct-route"
  ],
  "impactExclusions": [
    {
      "id": "works.analytics-id",
      "reason": "work id is unchanged; description-only edit"
    }
  ]
}
```

判定:

- `impactChecks` にある → `PASS impact.declared`
- `impactExclusions` に理由付きである → `N/A impact.excluded`
- どちらにもない → `FAIL impact.missing`
- v0.2でexplicit Rule未登録かつhigh-risk fallbackにも該当しないpath → `INFO impact.no-rule`

README等の低リスク未登録pathはINFOを維持する。一方、runtime / HTML / CSS / SW / manifest / workflow / asset / Change OSはhigh-risk fallbackで確認を要求する。
一方、登録済みRuleに対しては「今回は関係ない」と無言で落とせない。

exit code:

- `0`: 登録済みImpactをすべて確認または理由付きN/Aとして扱った
- `1`: 未処理のImpactがある
- `2`: Plan / CLI / Git入力が不正、または実行不能

Impact Check PASSは**必要な影響をPlan上で忘れていないこと**だけを意味する。
各checkを実際に完了した証拠、manual verification、外部設定、Owner/HQ判断は別途必要。

Scope GuardとImpact Checkの役割は逆向きである。

```text
Scope Guard
  余計な変更をしていないか
        ↕
Impact Check
  必要な確認を落としていないか
```

---

## 17. Anti-Patterns

禁止:

- 実装後にPlanを初めて書く
- allowedPathsへrepository全体を入れる
- conditionalPathsを無制限の逃げ道にする
- generated fileを正本として扱う
- Owner Decisionを技術判断として埋める
- HQ_REQUIREDをPlan文言だけでStandard化する
- unrelated cleanupを混ぜる
- production反映をstaging依頼から推測する
- Scope Guardを通すためPlanを無言で広げる
- 実装後HEADへbaseShaを書き換えてdiffを消す
- shared runtimeをCONTENT/Liteと自己申告してrisk floorを回避する
- core ImpactをN/Aへ逃がす
- manual verificationをCI PASSで代用する

---

## 18. Operating Principle

```text
CHANGE OPERATIONS
  What kind of change is this?
          ↓
CHANGE PLAN
  What exactly may this change touch?
          ↓
IMPLEMENTATION
          ↓
SCOPE / IMPACT / VALIDATION
```

作者は「何を変えたいか」「何を守りたいか」「最終的に良いか」を保持する。

OSは、**変更範囲・正本・依存・検査・昇格を忘れない役**を引き受ける。

実装後に「どのSHAで何を確認したか」を固定する工程は `CHANGE-VERIFICATION.md` へ渡す。

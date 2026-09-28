# Yumaniwa Town Change Operations v0.2

制定: 2026-09-28

この文書は、湯間庭町への変更依頼を **どの重さの作業として扱うか** を決める正本である。

目的は、変更ごとに毎回ゼロから手順を考えないこと、軽い変更を過剰に重くしないこと、
大きな変更を軽作業として実装しないこと、そして staging → production の安全な一方向運用を維持すること。

新作公開の完成判定は `RELEASE-WORKFLOW.md`、
AIの判断権限は `AGENTS.md`、
日常運用は `OPERATIONS.md`、
Scene永続化契約は `tools/SCENE-DATA-CONTRACT.md`、
WORLD OBJECT / pixel規約は `YUMANIWA-PIXEL-STANDARD.md` を正本とする。

この文書はそれらを置き換えない。
**変更を分類し、どの契約と検査へ流すかを決める入口**として使う。

---

## 1. Core Flow

すべての変更は、規模に応じて次の流れへ乗せる。

```text
CHANGE REQUEST
    ↓
CLASSIFY
    ├─ CONTENT
    ├─ PLACEMENT
    ├─ ASSET
    ├─ WORK
    ├─ SYSTEM
    └─ WORLD
    ↓
AUTHORITY
    ├─ Standard
    ├─ Rule / Skill
    ├─ HQ Review
    └─ Owner Decision
    ↓
CHANGE PLAN
    ├─ Lite
    ├─ Standard
    └─ Full
    ↓
PLAN LOCK（high-risk / PR / promotion）
    ↓
BUILD IN STAGING
    ↓
SCOPE GUARD
    ↓
RISK GATE
    ↓
IMPACT CHECK
    ↓
STATIC VALIDATION
    ↓
MANUAL VERIFICATION
    ↓
VERIFICATION RECORD
    ↓
PROMOTION
    ↓
POST-DEPLOY VERIFICATION
```

変更内容を見た時点で、まず **Class と Authority** を決める。
実装を先に始め、後から分類を合わせない。

### 共通Phase

| Phase | 目的 | 完了条件 |
| --- | --- | --- |
| 0. Classify | 変更種別、影響範囲、正本、必要権限を決める | Class / Authority / 対象sourceが明確 |
| 1. Decide | Owner/HQ判断が必要な部分だけ先に確定 | 未決判断をコードで埋めていない |
| 1.5 Plan | `CHANGE-PLAN.md` に従いscope・正本・検査を実装前に固定 | PlanがREADYでrepository / base / authority / checksが明確 |
| 1.7 Lock | high-risk / PR / promotionではPlanをdigest固定 | 実装より前のPlan Lockが存在し、base / digestを後付け変更していない |
| 2. Build | stagingの正本へ最小変更を入れる | 二重管理・runtime patchを増やしていない |
| 2.5 Guard | Scope / Risk / Impactで、余計な変更・過少分類・確認漏れを照合 | Plan外path・risk floor違反・未処理Impactがない |
| 3. Validate | 契約・syntax・既存test・validatorで静的確認 | FAIL/HQ_REQUIREDを残さない、未確認はUNVERIFIED |
| 4. Verify | stagingで実際の見た目・操作・往復を確認 | 変更クラスに必要な手動確認が完了 |
| 4.5 Record | `CHANGE-VERIFICATION.md` に従いexact SHAへ確認結果を固定 | locked Plan / repository / Scope / Risk / Impact再評価＋必要evidenceが揃う |
| 5. Promote | productionへ必要差分だけ昇格 | branch → PR → Safety Checks → merge |
| 6. Verify Production | 本番配信と実URL/実操作を確認 | 対象SHAのPages成功＋本番確認 |

stagingだけを目的とする変更でも、VERIFIEDと呼ぶ場合は Phase 4.5 まで行う。
単なる作業途中・試作ならVERIFIEDと呼ばずPhase 4以前で止めてよい。
production反映を依頼された場合だけ Phase 5–6へ進む。

repositoryを変更する作業では、Class / Authority確定後、実装前に [CHANGE-PLAN.md](CHANGE-PLAN.md) のLite / Standard / Fullいずれかで実行範囲を固定する。実装中にPlan外の変更が必要になった場合は先に止めてPlanを再評価し、実装後に都合よくscopeを広げない。

high-risk path、Change OS自身、staging PR、production昇格の根拠にする変更では、実装前にPlan Lockを作る。`tools/change-risk-policy.cjs` が示す下限より軽いClass / Plan / Authorityへ自己申告で落とさない。locked baseShaを変更後HEADへ差し替えてdiffを消すことを禁止する。

stagingをVERIFIEDと呼ぶ前に [CHANGE-VERIFICATION.md](CHANGE-VERIFICATION.md) のRecordで、確認対象SHAとPlan上のcheck結果を固定する。CI成功だけでOwner実機確認を代用しない。

---

## 2. Change Classes

### CONTENT

**意味:** 既存schema・runtime・identityを変えず、文面や表示内容だけを変更する。

例:
- おばけのセリフ
- 更新履歴の文面
- 既存作品の紹介文の微修正
- 既存ラベルの表現調整

既定Authority:
- 承認済み意図の反映: **Standard**
- 世界観・作品の味・公開コピー: **Owner Decision**
- data schemaや生成契約を変える場合: **HQ Review**

原則:
- 文面変更のためにschemaを増やさない。
- Validatorに文体の好みを判定させない。
- 作品の意味や固有名を勝手に変更しない。

---

### PLACEMENT

**意味:** 既存WORLD OBJECT / prop / triggerを、既存scene内で移動・微調整する。

例:
- 建物を右へ2px
- ベンチを少し下げる
- 既存看板のtap範囲を見た目に合わせる

既定Authority:
- 置きたい場所・見た目の最終判断: **Owner Decision**
- 承認済み位置への座標反映: **Standard**
- 新しいcollision意味・新interaction方式: **HQ Review**

正本:
- 駅前: `data/station-plaza.js`
- その他scene: `data/town-maps.js`

原則:
- `data/world-objects.js` にlive座標を持たせない。
- x/yだけを変える場合、asset identityやPNGを変更しない。
- 見た目を動かしたら collision / interaction / tap の絶対world位置も確認する。
- runtime fixで同じplacementを二重登録しない。

---

### ASSET

**意味:** 町に置く画像・WORLD OBJECT identity・canonical assetを追加または変更する。

例:
- 新しい建物
- 新しい店舗
- 新しい街灯
- 既存建物画像の正式差し替え

既定Authority:
- 採用画像・見た目・町での大きさ: **Owner Decision**
- 既存TARGET/profileの選択: **Rule / Skill**
- 新TARGET、新canonicalization方式、新asset contract: **HQ Review**

標準pipeline:

```text
Map Factory / source asset
    ↓
Yumaniwa Cleaner
    ↓
logical canvas / content bounds / ground anchor
    ↓
Town canonical asset
    ↓
data/world-objects.js
    ↓
scene placement
```

原則:
- 物理PNG寸法をTown scaleとして扱わない。
- `1 logical asset pixel = 1 Yumaniwa world pixel` を維持する。
- Asset identityとPlacementを分離する。
- placementSnapshotはlive正本にしない。

---

### WORK

**意味:** 作品の町内ライフサイクルを変更する。

例:
- 新作追加
- 作品更新
- menu-only → physical
- 作品のRetirement
- Hard Delete

既定Authority:
- 作品名、配置、残す/消す、公開時期: **Owner Decision**
- 既存Release Standard内の追加: **Standard / Rule**
- Retirement contractの新設、URL/identity変更、Hard Delete: **HQ Review**

新作公開:
- `RELEASE-WORKFLOW.md` の五つのReadyを使う。
- Search / Share v2は `data/work-search-meta.js` → generatorの契約を使う。
- stagingの `status: open` をproduction公開許可と解釈しない。

Retirement:
- **Retireを既定、Hard Deleteを別判断**とする。
- 過去の `data/updates.js` は町の歴史として原則消さない。
- menu、physical trigger、ghostの現役誘導、Search page、sitemapを一体で確認する。
- 初回Retirement Standard確立まではHQ Review対象。

---

### SYSTEM

**意味:** 複数作品・複数sceneが共有するUI、runtime、保存、analytics、生成方式、共通契約を変更する。

例:
- 展示ガイドのpagination
- 共通playerの変更
- scene transition lifecycle変更
- Search generator変更
- analytics体系変更
- Service Worker方針変更

既定Authority:
- **HQ Review**

Owner Decisionが必要な場合:
- UXの見え方・残す/削る・公開仕様に関わる選択。

原則:
- まずUX / state / source-of-truth契約を決める。
- dataをUI都合で複製しない。
- 一作品だけを直すruntime patchで共通問題を隠さない。
- 新しい仕組みは代表caseだけでなく境界caseをtestする。

---

### WORLD

**意味:** 町の地理、scene、venue、移動関係を変更する。

例:
- 新しいマップ
- 新地区
- 新venue
- scene AとBの新しい出入口
- 駅前案内図の地理そのものの変更

既定Authority:
- 町の地理・名称・どこにつながるか: **Owner Decision**
- scene/navigation契約の変更: **HQ Review**

原則:
- コードより先に地理を決める。
- scene ID、入口、出口、spawn、map size、background、routingを先に明示する。
- 既存transition lifecycleを再利用し、scene専用fadeを増やさない。
- A→新scene→BだけでなくB→新scene→Aも確認する。

---

## 3. Authority Rules

### Standard

既存契約の範囲内で、入力が決まっている機械的作業。

AIは毎回同じ承認を聞き直さず実行してよい。
ただしproduction反映の許可へ自動拡張しない。

### Rule / Skill

既存の明文化ルールからprofileや検査を選ぶ作業。

例:
- 既存WORLD OBJECT TARGETの選択
- 既存launch/frameModeの適用
- Conditional testの選択

適用したRuleを記録する。

### HQ Review

既存契約そのものを変える変更。

HQでは最低限、次を決めてから実装する。

1. 現在の正本
2. 何が不足しているか
3. 既存方式で収まらない理由
4. 最小拡張
5. 他作品/sceneへの影響
6. migration / compatibility
7. test
8. rollback

### Owner Decision

作品や町の意味、味、見た目、残す/消す、公開時期など、人間が保持する判断。

AIは候補提示・比較・実装準備まで行えるが、勝手に決定しない。

---

## 4. Classification Rules

変更が複数Classにまたがる場合は、**最も重いClassだけに潰さない**。
必要なsubflowを併記する。

例:

> 新しいカレー屋の建物を作って灯串横丁へ置く

```text
ASSET
  └─ canonical asset / WORLD OBJECT
PLACEMENT
  └─ town-maps.jsへ配置
```

> 新しい作品を、専用展示物付きで公開する

```text
WORK
  ├─ Release Workflow
  ├─ Search / Share
  └─ town awareness
ASSET
  └─ exhibit asset
PLACEMENT
  └─ prop / trigger / workId
```

> 新地区を作り、そこへ新作品を置く

```text
WORLD  ← HQ + Owner
WORK
ASSET
PLACEMENT
```

上位Classの設計判断が未決でも、独立して安全な素材整理や調査は進めてよい。
ただし未決判断を仮の実装で固定しない。

---

## 5. Standard Playbooks

### A. 新しい建物アセットを町に置く

**Class:** ASSET + PLACEMENT

1. 最新staging HEAD、対象scene、既存scale referenceを確認。
2. Ownerが採用画像と町での大きさを決める。
3. Map Factory / Cleanerでcanonicalize。
4. logicalCanvasPx、contentBounds、groundAnchorY、physical fileを確認。
5. `data/world-objects.js` へidentity/src/finalization metadataを登録。
6. Editorでplacementを作る。
7. 駅前は `data/station-plaza.js`、その他は `data/town-maps.js` へDesk経由で反映。
8. collision / interaction / tapを確認。
9. Scene Contractのtestを実行。
10. stagingで大きさ、foot、前後関係、通路、接近、tapを実機確認。
11. production反映を依頼された場合のみ昇格。

新しいTARGETやWORLD OBJECT schemaが必要ならHQへ上げる。

---

### B. 建物の位置を少し調整する

**Class:** PLACEMENT

1. 最新sourceとbefore/hashを確認。
2. Editorでx/yを調整。
3. w/hを変えないならasset/PNG/world-object identityは触らない。
4. collision / interaction / tapのabsolute world位置を確認。
5. Deskのsource/before/hash/scene validationを通してstagingへ反映。
6. Scene Validator。
7. stagingで歩行、接近、通路、tapを確認。
8. 必要ならproductionへ昇格。

既存schema内の単純移動はStandard。
「少し動かす」ためにruntime offsetを追加してはならない。

---

### C. 新しいマップを追加する

**Class:** WORLD

1. **実装前HQ Review**。
2. Ownerがsceneの意味、名前、町のどこにつながるかを決める。
3. scene ID、map size、background、spawn、入口/出口、edge routingを設計。
4. 既存scene profileと契約で実現できるか確認。
5. `data/town-maps.js` へscene正本を追加。
6. 必要なWORLD OBJECT / placementを別Classとして追加。
7. 既存transition lifecycleへroutingを接続。
8. scene validationとinteraction/transitionの関係testを実行。
9. stagingで A→新scene→B / B→新scene→A、入力保持、連打、戻りを確認。
10. production候補では新sceneだけでなく接続元/接続先の差分も確認。

新scene専用の一時patchや独自fadeを増やさない。

---

### D. 既存作品を町から外す

**Class:** WORK / RETIREMENT

既定は **Retire**。ファイル物理削除は自動で行わない。

1. Ownerが「町から引退」か「完全削除」かを決める。
2. 初回Retirement Standard確立まではHQ Review。
3. Retireなら `data/works.js` の公開状態を変更。
4. physical展示があればprop/trigger/workIdを撤去。
5. ghostの現役誘導を整理。
6. 過去の `data/updates.js` は原則保持。
7. Search pageを「公開終了として残す / redirect / remove」のどれにするかHQ契約に従う。
8. sitemapを同じ方針へ合わせる。
9. menu、direct route、Search、ghost、physical triggerに孤児参照がないか検査。
10. staging確認後にproductionへ昇格。

Hard DeleteはOwner Decision + HQ Review。
既存URL、検索履歴、町の歴史を消すのでRetireと同一作業にしない。

---

### E. 展示ガイドをページ制にする

**Class:** SYSTEM

1. **実装前HQ Review**。
2. UX contractを決める。
   - page size
   - order
   - 前へ/次へ
   - page indicator
   - 1ページ時の表示
   - 作品を開いて戻った時のpage保持
   - keyboard/touch
3. 作品の正本 `WORKS` は分割しない。
4. `getVisibleWorksForVenue()` 等で得た一覧に、表示層だけpaginationを適用。
5. 0件 / 1件 / pageSize / pageSize+1 / 最終ページをtest。
6. 作品追加でmanual menu更新が不要な性質を維持。
7. mobileで誤tap、scroll、戻る、作品起動を確認。
8. representative venue / workで回帰。
9. productionへ昇格。

paginationのために第二の作品一覧を作らない。

---

### F. おばけのセリフを変える

**Class:** CONTENT

1. `data/ghost-dialogue.js` の対象だけを編集。
2. work IDやdata schemaを変えない。
3. JS syntaxと対象keyを確認。
4. 必要ならWorld Consistency / Subtraction観点で文面review。
5. stagingで対象会話を実際に表示。
6. ランダム候補を変えた場合は全候補を目視。
7. production反映を依頼された場合だけ通常昇格。

Validatorは「必要な作品会話が存在する」ことは確認してよいが、
おばけらしさ・文章の良し悪しをscore化しない。

---

## 6. High-Risk Gate

path-level classificationの下限は `tools/change-risk-policy.cjs` を正本とする。

代表例:

- Change OS / workflow / shared runtime / root HTML-CSS / Service Worker / manifest
  → SYSTEM / Full / HQ Review
- work固有runtime
  → WORK / Standard以上
- canonical asset
  → ASSET / Standard以上
- 新規・未登録の実行可能path
  → high-risk review

high-risk profileが要求するcore ImpactはN/Aへ除外できない。
profileのImpactを全部除外して確認なしで閉じることもできない。

日常CONTENT / PLACEMENTを一律Fullへ上げない。
危険なpathを軽い依頼文で触ろうとした場合だけ、実path側のrisk floorを優先する。

staging PRでは `.github/workflows/change-pr-gate.yml` がPlan Lockの順序・固定性とScope / Risk / Impactを検査する。
ただしworkflowが存在するだけではmerge強制にならない。
repository側でrequired check / merge protectionが設定されていることを確認できるまでは、
**hard enforcement済みとは呼ばない。**

---

## 7. Validation by Class

### CONTENT
- syntax
- key / reference存在
- 生成物ならsource-of-truthとの一致
- staging目視

### PLACEMENT
- Scene Contract
- before/source/hash
- collision / interaction / tap
- walk / approach / adjacent passage

### ASSET
- Pixel Standard
- canonical src
- WORLD OBJECT identity
- physical file verification
- placementとの分離
- scene rendering

### WORK
- `RELEASE-WORKFLOW.md`
- Release Validator
- Search / Share generator + validator
- town awareness
- launch / return / re-entry
- retirement時はorphan参照確認

### SYSTEM
- 契約test
- boundary cases
- representative existing cases
- mobile / desktop where relevant
- rollback path

### WORLD
- Scene Contract
- route/spawn/edge relation
- round trip
- transition lifecycle
- existing neighboring scenes

CIやValidatorがPASSでも、手動確認が必要なClassではPhase 4を省略しない。

---

## 8. Promotion Rules

productionへ反映する場合はClassを問わず既存ルールを使う。

```text
verified staging
    ↓
production base確認
    ↓
必要差分だけをcandidate branchへ
    ↓
PR
    ↓
Production Safety Checks
    ↓
merge
    ↓
Pages
    ↓
production manual verification
```

禁止:
- staging全体をproductionへ丸ごとコピー
- staging-only debug/noindexの混入
- 未承認のstaging open作品の巻き込み
- production mainへの通常時の直接編集
- validatorを通すための検査弱化
- force pushで履歴を消す

---

## 9. Minimal Change Record

大きな台帳は新設しない。
PR本文、作業報告、監査記録など一箇所へ、必要な場合だけ次を記録する。

```text
Change:
Class:
Authority:
Staging base SHA:
Scope:
Canonical sources:
Owner decisions:
HQ decisions:
Validation:
Manual verification:
Production base/candidate:
Rollback:
Remaining UNVERIFIED:
```

単純なCONTENT/PLACEMENT変更では簡略化してよい。
SYSTEM/WORLD/Retirementでは省略しない。

---

## 10. Escalation Rules

次の場合、現在のClassが軽く見えてもHQへ上げる。

- 新しいsource-of-truthが必要
- 同じ値を二箇所で持つ必要が出た
- runtime patch / compatibility例外が必要
- ID / URL / save key / canonicalを変更する
- 新しいscene navigation
- 新しいlaunch / frameMode / venue
- 共通UI / analytics / Service Worker /保存方式を変える
- Validatorの既存FAILを「仕様だから」と弱めたくなった
- 一作品の例外が他作品へ広がりそう

逆に、既存契約の範囲内の座標変更や文面変更をHQ化しない。

---

## 11. Operating Principle

湯間庭町のOSは、作者の判断を置き換えるためではない。

作者が保持するもの:

```text
SENSE   違和感・手触り・味
DECIDE  町や作品の意味に関わる最終判断
```

OSへ渡すもの:

```text
CLASSIFY  変更種別の判定
ROUTE     必要な契約・testへの振り分け
EXECUTE   定型作業
VALIDATE  抜け・矛盾・孤児参照の検出
PROMOTE   stagingからproductionへの安全な昇格
```

目標は、作品・建物・sceneが増えても、
**運用上の注意事項を作者の頭の中へ同じ速度で増やさないこと**である。

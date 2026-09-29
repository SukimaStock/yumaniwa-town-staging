# 湯間庭町 安全運用ルール

湯間庭町は **staging を次の本番状態の正本**として扱う。

- 日常の編集・作品追加・町の調整は `yumaniwa-town-staging`
- YumaniwaDesk は staging 専用
- 本番 `yumaniwa-town` は直接編集しない
- 本番反映は production 用 branch → PR → Production Safety Checks → merge
- 緊急で本番を直接修正した場合も、同じ修正を必ず staging へ戻す

変更依頼を受けたら、実装前に `CHANGE-OPERATIONS.md` で CONTENT / PLACEMENT / ASSET / WORK / SYSTEM / WORLD に分類し、必要なAuthorityと検査を決める。
repositoryを変更する場合は続けて `CHANGE-PLAN.md` の Lite / Standard / Full Planで、repository・base SHA・正本・allowed/conditional/forbidden path・検査・手動確認を実装前に固定する。high-risk / PR / promotionではPlan Lockを先に作る。
詳細な昇格ルールは `RELEASE-WORKFLOW.md` も参照する。

画像アセット・WORLD OBJECTのピクセル基準は `YUMANIWA-PIXEL-STANDARD.md` を正本とする。

## 基本フロー

### 1. 作業前

1. Working Copy で `yumaniwa-town-staging` を開く。
2. Status を確認し、未コミット変更がないことを確認する。
3. Pull する。
4. `HEAD / main / origin/main` が同じコミットを指すことを確認する。
5. YumaniwaDesk を staging フォルダから起動する。
6. Desk 上部に **STAGING** と表示されていることを確認する。
7. YumaniwaDesk の「同期確認済み」を押してから編集を始める。

YumaniwaDesk が staging を検出できない場合は編集を開始しない。
production `yumaniwa-town` を検出した場合、Desk は接続・書き込みを拒否する。

### 2. YumaniwaDesk で編集

日常的な町のデータ更新は、原則として YumaniwaDesk から staging に行う。

主な対象:

- `data/notes.js`
- `data/works.js`
- `data/updates.js`
- `data/station-plaza.js`
- `data/town-maps.js`

保存前後に Desk の安全確認を通し、意図しないファイルを変更しない。

### 3. Working Copy で確認・Push

YumaniwaDesk で更新した後は、必ず Working Copy で確認する。

1. Status を開く。
2. 変更ファイルを確認する。
3. 各差分を目視する。
4. 意図していないファイルが1つでもあれば Commit しない。
5. 内容が分かる Commit メッセージを付ける。
6. Commit → Push する。
7. `HEAD / main / origin/main` が再び一致したことを確認する。

## 推奨: Push 後の確認と本番反映を ChatGPT に依頼する

YumaniwaDesk で更新した内容を本番へ反映するときは、**staging へ Push した後に ChatGPT へ確認・反映を依頼する**のを推奨する。

例:

> staging を更新して Push しました。差分を確認して、問題なければ本番反映してください。

この依頼を受けたら、次の順で確認する。

1. staging の最新差分を確認する。
2. production 側に staging へ戻していない有効な修正がないか確認する。
3. staging 専用の `noindex`、debug、開発UI、実験ファイルが本番へ混ざらないことを確認する。
4. 作品追加時は entry、直リンク、Manifest、必要アセットに加え、`data/updates.js` の `workIds` 付き更新履歴と `data/ghost-dialogue.js` の `works[id]` 会話を必ず確認する。
5. 必要なら staging 側を先に修正して統合状態を作る。
6. production 用 branch に必要な差分だけを反映する。
7. PR を作成する。
8. `Production Safety Checks` の成功を確認する。
9. 問題がなければ merge する。
10. merge 後、staging と production に意図しない差分が増えていないことを確認する。

**ChatGPT が確認できるのは GitHub に Push 済みの内容だけ。**
Working Copy 内だけにある未Push変更は確認できないため、必ず先に Commit / Push する。

## ChatGPT が staging を変更した場合

ChatGPT が GitHub 上の staging を修正した後に YumaniwaDesk を使う場合は、先に Working Copy で Pull する。

古いローカル状態のまま Desk で編集を続けない。

推奨順序:

1. ChatGPT が staging を更新
2. Working Copy で Pull
3. Status が clean であることを確認
4. YumaniwaDesk を起動
5. 「同期確認済み」
6. 次の編集を開始

## Change Plan Lock / Risk Gate

日常の軽いCONTENT / PLACEMENTを一律PR化しない。

ただし次はhigh-risk routeを使う。

- Change OS / workflow
- shared runtime
- root HTML/CSS
- Service Worker / manifest
- 未登録の実行可能path
- production昇格の根拠にする変更
- staging PRとして扱う変更

high-riskでは実装前Planをv0.2でREADYにし、Plan Lockへ固定する。

```sh
node tools/change-plan-lock.cjs create \
  --plan /tmp/yumaniwa-change-plan.json \
  > /tmp/yumaniwa-change-plan.lock.json

node tools/change-plan-lock.cjs verify \
  --lock /tmp/yumaniwa-change-plan.lock.json
```

Planには `repository: "SukimaStock/yumaniwa-town-staging"` と実装前 `baseSha` を持たせる。
同じchangeIdのまま、実装後HEADへbaseShaを書き換えない。

high-risk pathの最小Class / Plan / Authority / Impactは `tools/change-risk-policy.cjs` を正本とする。

```sh
node tools/change-risk-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --root . \
  --head HEAD
```

Risk Gateは依頼文ではなく実際の変更pathから下限を導く。
たとえば `main.js` を「CONTENT / Lite」と書いてもSYSTEM / Full / HQ Reviewが必要になる。

core ImpactはN/Aにできない。
profileが要求するImpactを全件除外して閉じることもできない。

## Change Scope Guard

Scope Guardは固定baseShaから、実際に変更したpathがPlan内かを確認する。

```sh
node tools/change-scope-guard.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --head HEAD
```

判定は forbidden → conditional → allowed の順。
Plan外pathはFAIL。

worktree検査もできるが、staging VERIFIED / PR gateの根拠はcommit SHAを使う。

conditional pathは条件成立を確認した場合だけacknowledgeする。

```sh
node tools/change-scope-guard.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --conditional-ok index.html
```

conditional acknowledgementは意味上の正しさを自動証明しない。
cache-only変更のsemantic validationは別gateの責務。

## Change Impact Check

Scope / Riskの後、変更pathから必要なImpactがPlanへ入っているか確認する。

```sh
node tools/change-impact-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --head HEAD
```

v0.2ではexplicit Impact Rulesに加え、high-risk fallbackを持つ。

- known domain source → 既存の具体的Impact
- runtime / HTML / CSS / SW / manifest / workflow / asset / Change OS → high-risk Impact
- README等の低リスク未登録path → INFO

Impactは `impactChecks` へ入れるか、除外可能なものだけ理由付き `impactExclusions` とする。
core Impactは除外できない。

## Change PR Gate

high-risk staging変更はbranch + Plan Lock + PRで扱う。

`.github/workflows/change-pr-gate.yml` は次を検査する。

1. Plan Lockが実装より前に存在する
2. locked Planが後から変更されていない
3. locked baseShaが現在のPR base SHAと一致する
4. Scope Gate
5. Risk Gate
6. Impact Gate

workflowは `pull_request_target` で**PR base側の定義を実行**する。
candidate branchのworkflow定義を実行しないため、PR自身がgateをno-opへ書き換えて同じcheck名を偽装する経路を閉じる。
gateのJavaScriptもtrusted base checkoutから実行し、candidate checkoutはGit diff / Plan /対象fileのデータとしてだけ読む。

v0.2導入PRはbase側にこのtrusted workflow自体がまだ存在しないため、bootstrap例外として
既存CI・固定Plan・PR reviewによる確認を行う。merge後の将来PRではこの例外を使わない。

**重要:** workflowが成功しても、repository設定でrequired checkになっていなければGitHub上のmerge強制にはならない。
required check / merge protectionを確認できるまでは「hard enforcement済み」と報告しない。

## Change Verification Record

Verification RecordはmutableなPlanではなくPlan Lock digestを参照する。

```sh
node tools/change-verification-check.cjs \
  --lock /tmp/yumaniwa-change-plan.lock.json \
  --record /tmp/yumaniwa-verification.json \
  --root . \
  --head HEAD
```

Recordは次をlocked Planと一致させる。

- changeId
- planDigest
- planRevision
- repository
- change
- baseSha
- verifiedSha

checkerはScope / Risk / Impactを同じtargetへ再計算する。

manual checkは実際に確認した主体だけがPASSにする。
ChatGPTがiPhone画面や音を観測していない場合はOwner確認待ち。

C3-2以降、high-risk PRの `staticChecks` は
`tools/change-static-check-registry.json` のbase-owned IDとして扱う。

base-owned `tools/change-static-check.cjs` は、

1. immutable Planのbase SHA
2. eventのexact candidate SHA
3. base-owned registry blob
4. base-owned Risk Policy blob
5. base-owned Static Executor blob

を固定してからcandidate Git objectを検査する。

`change-operations-regression` はsecurity-critical Change OS fileを
registryの事前承認exact blobへ照合する。

candidate registryはcurrent PRのexecutor dispatchには使わないが、
変更されたcandidate registry自体はbase-owned executorがinert dataとして検査する。
`registryTransition` FAILはstatic全体をFAILさせる。

通常のcontract変更:

1. steady baseからregistry-only authorization PRを作る。
   candidateは `pending:<path>:<fromBlob>:<toBlob>` とし、対象fileはfromBlobのまま。
2. merge後のpending baseからfresh PRを作る。
   対象fileをexact toBlobへ変更し、candidate registryをsteadyへ戻す。
3. base-owned executorがpending→steady cleanupまで検証する。

contract pathの追加/削除、unrelated drift、same-PR自己承認、pending retargetは許可しない。
C3-2導入時の3段bootstrap（preauthorization → executor install → cleanup）は一度限りで、
通常の将来変更では上記2 PRを使う。

`node-syntax` はcandidate codeを実行せずparseだけ行う。
candidate module / test / workflow / Plan commandはtrusted runnerで実行しない。
unknown IDはFAIL、非該当はN/AでありPASSではない。

Static Evidenceはrun ID + run attempt単位のartifactへ保存し、
static exitを既存ruleset-required `trusted-mechanical-evidence` jobの最終判定に含める。

C3-2でも `verificationState` は `UNVERIFIED`。
文字列evidenceをtrusted human/static evidenceへ読み替えない。

C3-3ではまず、base-owned `tools/change-verification-check.cjs attest` を
standalone verifierとして導入する。
これはGitHub event / trusted PR metadata / immutable Plan Lock / verifier blobを入力として、
manual check attestationのmachine evidenceを生成する。

verifier単体導入時点ではlive `issue_comment` workflowは存在しない。
したがってcommentを書くだけでattestationが成立するわけではない。

初期C3-3のattester policyはrepository owner本人だけとする。

- trusted GitHub eventの `repository.owner` が `type=User`
- owner login / numeric user IDがcomment userとsenderの両方に一致
- `author_association` はprovenanceのみ
- collaborator / organization member / delegated reviewerは自動的にOwner扱いしない
- organization-owned repository / delegationが必要になった場合は別のChange OS変更として扱う

Human Attestation artifactを生成できるようになっても、Verification Record v0.3への最終統合までは
`verificationState=UNVERIFIED` を維持する。

`Verification: VERIFIED` はstaging SHAの確認完了であり、production公開許可やRelease Completeではない。

## Search / Share v2 の生成

Search / Share v2 では、町内runtimeと検索・共有面の正本を分ける。

- `data/works.js`: 町内runtime / identity / launch の正本
- `data/work-search-meta.js`: 日英文面・検索語彙・schemaType の正本
- `tools/generate-work-search-pages.cjs`: 日英Searchページとsitemapのgenerator
- `w/<id>/index.html`、`en/w/<id>/index.html`、`sitemap.xml`: 生成物。直接編集しない

generatorは staging の `status: open` 集合を自動採用しない。必ず、今回productionへ公開してよい**全作品集合**を `--published` に明示する。

staging生成例:

```sh
node tools/generate-work-search-pages.cjs \
  --env staging \
  --published orbit,diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window \
  --write

node tools/generate-work-search-pages.cjs \
  --env staging \
  --published orbit,diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window \
  --check
```

productionではmainへ直接生成しない。production candidate branchで `--env production` と明示した全公開集合を使い、生成後に `--check` を通す。

metadataが存在するだけでは公開対象にならない。たとえばCoffeeFactoryのSearch metadataがstagingにあっても、Owner承認・必要素材・Release対象集合に入るまではproductionへ含めない。

## 本番反映前の確認

少なくとも以下を確認する。

- staging で対象機能が正常に動く
- staging にだけ残す実験コードやデバッグコードが本番へ混ざらない
- production にだけ存在する有効な修正がない
- production にだけ修正がある場合は先に staging へ戻す
- staging の `noindex,nofollow` を production へ持ち込まない
- production の `main.js` は `DEV_MODE_ENABLED = false` を維持
- production の開発UIは通常アクセスで表示されない
- 作品追加時は町内導線・直リンク・Manifest・必要アセット・`data/updates.js` の `workIds` 付き更新履歴・`data/ghost-dialogue.js` の `works[id]` 会話を確認
- 既存公開URLを壊していない

## staging と production がずれた場合

双方に独自変更がある場合、どちらか一方で丸ごと上書きしない。

1. 共通ファイルの差分を一覧化する。
2. staging にだけあるファイルを確認する。
3. production にだけあるファイルを確認する。
4. production にしかない有効な修正を staging へ戻す。
5. staging 専用差分を明確にする。
6. staging で統合状態を確認する。
7. 統合済み staging を基準に production へ昇格する。

## staging 専用として残してよいもの

例:

- ルート `index.html` の `noindex,nofollow`
- staging 用の開発UI
- debug スクリプト
- 実験用ファイル
- staging 専用 Service Worker キャッシュ名
- staging だけで使用する検証資料

これらを production へ丸ごとコピーしない。

## production の変更ルール

GPT / ChatGPT から production `main` へ直接書き込まない。

本体挙動・公開条件・安全装置・作品公開を含む production 変更は、原則として:

1. branch を作る
2. 必要な差分だけを入れる
3. PR を作る
4. 差分を確認する
5. Production Safety Checks を通す
6. merge する

production 固有の次の条件を守る。

- `index.html` に `noindex` を入れない
- `main.js` の既定値は `DEV_MODE_ENABLED = false`
- 本番の開発機能は `?dev=1` の明示時だけ有効
- `developer-access.js` は `main.js` より後に読み込む

## 緊急で production を直接修正した場合

障害対応などで本番を先に修正した場合、その修正を放置しない。

1. 本番修正を確認する。
2. 同じ修正を staging へ戻す。
3. staging で統合状態を確認する。
4. 以後は再び staging → production の通常フローへ戻す。

## やってはいけないこと

- YumaniwaDesk で production を直接編集する
- staging と production の片方をもう片方へ丸ごと上書きする
- 古いローカルフォルダを Working Copy へ上書きする
- `main` に force push する
- 差分を見ずに Commit / Push する
- ChatGPT が staging を更新した後、PullせずDesk作業を続ける
- DeskのバックアップをGitリポジトリ内へ戻す
- production 固有のSEO・公開設定を staging の内容で上書きする

## 事故時の戻し方

### Commit前

- YumaniwaDesk の「安全」→直前の更新を取り消す
- または Working Copy で変更内容を確認して Revert する

### Commit後・Push前

- Git履歴は残っているので、まず差分を確認する
- 必要なら新しい修正Commitを作る
- 履歴を書き換えない

### Push後

- force push で履歴を消さない
- 問題のCommitを打ち消す新しいCommitを作る
- staging / production の双方に影響がある場合は、先に正しい統合状態を staging で作る

## Commitメッセージ例

- `Town: adjust Tomogushi Alley layout`
- `Works: add new game entry`
- `Desk: add safety checks`
- `Fix: sync production correction back to staging`

`update` のように内容が分からない名前は、できるだけ避ける。

## 新作登録からRelease検査へ（Phase 2）

完成判定・URL役割・検査commandは `RELEASE-WORKFLOW.md` を正本とする。
この節は具体的な作業の接続だけを扱う。

1. Pull・clean・staging identityを確認する。対象ID、launch、venue、公開対象と除外を記録する。
2. embeddedは `works/<id>/` と依存を配置する。Engine利用作品は
   `engine/SUKIMASTOCK-NEW-WORK.md` の既存handoff/exportを使う。
   itchは最終upload番号と通常紹介URLを別に記録する。externalはHTTPS URL。
3. Deskで `data/works.js` へ登録する。完成済みfolderがある場合は「雛形から作る」をOFF。
   title/menuTitle/frameTitleは用途の違いを保つ。launch・frameModeを明示し、phoneは幅高さを指定。
4. **menu-only:** 既存施設の一覧はworksから生成される。画像・Editor・collisionを追加する必要はない。
   **physical:** Owner承認済み配置にobject→prop→trigger→workIdを接続する。
   新画像が必要な時だけFactory→Cleaner→WORLD OBJECT台帳へ。
   駅前は `data/station-plaza.js`、他sceneは `data/town-maps.js` が配置の正本。
   Editor diffをDeskのsource/before/hash/scene検証経由で適用する。
5. install metadata・共有素材と `data/work-search-meta.js` の日英metadataを準備し、明示した公開集合でSearch / Share generatorを実行する。`w/`・`en/w/`・sitemapは生成物として扱う。作品の公開状態とは別工程なので「作品を登録しました」を「公開完了」に言い換えない。
6. Deskのcache fingerprint更新を含めて差分を見る。手編集でも参照scriptのcache更新を確認。
   prop preloadはscene/objectを参照する。作品内部assetのpreloadは作品側で確認する。
7. `node tools/release-validator.cjs --env staging --ids <id>` を実行する。
   physicalなら `--physical <id>`。FAIL/HQを記録し、外部確認待ちを残す。
8. 新作の町内導線・直リンク・mobile/PC主操作・戻る・再入場、通常再訪を確認。
   同じlaunch/frameの既存作品1件、対象施設の出入り1経路を最小回帰とする。
   追加のConditionalはRelease Manualで選ぶ。
9. Status・差分・Commit/Pushを確認。production候補の作成・公開は許可された別工程として
   `RELEASE-WORKFLOW.md` へ渡す。

Phase 2時点の既知の赤は意図した検出結果。Diorama Calendar／路地裏マサラのページや
SteamClockのsitemapを、Validator実装と一緒に変更しない。

---

## Change Execution OS — 現在の終了点（2026-09-29）

Change Execution OSの大規模整理は、現在のtrust boundaryでいったん終了する。

日常運用で使うもの:

- Plan Lock
- Scope / Risk / Impact
- Trusted Static Evidence
- exact-blob contract
- required checks / ruleset
- staging-first / production分離

Human Attestationはrepository-owner-only verifierの**基盤まで**導入済み。
live comment workflowは有効化していないため、通常運用で追加操作は不要。

当面やらないもの:

- human attestationのlive化
- App投稿か人間直接投稿かの追加判定
- attester delegation
- Verification Record v0.3
- automatic VERIFIED
- Phase D / Phase E

これらを「残タスク」として日常的に追わない。
必要性が発生したときだけ、新しいChangeとして再評価する。

次の通常の町変更では、OSをさらに作るのではなく、
**今のOSを使って普通に制作する**。
その中で具体的な事故や過剰な摩擦が見つかった場合のみ、
その1 findingを1 work packageとして修正する。


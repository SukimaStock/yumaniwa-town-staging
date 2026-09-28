# 湯間庭町 安全運用ルール

湯間庭町は **staging を次の本番状態の正本**として扱う。

- 日常の編集・作品追加・町の調整は `yumaniwa-town-staging`
- YumaniwaDesk は staging 専用
- 本番 `yumaniwa-town` は直接編集しない
- 本番反映は production 用 branch → PR → Production Safety Checks → merge
- 緊急で本番を直接修正した場合も、同じ修正を必ず staging へ戻す

変更依頼を受けたら、実装前に `CHANGE-OPERATIONS.md` で CONTENT / PLACEMENT / ASSET / WORK / SYSTEM / WORLD に分類し、必要なAuthorityと検査を決める。
repositoryを変更する場合は続けて `CHANGE-PLAN.md` の Lite / Standard / Full Planで、base SHA・正本・allowed/conditional/forbidden path・検査・手動確認を固定してから実装する。
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

## Change Scope Guard

Change Planをmachine-readable JSONへした作業では、実装後に `tools/change-scope-guard.cjs` でbase SHAからのdiffを照合する。

```sh
# 未Commitを含む現在worktree
node tools/change-scope-guard.cjs \
  --plan /tmp/yumaniwa-change-plan.json

# Commit済みの変更
node tools/change-scope-guard.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --head HEAD
```

Plan JSONはrepository外へ置くか `--plan -` でstdinから渡す。repository内の一時Planは、それ自体が変更pathとして検出される。

判定は forbidden → conditional → allowed の順。Plan外pathはFAIL。
conditional pathを実際に変更した場合は、条件成立を確認したうえでPlanに宣言したpatternを明示する。

```sh
node tools/change-scope-guard.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --conditional-ok index.html
```

`--conditional-ok` は条件を自動証明しない。条件成立を明示確認した記録である。
Scope Guardのexit 0はpath scopeだけのPASSで、test・Validator・manual verificationの代わりではない。

GitHub上の変更をChatGPTが行い、同じ実行環境でScope Guardを直接起動できない場合も、
Change Planのbase SHAから実際のchanged pathsを比較し、forbidden / conditional / allowedの同じ規則で照合する。
Scope照合が未実施なら変更完了扱いにしない。

## Change Impact Check

Scope Guardの後、`tools/change-impact-check.cjs` で、変更pathから導かれる確認項目がChange Planに入っているか確認する。

```sh
# 未Commitを含む現在worktree
node tools/change-impact-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json

# Commit済みの変更
node tools/change-impact-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --head HEAD
```

Impact Rulesの正本は `tools/change-impact-rules.cjs`。
登録済みImpactは、Planで `impactChecks` に含めるか、`impactExclusions` に理由付きでN/Aを明示する。

`impactExclusions` は作業を省略するための無言の逃げ道ではない。たとえば「work idは変更していないためanalytics idはN/A」のように、なぜ今回不要かを書く。

v0.1でRule未登録のpathはINFO扱いで、Impact Check単独ではFAILにしない。Ruleは高信頼な正本から段階的に増やす。

Impact Checkのexit 0は、必要な影響をPlan上で忘れていないことだけを意味する。各確認の実施証拠、Validator、manual verification、Owner/HQ判断の代わりではない。

GitHub上でChatGPTが変更する場合も、base SHAからchanged pathsを取り、同じImpact Rulesで required impact → checked / reasoned N/A を照合する。

## Change Verification Record

Scope Guard / Impact Check / static test / manual checkが終わったら、`CHANGE-VERIFICATION.md` に従い確認対象commit SHAを固定する。

Verification Recordはrepositoryへ常設しなくてよい。staging-only Lite変更は作業報告、Standard / Full変更はPR本文・監査記録・作業報告などへ残す。

machine-readable Recordがある場合:

```sh
node tools/change-verification-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --record /tmp/yumaniwa-verification.json \
  --head HEAD
```

checkerはrecordに書かれたScope/Impact PASSを信用するのではなく、Planのbase SHAからverified SHAまでを再計算する。そのうえでPlanの `staticChecks` / `impactChecks` / `manualChecks` のevidenceが揃っているか確認する。

manual checkは実際に確認した主体だけがPASSにする。ChatGPTがiPhone画面や音を観測していない場合、Owner確認前にPASSとして記録しない。

確認後にHEADが進んだ場合、古いRecordを新HEADへ流用しない。新しいSHAに対して必要なcheckを再評価する。

`Verification: VERIFIED` はstaging SHAの確認完了を意味するだけで、production反映許可やRelease Completeを意味しない。

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

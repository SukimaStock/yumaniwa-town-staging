# 湯間庭町 安全運用ルール

湯間庭町は **staging を制作・探索の正本**として扱う。本番へは明示的に許可された差分だけを移す。

- 日常の編集・作品追加・町の調整は `yumaniwa-town-staging`
- YumaniwaDesk は staging 専用
- 本番 `yumaniwa-town` は直接編集しない
- 本番反映は production 用 branch → PR → Production Safety Checks → merge
- 緊急で本番を直接修正した場合も、同じ修正を必ず staging へ戻す

変更依頼を受けたら `CHANGE-OPERATIONS.md` で影響を確認し、[CHANGE-PLAN.md §1](CHANGE-PLAN.md#1-plan-level) の3ルートへ振り分ける。軽量対象ならPR本文の短いscopeと関連回帰だけで進め、対象外は従来の事前Plan Lockで保護する。
詳細な昇格ルールは `RELEASE-WORKFLOW.md` も参照する。

画像アセット・WORLD OBJECTのピクセル基準は `YUMANIWA-PIXEL-STANDARD.md` を正本とする。

## 日常開発の実行境界（2026-10-11）

まず変更の危険を「変更するファイル数」ではなく「**既存の何を壊し得るか**」で考える。

- **新しい隔離試作:** `works/<new-id>/` を中心にstaging-onlyで作り、仮説・手触りを自由に試す。最初から町への設置・production移行・公開用紹介文を要求しない。独立作品の操作テストを優先する。必要な場合のWork lifecycle `active` 登録は公開承認とは別。
- **既存作品の小変更:** 対象作品の期待動作を守り、影響先だけを確認する。Engine・共有町画面を安易に書き換えない。
- **共有画面／共通Engine:** 何を守るか、既存手段ではなぜ足りないかを先に判断する。新しい常時表示UIは具体案について作者の判断を得る。未決の選択を含まない既存UIの局所修正は、戻せる差分と関連CIを確認してstagingで試してよい。作者が見て採用・修正・撤回を選ぶ。共有契約・保存・既存動作の破壊には事前設計判断が必要。
- **部分的な取り消し:** 作者が「戻して」と指示した既知の変更は、過去のコミットとの差分から対象だけを戻す。無関係なSEO・作品改善を巻き戻さない。既存のCI必須チェックは維持する。
- **承認の繰り返しを減らす:** 明示的なstaging作業の中のbranch作成・commit・PR・通常の検査・安全なstagingマージについて、許可を小分けに求めない。staging試行と作者による採用、不可逆な変更、production反映、接続サービス固有の権限要求は区別する。

**現行CIの境界はCHANGE-PLAN §1へ集約。** 新作、active作品の小変更、証明可能な限定復元だけを軽量化し、共有契約・凍結等・productionの保護を維持する。機械PASSと実機確認を混同しない。

---

## 道具の使い分け

Workへ実装を任せる日は、iPhone側のGit操作は不要。作者は依頼と実機での体験判断に集中する。ローカル制作を始めるときだけWorking Copyを同期する。

| 道具 | 担当 | 普段は任せなくてよいこと |
| --- | --- | --- |
| ChatGPT Work | 最新main・PR・差分調査、実装、既存検査、branch/PR、許可されたstaging反映、公開候補・復旧の準備 | 作者の触感・音・採否の判断。指示のないproduction公開・サービス設定変更 |
| GitHub Web / アプリ | PRやActionsを作者が見たいとき、repository / Pages / 保護設定、公開判断 | Workが完了できるcommit、PR作成、検査結果収集を毎回手作業で繰り返すこと |
| Working Copy | iPhone/iPadのローカルGit、branch、差分、Commit/Push/Pull、Deskとのファイル接続 | Workだけで行った変更を、毎回ローカルへ取り込んで再Pushすること |
| YumaniwaDesk（Pythonista） | 素材登録、Editor差分の検証・適用、町のデータ編集、同じbranch内の直前Undo | Git操作。Workだけで完結する実装のために起動すること |
| Map Factory | 素材・部品棚・構成を作る。画像入り素材庫ZIPとRecipe/PNGを書き出す | Gitへの登録・公開 |
| Yumaniwa Cleaner（Codea） | PNGをピクセル基準へ仕上げ、完成PNG＋object.jsonを渡す | 配置・Git操作。FactoryやEditorに統合済みとは扱わない |
| Map Editor | 町の開発メニュー内で正式配置を編集。制作下書きは既存の別モードで仮配置・ZIP保存 | Gitへの直接保存。正式反映はDeskまたはWorkの既存検証経由 |
| その他の制作道具 | Audio Factoryの音/プリセット、Nudgeの修正仕様、Mixed Noteの下書き、必要なローカルアプリ | 不要なときの起動。端末内の導入版・動作はWorkから推測しない |

| やりたいこと | 最短の流れ | 作者が判断するところ |
| --- | --- | --- |
| 新しいゲームを作る | Workへ依頼 → 独立したworkをstagingで試す。Engine作品は既存`works/_starter/`、らくがきは別の`works/_template/` | 手触りを試す。町の設置・候補化・公開は別判断 |
| 既存作品を修正する | WorkがLifecycleと差分を確認 → 該当する軽量ルートまたは事前Lock → 関連回帰・PR | 変えた操作・画面・音だけ触って確認 |
| 町へ物を置く | 既存素材ならEditor → 差分/下書きZIP → Desk/Work。新素材ならFactory → Cleaner → Desk登録を追加 | 見た目と置き場所。座標が決まっていればWorkへ反映を任せられる |
| 共通Engineを更新する | Workが参照作品・保存/音/入力への影響を調べ、既存Full Plan・代表作回帰・Canaryで確認 | iPhoneの入力、音、復帰。旧作品の一括移行はしない |
| StagingからProductionへ出す | 作者が対象と今回の公開を明示 → Workが選別候補・PR・Safety Checks・配信後確認 | candidate化と実際の公開を別に指示する |
| 問題の変更を戻す | 「この変更だけ戻して」とWorkへ依頼 → 変更元を特定し、既存の部分復元または通常revert PR | 戻した体験。productionを戻すなら対象を明示する |
| iPhoneで制作する | Working Copyで同期・作業branch → Pythonista/Codea/Desk等 → 差分・Commit/Push → Workへ検査/PRを依頼 | 端末にしかない作業の保全と作品の体験 |
| Workへ実装を任せる | 目的・対象・守る体験を伝える → Workが調査からPR・関連検査まで行う | 必要な採否・実機判断。端末に未Push変更がある場合だけ先に知らせる |

現在の変更ルートは`CHANGE-PLAN.md §1`、確認状態は`CHANGE-VERIFICATION.md`冒頭を優先する。古いPhase記録やEngine v0.2の例を、新しい一律必須手順として使わない。一般Engineの新作入口は0.3のStarter、SukimaStock 3Dの独立Engineはそのwork内の契約が入口。

## Workへ任せる場合の基本フロー

1. 作者が対象・目的・守りたい体験を伝える。端末側に同じ対象の未Push作業があれば、その旨だけ先に伝える。
2. Workが最新main・関連PR・Lifecycle・現行契約を読み、独立branchを準備する。軽量対象外は**実装より前**にPlan Lockをcommitする。
3. Workが実装・関連回帰・差分確認・PR・required checksまで進める。許可された範囲の安全なstaging反映にも、同じ許可を聞き直さない。
4. 作者がstagingで変更した体験を確認する。iPhoneで制作を続ける場合だけ、下記のローカル同期へ進む。

作者がコードを書かない日は、Working Copy・Deskを経由する必要はない。Workの一時checkoutは長期バックアップではない。

### 実行環境の対応範囲

AGENTS.mdの実行方針は指示であり、設定機能や自動復旧機能を追加するものではない。以下は2026-10-14の確認範囲。開始時に実際の環境で再確認し、機能の有無を既存PR／報告へ短く残す。

| 環境 | モデル・エフォートと分担 | 再開の境界 |
| --- | --- | --- |
| このWorkセッション | spawn / followup / waitがあり、子エージェントのmodel / reasoning_effort指定欄あり。全履歴forkでは親を継承し、個別指定はforkなしで必要な文脈を渡す。現在の候補はツール定義が正本。メインモデルをこのターン内で変更する操作はない | GitHubへ保存して次のセッションで照合できる。プロセス停止後の自動起動は導入しない |
| Codexクライアント | 公式文書はサブエージェント、spawn指定やconfig.tomlのモデル／エフォート設定を案内。導入版・アカウント・管理設定・操作を確認して使う。本作業ではローカルCLI未導入で動作未検証。グローバル設定は変更しない | 利用可能なクライアントの再開操作とGitHub記録を併用。Workでの成功をCLI検証へ流用しない |
| Dots | このセッションから対応ツール・設定を確認できないため未検証。Workのspawn機能があると推定しない | 記録による引き継ぎ手順は利用できるが、自動起動・動的モデル変更は確認できるまで未対応扱い |

公式参照: [OpenAI Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)。利用可能なエフォート・モデル・並列枠は環境依存。公式の一般仕様と、このセッションで実行できた操作を区別する。

### 長時間作業の中断と再開

**保存先は既存の作業PR／Issue／作品の検証・作業記録を一つ選ぶ。** Change Plan / Lockは実装範囲の契約であり、進捗で上書きしない。新しい進捗schemaや台帳は不要。軽い作業に一律チェックポイントを要求しない。

長い検査・分担・区切りの大きな実装へ進む前、または節目に、次を短く更新する。

- 目的、確定仕様、許可範囲とproduction等の禁止範囲、参照する指示・Plan Lock。
- 完了／未完了／失敗、変更path、branch・commit SHA・PR、次に行う具体的な一手。
- テストの対象SHA・実行コマンド／CI run・結果、未確認の実機／作者判断、問題別の修正回数と試行結果。

成果は作業branchへcommit / pushし、PR本文や既存記録に参照を残す。未完成ならDraft PR等で保存し、mainへ未検査成果を積まない。PR前の節目はcommit本文に引き継ぎ要点を残してよい。書込権限等でremote保存できなければ、保存済み範囲と一時checkoutにしかない差分を報告する。新しい承認を無条件に増やさず、許可済み範囲の保存を進める。commitだけでpushしていない成果を次のセッションで利用可能と断定しない。

再開時は次の順で処理する。

1. 指示と既存の作業記録を読み、目的・保護対象・残作業・修正回数を取り出す。
2. GitHubの最新main、作業branch、関連PRのopen / closed / merged、commit、Actionsを取得する。ローカル差分も確認し、他の作業を上書きしない。
3. 記録と実際のファイル／diff／SHA／PRを照合する。閉じたPRはmergedと同義ではない。記録が古くても実装がmainにあれば再実装せず、残る検証や記録整理だけ扱う。branchが消えてもPR／merge commit／mainを調べる。
4. 完了・未完了・失敗・未確認を区別する。古いSHAの成功は新HEADの確認済み証拠にしない。差分が動いた範囲と必要な検査だけ再評価する。
5. 未完了だけ再開する。既存の許可範囲なら再指示を求めない。競合やscope変更で新branch / Lockが必要なら現行CHANGE-PLANに従い、旧Lockのbaseを書き換えない。実装済み差分を再利用し、作り直さない。

セッションの再開はLifecycleの `frozen → active` と別。セッション中断を理由に `freezeDecision` / `resumeDecision` を作らない。凍結作品そのものの開発再開は既存の作者指示が必要。

これは**再開したセッションが状況を復元する手順**。自動でWorkを起動し直す保証や、未保存のメモリを復元する機能ではない。中断が来る前に節目の成果をremoteへ残すことが前提となる。

## 基本フロー（iPhoneでローカル制作する場合）

### 1. 作業前（Working Copyで作業branchを選ぶ）

1. `yumaniwa-town-staging` の main をPullし、未コミット変更がないことを確認する。
2. `node tools/work-lifecycle.cjs --list`で対象workの制作状態を確認し、今回のChange Planを決める。AIに準備を任せる場合も、編集開始前に行う。
3. 最新mainから作業branchを作る。3ルートに該当すればPlan Lockなしで進められる。既知の取り消しは下記の「検証できる部分復元」へ。それ以外の作品状態・町・共有契約・データ登録などの変更は、最初のcommitにPlan Lockだけを登録する。
4. 作業branchを同名の `origin/<作業branch>` へPush・同期する。
5. そのbranchの `tools/YumaniwaDesk.py` を起動する。Deskの「編集branch」を確認する。
6. Working CopyでHEADと同名origin branchの一致、cleanなStatusを確認し、「同期確認済み」を押す。

Deskはbranch作成・checkout・Pull・Commit・Pushを行わない。Git操作はWorking CopyまたはAI側、町の編集はDeskの責務とする。
`.git` が見える場合はstagingのorigin・有効なbranch/HEADを検証し、main上の編集、detached HEAD、同名remote ref欠落、同期不一致を拒否する。
`data/repository-identity.json` の `branch: main` はrepositoryの既定branchを示す固定値で、作業branchごとに変更しない。

File Providerが `.git` を公開しない場合は、既存repository identity検査に加え、Working Copyで確認した作業branch名を毎回入力する。
これは**手動申告**でありGit状態の自動検証ではない。外部でbranchを切り替える前にDeskを終了し、切替後に再起動・再確認する。
Gitが見える環境でもbranch/HEADの変更後は再確認が必要。同期確認中にGitが見えなくなっても自動で手動方式へ切り替えない。

productionの検出・identity不一致では、従来どおり接続・書き込みを拒否する。

### 2. YumaniwaDesk で編集

日常的な町のデータ更新は、原則として YumaniwaDesk から staging に行う。

主な対象:

- `data/notes.js`
- `data/works.js`
- `data/updates.js`
- `data/station-plaza.js`
- `data/town-maps.js`

保存前後に Desk の安全確認を通し、意図しないファイルを変更しない。
Undoは更新時と同じ作業branchでのみ行う。別branchの履歴やbranch情報のない旧履歴は自動Undoしない。

### 3. Working Copyで確認 → 作業branchをPush → PR

1. Desk保存後、選択中の作業branchでStatusと全差分を確認する。
2. Plan外の変更があればCommitせず止める。
3. 作業branchへCommit → Pushし、staging/main宛てのPRを作る。
4. Scope / Risk / Impactと関連テストを確認し、`plan-risk-gate` と `trusted-mechanical-evidence` の成功を確認する。
5. 許可されたmergeを行った後、Working Copyでmainへ戻してPullする。次の編集は新しい作業branchから始め、fast-path対象外なら事前Plan Lockを用意する。

mainが進んでPlanのbaseが古くなった場合は `CHANGE-PLAN.md` の既存手順で、現在のmainからbranch/Lockを作り直す。
古いLockのbaseを書き換えたり、required checksを迂回したりしない。

## 推奨: Push 後の確認と本番反映を ChatGPT に依頼する

YumaniwaDesk で更新した内容を本番へ反映するときは、**作業branchのPRをstaging/mainへmergeした後に ChatGPTへ確認・反映を依頼する**のを推奨する。

例:

> staging のPRをmergeしました。差分を確認して、問題なければ本番反映してください。

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
Working Copy 内だけにある変更をWorkに調べてもらう場合は、保全してから専用branchへCommit / Pushする。ローカル変更がなければ、このためだけのCommit / Pushは不要。

## ChatGPT が staging を変更した場合

ChatGPTがGitHub上のstagingを修正した後にローカル制作を再開するときだけ、Working Copyを同期する。Deskを終了してから、Status（未コミット差分）とローカルbranchの未Push commitを確認する。

| ローカル状態 | 同期前に行うこと |
| --- | --- |
| clean・未Push commitなし | Workの変更がPR branchにあるかmainへmerge済みか確認してから、該当branchをPull |
| 未コミット変更あり | Pullやbranch切替の前に変更をローカル保全branchへCommitするか、既存Stash/ファイルコピーへ保存。保全操作を事前Plan済みの実装とみなさない |
| 未Push commitあり | 元のbranchを保持し、別名の保全branchでCommit/PushしてWorkへbranch名を渡す。クラウドbranchを同名で上書きしない |
| 同じbranchが分岐・競合 | 強制Push・Discard・古いフォルダの上書きをせず、両方を保全。Workが差分を選別し、最新mainから新しいbranch/必要なLockで統合する |

保全後も、古いbranchをmainへそのままmergeしない。Gitがcleanでも未Push commitがある場合がある。自動Pull/Pushを連続させず、送信先repository・branch・全差分を見てから操作する。

推奨順序:

1. ローカル作業を保全し、ChatGPTが変更したbranchを確認する
2. Working Copyでその作業branchを選択してPullする
3. Statusがclean、HEADが同名origin branchと一致することを確認する
4. YumaniwaDeskを起動し、表示された編集branchを確認する
5. 「同期確認済み」
6. 次の編集を開始する。mainへmerge済みなら新しい作業branchを準備し、fast-path対象外ならPlan Lockを作る

## 新作・制作ツールのLAB接続

新しいものを作る作業は、LABから触れられる入口を整えるところまで含む。別の更新依頼は不要。配置正本を変更する前に必要なscopeを固定し、作品とLABを同じ作業PRへ含める。共有台帳・LABを触る場合は既存の通常Plan Lockルートを使い、隔離軽量ルートの対象を拡張しない。

1. 最新main、Lifecycle、`data/lab-rooms.json` を確認する。既存配置・除外・URL別名を優先する。
2. 新しいworkは `data/work-lifecycle.json` に登録する。既定はactive / staging-only。作品名は制作依頼・既存作品の名前を使う。
3. 研究室が明確なら `data/lab-rooms.json` にwork IDと短い説明を登録する。制作ツールはTool Garage、凍結試作は既存のArchive。分類未指定の遊べるactive/candidate workはgeneratorがPrototype Benchの通常一覧へ自動追加するため、重ねて配置を複製しない。
4. `tools/<id>/` のWeb制作ツールは実在するindex.htmlを確認してTool Garageへ登録する。Web版がない道具は環境を明記する。素材、模型の追加や作品内の比較buildは既存入口から辿る。
5. `node tools/work-lifecycle.cjs --write-lab`、続けて `node tools/work-lifecycle.cjs --check` と `node --test tests/test-work-lifecycle.cjs` を実行する。生成HTMLを直接編集しない。
6. 重複・欠落・入口リンク・戻る動線を確認し、作品とLABの差分を同じPRで検査する。完了報告に接続先を短く記す。作者実機を確認していなければ未確認として残す。

作品を更新した場合は、入口・名称・説明・探索状態に変更があるときにLABを再生成する。個別作品の小変更でLABに差分がない場合は、接続確認のためだけに共有ファイルを変更しない。

これは制作担当AIが新作追加と同時に実行する運用であり、mainの更新を監視する常駐処理ではない。`--check` は生成漏れを検出するが、ファイルを自動修復しない。分類未指定のactive/candidateを見つけても、その発見から凍結・公開判断を行わない。

## Change Plan Lock / Risk Gate

現在のstaging/mainは全変更をPRで取り込む。軽いCONTENT / PLACEMENTのPlanまで一律Fullにはしない。

3ルート対象外の次の変更はhigh-risk routeを使う。

- Change OS / workflow
- shared runtime
- root HTML/CSS
- Service Worker / manifest
- 未登録の実行可能path
- production昇格の根拠にする変更
- staging PRとして扱う変更（隔離fast-path対象外）

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

worktree検査もできるが、確認記録 / PR gateの根拠はcommit SHAを使う。final VERIFIEDは現在保留。

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

初回bootstrapは完了済みで、通常の将来PRには使わない。契約変更は既存のregistry-only authorization → exact transitionの2段階を維持する。

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

このv0.2 checkerはRecordのschema / 内部整合を確認する。exit 0や旧出力 `VERIFIED` はtrusted evidence統合・実機確認の認証を意味しない。現在の正式なstateは `CHANGE-VERIFICATION.md` 冒頭に従い `UNVERIFIED` のまま。

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

Human Attestationの基盤は保留中。live comment workflowや追加の手動入力を通常運用へ持ち込まない。現行の意味と終了点は `CHANGE-VERIFICATION.md` を参照する。

旧checkerの `Verification: VERIFIED` を現在のstaging確認完了として報告しない。production公開許可やRelease Completeでもない。

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
  --published orbit,diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window,pumpoko \
  --write

node tools/generate-work-search-pages.cjs \
  --env staging \
  --published orbit,diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window,pumpoko \
  --check
```

productionではmainへ直接生成しない。production candidate branchで `--env production` と明示した全公開集合を使い、生成後に `--check` を通す。

metadataが存在するだけでは公開対象にならない。たとえばCoffeeFactoryのSearch metadataがstagingにあっても、Owner承認・必要素材・Release対象集合に入るまではproductionへ含めない。

### 公開後の検索観測と必要な改善

作品制作中はSEO準備を強制しない。公開時は既存のSearch / Share生成・Release検査を使い、公開済み作品だけを観測する。町・ゲームの常設SEO表示、専用ダッシュボード、新しい計測体系は追加しない。

- 正本: 公開集合は最新productionの `data/works.js` と公開PR、昇格状態はstagingの `data/work-lifecycle.json`。既に公開済みの作品は公開履歴と実配信を確認してreleasedを記録する。新作candidate化・production反映は従来どおり別判断。
- 週1回のレビューは既存のChatGPT「SukimaStock Ops Review」を利用する。Google DriveのSukimaStock / Analyticsにある最新のSearch Console書き出し（クエリ・ページ・日付、表示回数・クリック・CTR・平均掲載順位）とページ登録状況を読む。接続がなくても書き出しで始められる。直接接続は作者が選んだ場合だけ利用し、Drive接続をSearch Console権限とみなさない。
- 比較は取得日・集計期間・productionプロパティ・フィルタを揃え、同じ長さの前期間と比較する。集計遅れ、少数の表示、古い書き出し、匿名化されたクエリを明記し、未取得を0にしない。登録申請済みと登録確認済みを区別する。
- 現在のサイト計測はPlausible。GA4導入は必須にしない。Plausibleはproductionパス／作品IDを限定して流入・利用の補助指標を確認し、staging・itch.io等との合算や過去91日分を今回のSEO効果と扱わない。表示回数・順位・検索語はSearch Consoleで確認する。
- 報告は「全体の変化／反応のあった作品・検索語／問題ページ／次の改善候補（最大3件）」を短くまとめる。データがなければ未取得と必要操作だけ示し、検索結果の有無から需要量や順位を断定しない。変化や不備がなければ変更不要。
- 改善はまず `data/work-search-meta.js` の必要な日英title・説明文を対象にし、既存Generator → Validator → CIでstagingへ反映する。生成HTMLは直接編集しない。production公開は別工程。検索語のために作品の内容・名前・ジャンルを変えない。
- 過去作品とnoteの原典はGoogle DriveのSukimaStock / note・Code。既存記事から現行のSearch / Share URLへの自然な導線を検討し、記事更新・投稿は作者への改善案まで。既存OGPを維持し、新しい画像が必要なら実画面・既存素材を優先する。

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

## 検証できる部分復元

作者は「さっきのUI変更だけ戻して」と依頼すればよい。AIが次を実行する。

1. 依頼対象のPR・実装commitと差分を特定し、最新mainの後続変更を確認する。
2. 元の変更から取り消すハンクだけを選ぶ。関係のないSEO・別作品・後続改善を残す。
3. 復元commitの末尾に次の参照を記録する（JSONはAIが生成する）。

```text
Restore-Source: <exact single-parent implementation SHA>
Restore-Hunks: {"index.html":[12]}
```

4. `node tools/staging-targeted-change-proof.cjs --root . --base <最新base SHA> --head <候補SHA>` と関連回帰を確認し、両trusted CI後にstagingへ反映する。sourceへの逆差分と候補treeが一致しなければ軽量扱いを止める。
5. 実機確認が必要な箇所はUNVERIFIEDのまま作者へ示す。復元のために同じ作者選択を聞き直さない。productionは変更しない。

このルートの対象外・競合・安全契約の変更は従来のprotected routeへ戻す。新しいデザイン会議や別の承認台帳は作らず、必要なscope/checks/復旧だけを既存Planへ固定する。

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

## 探索記録と作品の昇格

制作状態は`data/work-lifecycle.json`、町のidentity/表示状態は従来の`data/works.js`。
台帳をWORKSの代わりに町へ読み込まない。titleは未登録試作の一覧表示用であり、町内作品の改名の正本ではない。
新workは台帳へactiveとして登録する。Desk・雛形・手編集による新作も、台帳未登録の間は自動的にactive/staging-only扱いとなり、productionチェックは拒否する。
`--list`はworks配下の未登録folderもactiveとして表示する（_starter/_templateは制作雛形）。
準備中でfolderがまだない既存WORKSもactiveとして記録する。

| ユーザーの指示 | 台帳・記録の変更 | production |
| --- | --- | --- |
| 新しいworkを作る | active / staging-only | 変更しない |
| これは凍結します | active → frozen、freezeDecision、ARCHIVE.md、theme、archive | 変更しない |
| production候補にします | active → candidate、candidateDecision | 変更しない |
| candidateをproductionへ反映してください | 対象IDと今回の指示参照をRelease記録へ。配信確認後candidate → released、productionInstruction / releaseEvidence | 既存の選別移送・PR・検証手順 |
| 凍結した作品を再開します | frozen → active、新しいresumeDecision。ARCHIVEは旧探索の記録として残す | 変更しない |

Decision fieldsは日付・指示内容・会話/issue等の参照を短く記録する。これらは人間がレビューする証拠であり、ユーザー許可を機械的に認証するものではない。AIが架空の指示参照を書いて許可を得た扱いにしない。

凍結時のARCHIVE.mdは今回の6記録を見本に、以下の8見出しを使う。
What we explored / Initial hypothesis / What we tried / What we learned / Why we stopped / What still feels interesting / Related prototypes / Playable staging URL。
現象についての仮説と、制作を止めた判断を区別し、実証していない認知効果を主張しない。

```sh
node tools/work-lifecycle.cjs --list
node tools/work-lifecycle.cjs --write-lab
node tools/work-lifecycle.cjs --check
node tools/work-lifecycle.cjs --check --base <変更前のexact SHA>
```

[LAB](lab/index.html)は7研究室を巡る生成された静的な探索入口。開発 → マップ編集内のLABリンクからも開ける。
部屋配置は`data/lab-rooms.json`のwork ID参照、状態とpathはLifecycle、凍結記録は各ARCHIVEが正本。研究室内の動きと選択はローカルJSで補い、JSなしでも全室・実リンク・記録を利用できる。実験本体を入口で先読みせず、外部API/計測を加えない。
台帳・部屋配置・記録を変更したら`--write-lab`を実行し、生成物を直接編集しない。未配置の試作や将来の凍結記録は既存rendererの棚へ収まり、一覧のために別台帳や管理UIを作らない。
既存Release Validator Tests workflowがLAB一致・凍結workの差分・状態遷移を検査する。
初回だけ、baseに台帳がないため凍結差分チェックはbootstrap扱い。以後はbase台帳から凍結状態を読み、再開指示なしの本体変更や削除・移動を拒否する。
LABはstaging専用の選別移送対象外。productionへの書き込み権限やGitHub側のルールをこのstaging PRで変更するものではない。


PR #154の追加レビュー後、再凍結のactive → frozenには、前回と異なる`freezeDecision`を要求する（前後の空白だけの違いは不可）。
再開時には過去の`archive`参照・ARCHIVE.md本文・`freezeDecision`をそのまま保つ。再開と同時に記録を消す・別ファイルへ移す・書き換えることはできない。
再開後のactive開発でも、過去のarchive参照とファイルは残す。新しい探索内容は以前の記録を残して追記し、次の凍結判断を新しい参照として記録する。
これらは既存の凍結・再開指示の確認であり、新しい承認段階は追加しない。

## バックアップと復旧

### 保存するものと、既存バックアップの範囲

GitHubのstagingとproductionには、それぞれコード・commit履歴・追跡済み画像/音声・生成済みSearchページがある。同じGitHubアカウント内の2 repositoryは、アカウント障害に対する独立バックアップではない。Working Copyのcloneも、端末内の存在・取得済み履歴・保存先が確認できなければバックアップ済みと断定しない。

| 保存対象 | 既存方式 / 最小の追加 |
| --- | --- |
| 両repositoryの取得できる全refsと到達可能な履歴 | Workがmirror cloneから完全な`git bundle --all`を作り、GitHub外に日付付きで保存。削除済みrefの回収、未Push/未Commit作業は含まれない |
| 本番配信状態 | 成功した**production Pagesのhead SHA**、run URL、公開集合を復旧ファイルに記録。main最新SHAと配信成功SHAを同一視しない |
| 町のDesk編集前ファイル | 既存Pythonista `Documents/YumaniwaDesk-data/backups/`、最大40世代。対象ファイルだけであり、repository全履歴の代わりではない |
| Factory部品棚・画像・選択構成・WORK SLOT | 既存の画像入り素材庫ZIP v2を保存。Recipe JSON単独は依存画像を含まない |
| Editor制作下書き・正式反映前の配置 | 既存の全保存/Desk採用分ZIP・差分。正式反映後は正本もGitへ。端末を閉じる前の作業をGitHubから読めるとは限らない |
| Audio Factory等の制作物 | 必要なプリセット/再生コード、Nudge仕様、原画像/音声を既存の書き出しで保存。不要な一時履歴まで収集しない |
| Codea / Pythonista / VectorBoyの端末内原稿 | 実際に使った未反映の原稿だけ作者がFiles/iCloud Drive等へ保存。過去作品・noteの原典はDriveのSukimaStock。原典の保存とGit全履歴のバックアップは別 |
| ゲームの進行・設定 | localStorage/IndexedDB等は利用者のブラウザー内。Git bundleに含まれず、ドメイン変更でも自動移行されない。保存が必要な作品の既存export機能だけ利用 |
| itch配布物・Actions生成ZIP | 生成元・manifest・source SHAはGit、最終アップロード/配布物は別。Actionsの保存期限（既存14/30日）を長期保管と扱わない |

### Workが行う最小バックアップ

月1回または大きな公開後に、作者は「OPERATIONSの月次点検と復旧コピー更新をお願いします」と依頼すればよい。新しいdaemon・監査workflow・常時同期を導入しない。日付・両SHA・checksumを添えた完全コピーを最新＋前回の2世代程度保持し、依存する差分bundleへ複雑化しない。保存成功を確認してから旧世代を整理する。

以下はWork/PC側の手順。iPhoneでCLIを入力する必要はない。毎回**新しいrepository外の空ディレクトリ**で行い、既存mirrorを上書きしない。

```sh
git clone --mirror https://github.com/SukimaStock/yumaniwa-town-staging.git staging.git
git clone --mirror https://github.com/SukimaStock/yumaniwa-town.git production.git
git --git-dir=staging.git fsck --full
git --git-dir=production.git fsck --full
git --git-dir=staging.git bundle create yumaniwa-town-staging.bundle --all
git --git-dir=production.git bundle create yumaniwa-town.bundle --all
git --git-dir=staging.git bundle verify yumaniwa-town-staging.bundle
git --git-dir=production.git bundle verify yumaniwa-town.bundle
```

保存物はbundle、SHA-256 checksum、復旧メモ（両SHA・Pages run・公開集合・既知の設定・復元結果）。GitHub外への**実際の保存成功**まで確認する。一時checkoutやDownload ZIPだけで全履歴保管と報告しない。現時点の両snapshotはLFS/submodule参照なし。将来導入する場合はbundleにLFS実体や別repositoryの内容が入らないため、別取得が必要。

独立保存はGitHub外のファイル保管先を使う。作者がさらにiCloud Drive/PC/外部媒体にも置く場合は、完成した復旧ZIPを保存するだけでよい。認証token・秘密鍵・パスワード・recovery code、Gitの認証設定を復旧ZIPやrepositoryへ入れない。一般的なローカル秘密ファイル/キャッシュ/復旧コピーは`.gitignore`で除外するが、既存追跡ファイルや強制追加を保護する機能ではない。Push前の差分確認は残す。

### GitHubなしで復元する

1. コピーのchecksumを確認し、空の隔離フォルダでbundleからcloneする。productionはメモに記録した**配信成功SHA**へcheckoutする。元repositoryや作者のローカル変更を上書きしない。
2. `fsck`、元と同じrefs/tree/追跡ファイルbytes、Lifecycle/LAB、Search generator `--check`とRelease Validatorを確認する。試験にはGitHub remoteを付けず、ブラウザーの既存保存データも使わない。
3. production snapshotを静的HTTPで配信する。ローカル再現時は既存の`/yumaniwa-town/`パスを保つ。復元ファイルから配信したHTML/JS/画像/音声が同じbytesで届くか確認する。
4. 新しいGitホストへ移す場合は、作者が選んだ**空の新repository**へbranches/tagsだけを移す。GitHubの`refs/pull/*`や既存productionへ盲目的に`push --mirror`しない。PR運用・必要checks・Pages設定は別途再設定する。

```sh
git clone --mirror yumaniwa-town.bundle restored-production.git
git clone restored-production.git restored-production
git -C restored-production checkout --detach <メモの配信成功SHA>
git -C restored-production remote remove origin
```

静的ファイルはGitHub Pages以外でも再現できる。ただし別ドメイン/別pathへ**正式移転**すると、canonical・OGP/share URL・sitemap・PWA scope/start_url・Service Worker・検索サービス・計測の対応が必要。DotWeatherのOpen-Meteo API、itch等の外部launchも別サービスに依存する。HTTP/機械検査だけで外部サービス・実ブラウザー・実機の復旧完了とはしない。公開先の選択・正式移転は作者の判断後に行う。

### Gitだけでは戻らない設定

GitHubのrepository visibility/default branch、rulesets/旧branch protection、Pagesのbranch/公開ディレクトリ/domain、Actionsの許可・変数/secret・環境、GitHub App接続/権限、PR/issue/review/comment、Actionsのrun/artifact、Release添付ファイルはGit履歴と別。コード内のworkflowは保存されるが、外部側の設定・成果物まで復元されない。

Search Console/Bingの所有者・プロパティ・送信状態、Plausibleの設定/集計、itchのアカウント・ページ/最終upload、DNS/custom domainも別。確認できる非秘密設定だけ復旧メモへ。権限で読めないものは**未確認**とし、必要な項目だけGitHub Web等で作者が確認する。秘密情報はパスワード管理側で保管する。Google/Bingの公開用所有確認ファイルやPlausible公開script IDを、それだけで認証secretの混入と扱わない。

## 長期運用点検の基準snapshot（2026-10-12）

staging `6de4dc0329f1d5d248fe9d0c9010943f3399824f`、production `3965de1abf5b5b48bd4c9bccca9c8f117a874fd7`を読み取り確認した。これは今回の点検開始時の基準であり、将来の最新状態の代用ではない。結果と実施した検査は今回のPRへ一度だけ記録する。

| 項目 | 状態 | 確認できた根拠 | 必要な対応 |
| --- | --- | --- | --- |
| バックアップ | 一部不足 | Gitの両全履歴、Desk最大40世代、Factory素材庫ZIPは確認。以前からの独立全体バックアップ/端末内データは未確認 | 今回の完全bundle復元・独立保存を初回として、月次/大公開後に更新。必要な端末内制作物だけ作者が保存 |
| ツール分担 | 一部不足 → 本文を整理 | 従来フローはWorking Copy/Desk中心。Work cloudと制作道具を上記で分離 | Workだけの日は端末Git不要。ローカル再開時だけ同期 |
| 作品管理 | 対応済み | 台帳34件（released 10/active 18/frozen 6）、作品folder32個。Feel Labは既存implicit active。7研究室と6凍結記録が一致 | 正本と既存generatorを維持。数の違いには雛形・redirect・未配置shellが含まれ、欠落と即断しない |
| 品質・公開 | 一部不足 | 両mainの最新対象Actions/Pages成功、Stagingのrequired 2 checks。制作状態・公開集合・生成正本は既存ゲートで保護 | 作品固有/Engineテストは変更時に選ぶ。Production保護設定の全体と実機は未確認 |
| 安全性 | 一部不足 | 両repositoryはpublic。Staging rulesetはPR＋2 checks必須/force push・削除禁止。Productionで読めたrulesetはforce push・削除禁止のみ | noindexを秘匿手段にしない。旧branch protectionはAPI 403で未取得なので、設定全体を未保護と断定せず作者が確認 |
| 定期運用 | 一部不足 → 最小手順を整理 | 既存Ops ReviewはSEO等の週次レビュー。長期復旧/ローカル保存の月次手順が未整理 | 下記を既存レビューへ必要時に加える。新しい定期タスクは作らない |

作品数が増えてもLifecycleの状態/path、WORKSの町identity、Search metadata、LABの部屋配置をそれぞれの正本で保つ。LABは研究室を巡る体験を維持し、作品総数の表や検査状況を常設しない。未登録の試作を暗黙のactiveとして扱う既存方式があり、現段階で大規模再編や別台帳は不要。

Engineの版付きURLは参照先の区別であり、同じファイルを変更すれば参照作品へ影響する。v0.2/0.3やwork内のlegacyを一括置換せず、実際の参照作品・保存/音/入力を調べ、影響profileの代表作と既存テストを選ぶ。独立3D Engineは`works/sukima-3d-lab/`内で扱う。全作品を毎回通し遊びしない。

| 既存Actions | 主な確認範囲 | 完成判断との境界 |
| --- | --- | --- |
| Change PR Gate / Change Verification Evidence | base側の固定実装による軽量ルート/Lock、Scope/Risk/Impact、変更コードのsyntax・exact blob | 全作品の挙動テストや実機・作者承認ではない |
| Change Operations Tests | 運用ゲートの回帰とPythonのDesk/scene/Starter/Canary等。対象path変更時 | 運用文書変更でも既存検査を維持 |
| Release Validator Tests | Lifecycle・凍結差分・LAB、公開10作品の生成一致、Guide/町内告知/静的Release | 起動後の操作や外部サービスは別確認 |
| World Consistency Audit | 指定されたPUMPOKO/ORBIT等のtrace契約・source integration | 新しい全workへ自動で同じゲーム判定を課すものではない |
| New Work Starter / 個別export | Starter採用・bundle/export整合、ORBIT/PUMPOKOの配布物 | 生成ZIPそのものの実機確認と長期保管は別 |
| Production Safety Checks / PUMPOKO Production Candidate Audit | JS/Python syntax、公開環境・manifest、既存町/導線・指定公開作品のsnapshot | 配信前条件の一部。公開後HTTP/操作・検索/計測は別 |

作品固有のtests（例: PUMPOKOの`tests/`、3D Labの`npm test`）やEngineのInput/Boot・Audio/Assets・Audio lifecycle・DiagnosticsのNodeテストを、すべてのCIが自動実行しているとは扱わない。変更時にWorkが該当する既存テストを選んで実行する。CIのpathsや成功runだけで全作品の互換性を証明しない。

今回のproduction復元確認では、公開順を明示した既存generator/validatorは成功した。一方、`--all-production`はWORKSの表示順（PUMPOKO先頭）で集合を得るため、現在のsitemap（PUMPOKO末尾）との**順序だけ**の不一致を1件FAILにする。URL集合・ファイル欠損の障害ではない。Workは復旧メモ/配信済みsitemapの公開順で`--published`を明示して既存検査を使い、両結果を記録する。作者にID一覧の手入力を求めない。validator/generatorの順序契約改修は次の関連変更時の小改善案とし、今回の文書PRには混ぜない。

保留する改善は**Production mainのPR/Safety Checksの強制設定確認**。今回読めたrulesetにはないが、旧branch protectionは未取得。既存設定で不足している場合だけ、既存`Production Safety Checks`のjob contextを実行結果と照合してrequiredにする案を作者へ示す。今回の監査は設定変更を許可していないため、Workが自動で変更しない。

古いDraft PR #140/#200/#209は別の探索/検証待ち作業。今回の変更へ取り込んだり、長期点検の都合でclose/mergeしたりしない。

## 月1回の最小メンテナンス

既存Ops Reviewでまとめて扱い、問題がなければ短い「変更不要」とバックアップ日付だけでよい。異常や作者への依頼は最大3件程度に絞る。毎月の新規ファイル/報告書・全作品テスト・新しい定期自動化を必須にしない。

| 誰が | 確認内容 | 頻度・範囲 |
| --- | --- | --- |
| Work | 両main/Pages SHA・Actions失敗、Productionとの差分を環境差/未公開作品/有効な本番修正に分ける | 月1回。差分ゼロを目標にせず、意図不明な共通差分だけ追う |
| Work | 独立保存済みの日付、完全bundle/checksum、Lifecycle/LAB整合・公開集合/生成物 | 月1回または大きな公開後。復元試験は初回、方式変更、実際の復旧時に実施 |
| Work | 新しいworkの未登録、欠損入口/参照、継続して失敗する検査、再び繰り返した実装 | 月1回。具体的な増加や摩擦がなければ変更不要 |
| 作者 | 町を起動 → 代表ゲーム1〜2作を操作して戻る → LABで1研究室へ入る | 月1回、数分。音・傾き・Safari復帰・触感は必要な作品だけ。毎回全作品は不要 |
| 作者（制作物が増えたときだけ） | Factory素材庫ZIP、Editor下書き、未Push原稿が端末外にも保存されているか | Workから端末を読めないため必要な制作物だけ確認。使わない道具の点検は不要 |

普段作者が意識することは、**①まずstagingで試す、②端末の未Push作業だけ先に知らせる、③変更した体験だけ触る、④本番公開は対象を明示する、⑤月1回または大公開後に復旧コピーを更新する**、の5点。

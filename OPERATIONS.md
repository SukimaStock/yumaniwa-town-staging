# 湯間庭町 安全運用ルール

湯間庭町は **staging を次の本番状態の正本**として扱う。

- 日常の編集・作品追加・町の調整は `yumaniwa-town-staging`
- YumaniwaDesk は staging 専用
- 本番 `yumaniwa-town` は直接編集しない
- 本番反映は production 用 branch → PR → Production Safety Checks → merge
- 緊急で本番を直接修正した場合も、同じ修正を必ず staging へ戻す

詳細な昇格ルールは `RELEASE-WORKFLOW.md` も参照する。

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
4. 作品追加時は entry、直リンク、Manifest、必要アセット、更新履歴、町内会話などを確認する。
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

## 本番反映前の確認

少なくとも以下を確認する。

- staging で対象機能が正常に動く
- staging にだけ残す実験コードやデバッグコードが本番へ混ざらない
- production にだけ存在する有効な修正がない
- production にだけ修正がある場合は先に staging へ戻す
- staging の `noindex,nofollow` を production へ持ち込まない
- production の `main.js` は `DEV_MODE_ENABLED = false` を維持
- production の開発UIは通常アクセスで表示されない
- 作品追加時は町内導線・直リンク・Manifest・必要アセット・更新履歴を確認
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

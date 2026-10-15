# PR #379 — 検証証拠の再現

2026-10-15。対象指摘は [discussion_r4271861136](https://github.com/SukimaStock/yumaniwa-town-staging/pull/379#discussion_r4271861136)。取得できないlocal commit `92453dfcf11c7513da3fd79660d9f687a576b34b` を根拠にした当時の独立レビューは、再現可能な成功証拠として採用しない。元の記録はその制約を明記して残す。

## 再実行の対象と方法

GitHubから取得可能な [e35f7d0e7edf395346d6503a84b723a4c094dc4a](https://github.com/SukimaStock/yumaniwa-town-staging/commit/e35f7d0e7edf395346d6503a84b723a4c094dc4a) を別worktreeへcheckoutし、変更のない状態で実行した。Node v24.19.0。文書修正担当による実行時刻は09:49 UTC。実装担当とは別の担当が既存テストを再実行したもので、失われたlocal commitや当時の独立レビューを復元したものではない。

fresh cloneからの再現手順（既存作業treeを切り替えない）:

```sh
git clone https://github.com/SukimaStock/yumaniwa-town-staging.git ambertime-review
cd ambertime-review
git checkout --detach e35f7d0e7edf395346d6503a84b723a4c094dc4a
git status --porcelain
node --version
node --test --test-reporter=tap works/ambertime/tests/journey-ui.test.mjs
node --test works/ambertime/tests/*.test.mjs
```

`git status --porcelain` は空。UIテストファイルのSHA-256は `05a61d33fa95fb0013a834f9f832701a49307cb82cd8cd45ae1d15c99814115f`。追加のfixtureや失われたスクリプトは必要ない。

## UI module 12件の個別結果

この12件は、実際の `journey-app.mjs` を最小DOM・制御時計・localStorageの代替実装で読み込むNodeテスト。画面レイアウト、実ブラウザのBFCache実装、Safari、指の触感を検証したものではない。

| # | テスト名と確認内容 | 結果 |
| --- | --- | --- |
| 1 | fresh clock advances once; sampling cancels clock and stale callback cannot age the glass — 1回の進行、試飲停止、古い時計の無効化、前回比較 | PASS |
| 2 | tasting from pause or pending decision returns to the same stop — 停止/判断中の試飲から同じ停止へ戻る | PASS |
| 3 | trial-open save restores snapshots without overwrite and closes to explicit resume — 試飲保存の無上書き復元と明示再開 | PASS |
| 4 | old0.3 watching, decision and finished fixtures retain their full state on reopen — 4種類の旧保存、記録、次樽の移行 | PASS |
| 5 | free bottle previews cost and never commits on open/cancel or a second click — 瓶詰め確認/取消、状態文、二重確定防止 | PASS |
| 6 | hidden, BFCache and initially hidden pages require foreground resume — visibility/pageイベントによる停止・明示再開 | PASS |
| 7 | decision actions reject old event buttons and duplicate clicks while preserving trials — 古い判断/二重クリック拒否 | PASS |
| 8 | preview never accesses either key through tasting/bottling/next — previewで旧/現保存keyを読書きしない | PASS |
| 9 | corrupt/future/read-failed saves remain untouched until reset consent — 破損/将来版/読取失敗の保護と同意した初期化 | PASS |
| 10 | observation never displays full flavor and records carry actual tasting memories — 観察と試飲の分離、記録内の試飲履歴 | PASS |
| 11 | consecutive same-event casks display their own bottle counts — 連続同イベントで51本/52本を表示 | PASS |
| 12 | BFCache bottle cancel requires explicit resume without visibility event — visibility通知なしの復帰/取消後も明示再開まで停止 | PASS |

実測集計: tests 12 / pass 12 / fail 0 / cancelled 0 / skipped 0 / todo 0、exit 0。作品全体は tests 67 / pass 67 / fail 0 / cancelled 0 / skipped 0 / todo 0、exit 0。モデル、旧0.3移行、保存validator、fixtures、UI moduleを含む既存回帰を実行した。

文書修正も行わない別の独立検証担当が、同じexact commitの別worktreeで `node --test works/ambertime/tests/journey-ui.test.mjs` を再実行し、12件成功・失敗/取消/skip/todo各0、exit 0を確認した。テスト時間201.903677ms、作業treeの差分なし。モデル/保存/アプリ/fixtures/testsが現行mainと同一であることも別途照合した。これは2026-10-15の新しい独立検証であり、当時の12件の実行内容や未保存commitの同一性を証明するものではない。

## 現行コードとの照合と限界

調査開始時main `b00d1161ffc3ffa1e653f3a448ea8f7decc24fd2` と対象commitのAmberTime配下の差分は `VERIFICATION-V04.md` の追記のみ。アプリ、モデル、保存処理、既存テストに差分がないことを `git diff e35f7d0e7edf395346d6503a84b723a4c094dc4a b00d1161ffc3ffa1e653f3a448ea8f7decc24fd2 -- works/ambertime` で確認した。現行mainでもUI 12件を再実行し12件成功。

今回の変更は検証文書2件のみ。機能・モデル・保存key/形式・操作・画面配置に変更はない。過去のブラウザ操作・画像は `VERIFICATION-V04.md` が記載する当時の対象commitに対する証拠のまま保持する。今回ブラウザ操作を再実行したとは扱わず、実機iPhone/iPad・Safari、作者による面白さ/触感の確認は未検証。

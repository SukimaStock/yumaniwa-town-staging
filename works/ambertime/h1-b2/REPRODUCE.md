# H1-B2 再現

基準main `778f783043256bed02197988caecd65cda576167`。専用checkout・HTTP origin・browser profileを使用する。研究用別キーではなく、本編index.htmlと同じ正式キーを隔離した環境で動かす。実ユーザーの記録を使わない。

入力はH24の12正式保存。H1-B1と同じSHAであることをrunnerが検査する。すでに一致する入力は再生成しない。

```sh
node works/ambertime/h1-b2/equivalence-run.mjs <save-directory> <scratch-equivalence-results.json>
node works/ambertime/h1-b2/failure-browser.mjs <new-disposable-failure-output>
node works/ambertime/h1-b2/browser-run.mjs run <save-directory> <new-disposable-matrix-output>
node --test works/ambertime/tests/h1-b2-*.test.mjs
node --test works/ambertime/h1-b2/*evidence.test.mjs
```

runtime Playwrightを`CODEX_PRIMARY_RUNTIME_NODE_MODULES`から使用し、`AMBER_BROWSER_EXECUTABLE`でChromiumを指定できる。今回binaryは `/tmp/h1-b1-browser/runtime/chromium`、Chromium153。製品へbrowser依存は追加しない。3条件まで並列化し、各条件は専用profileを持つ。

広域90/100年の旧v2文字列はnative localStorageに入らない。この2条件は元v2ファイルを通常メニューから読み込み、同じ正式readerとwriterを通す。storageを偽装して旧v2が書けたとは扱わない。他10条件は旧v2を実localStorageに置いてboot→readonly→download→同一ファイル読戻→端末外保管確認→v3を確認する。

起動直後に従来のUIがstaff/shop/generationの通知操作を記録する場合、CDPで実native書込の最初のv3候補を観測し、展開時に元SHAへ一致することを確認する。その後の通知は元operationsのprefix完全一致と既存notice key/progress:null限定を確認し、現在snapshotを変更していない正式readerへ渡して完全JSON一致を検証する。通知ごとに古いprefixへrewindして公開APIを再適用する独立cold replayではない。読込後のlive snapshotを無条件に元JSONと比較して正当な通知を不具合扱いしない。ゲームモデル・readerを差し替えない。

最終結果はproduct/runner fingerprintを開始・終了で照合した完了条件だけを使用する。未対応の通常ダイアログなどで停止した試行は失敗として保持し、成功へ改名しない。長期readerの所要時間は新しい本編接続経路の検証費用であり、既存A1の性能値を再測定したという意味ではない。

回帰の歴史的固定proofには、今回の正確なB2差分だけを戻す`tests/h1-b2-source-inverse.*`を置く。元の期待hashを変更せず、非B2の全byteは旧pinへ渡す。実際の現行挙動は独立のcodec/app/browser検査で確認する。

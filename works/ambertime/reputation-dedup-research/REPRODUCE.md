# H1-B1 再現手順

[総合結果](REPORT.md) · [依存関係](DEPENDENCIES.md) · [将来操作](FUTURE.md) · [歴史](history-report.md) · [検証](VALIDATION.md)

入力はH2-4の3方針×360/720/1080/1200月、12JSON。元保存は読取専用で扱い、出力先は独立scratchへ分離する。研究コードを本編へimportしない。

入力が既に存在する場合は再生成せずH24.mdのSHAを照合する。今回は元scratchが失われていたため既存の生成器で必要入力のみ再生成し、12件のSHA一致を確認した。既存の完了済みcold復元・raw履歴抽出を理由なく再実行していない。

```sh
node works/ambertime/chronicle-lab/research-h24-saves.mjs local <save-directory>
node works/ambertime/chronicle-lab/research-h24-saves.mjs wide <save-directory>
node works/ambertime/chronicle-lab/research-h24-saves.mjs mixed <save-directory>
node --expose-gc works/ambertime/reputation-dedup-research/capacity-run.mjs <save-directory> <new-wire-output-directory>
node works/ambertime/reputation-dedup-research/browser-run.mjs <new-wire-output-directory> <new-browser-output-directory>
node works/ambertime/reputation-dedup-research/future-run.mjs <save-directory> <new-future.json>
node works/ambertime/reputation-dedup-research/history-run.mjs <save-directory> <new-history.json>
node --test works/ambertime/reputation-dedup-research/*.test.mjs
```

`future-production.mjs`のrunProduction()はfuture.testからも実行する。future短期の既存完了出力を再利用する場合はfuture-runのfingerprint()一致を確認した上でrunLongFuture()だけを呼び、両方の完了状態と元出力SHAを保存する。保存文字列を圧縮した状態のままモデルへ渡す試験にはしない。

ブラウザにはruntime Playwrightが必要。`CODEX_PRIMARY_RUNTIME_NODE_MODULES`と`AMBER_BROWSER_EXECUTABLE`で指定する。製品依存は増やさない。今回Chromium153をscratch npm packageから展開した（通常のPlaywright binary取得は壊れたZIP、package既定展開はchown EINVALのため、Brotli内容を独立dirへ通常展開）。ブラウザ起動後の実結果をbrowser-results.jsonへ記録する。コードやfingerprintの変更があれば新しい出力先へ再測定し、旧結果を新コードの結果へ改名しない。

専用profile・HTTP origin・研究keyで実行し、native quota探索はlocalhostの別origin。本編キーへアクセスせず、ユーザーのブラウザを操作しない。harness.htmlは自動runner内部fixtureであり、新作品や常設LAB導線ではない。正式readerが研究wireを読めるとは主張しない。

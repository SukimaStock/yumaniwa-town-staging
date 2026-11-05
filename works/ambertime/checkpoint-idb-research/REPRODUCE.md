# H1-A4 再現と対象範囲

内部の`harness.html`はHTTPテストrunnerが使用するfixture。アクセスだけでは研究DBへの書込を開始しない。本編の保存DB/keyには触れない。大量データ・quota・crash実験は実ユーザーoriginでは行わず、専用profileと独立localhost originを使う。

```sh
node --test works/ambertime/checkpoint-persistence/*.test.mjs works/ambertime/checkpoint-research/*.test.mjs works/ambertime/checkpoint-idb-research/*.test.mjs
node works/ambertime/checkpoint-idb-research/fixtures.mjs /scratch/h1-a3-verified /scratch/h1-a4/fixture.json
AMBER_IDB_FIXTURE=/scratch/h1-a4/fixture.json AMBER_IDB_MAINTENANCE=1 node works/ambertime/checkpoint-idb-research/browser-run.mjs /scratch/h1-a4/new-browser-run
node works/ambertime/checkpoint-idb-research/analysis.mjs /scratch/h1-a4/analysis.json /scratch/h1-a4/new-browser-run/browser-results.json
```

fixture生成は既存のH1-A3 verified/materialsと、その兄弟`h1-a3/saves`を読み込む。H1-A3の再現手順で生成した3正式保存と9境界をSHA/digest照合し、元ファイルを上書きしない。大きいcheckpoint/sidecar/fixture/profileはrepository外に置く。

browser-runは実Playwrightとbrowserbinaryを使う。`CODEX_PRIMARY_RUNTIME_NODE_MODULES`、必要なら`AMBER_BROWSER_EXECUTABLE`/`AMBER_WEBKIT_EXECUTABLE`を設定する。Chromiumのlimited条件はV8 heap capでありiPhone実機ではない。結果にfailed/unavailable/unverifiedを残し、期待値を変えて成功へ読み替えない。

P2修正後の短い再検証は`p2-run.mjs`を使用する。100cycle測定は修正前fingerprintの既存結果を保存したもので、現在コードへ再ラベルしない。source/fixture fingerprintのend guardに一致した条件のみを同じ実行条件の証拠として採用する。完了していない試行や旧fingerprintは別のprovenanceとして保持する。

```sh
node works/ambertime/checkpoint-idb-research/p2-run.mjs /scratch/h1-a4/fixture.json /scratch/h1-a4/new-p2-results.json
```

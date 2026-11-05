# H1-A5 研究の再現

[実用性・次段階](REPORT.md) · [保存経路](SAVE-PATH.md) · [メモリ比較](memory-report.md) · [正式復元](performance-report.md) · [プレイ処理](play-performance.md) · [Safari手順](SAFARI.md) · [検証記録](VALIDATION.md)

研究内部fixture。本編へのリンク・保存key接続はない。`harness.html`は手動選択した研究JSONだけを独立keyへ書く。本編と同originなら容量は共有するため、容量枯渇試験は専用origin/profileで行う。元保存はcommitせず保持する。

入力はH2-4の `local|wide|mixed` × `360|720|1080|1200` の12JSON。H24.mdのSHAが一致するものをsave-directoryへ置く。既存完了計測と中断データを混ぜない。出力先は新しいscratchディレクトリにする。

```sh
node works/ambertime/save-practicality/browser-run.mjs <save-directory> <new-browser-output-directory>
node --expose-gc works/ambertime/save-practicality/memory-run.mjs run <save-directory> <new-memory.json>
node --expose-gc works/ambertime/save-practicality/performance-run.mjs run <save-directory> <new-performance.json>
node --expose-gc works/ambertime/save-practicality/performance-run.mjs formal <save-directory>/wide-1200.json
node works/ambertime/save-practicality/play-run.mjs <save-directory>
node --test works/ambertime/save-practicality/*.test.mjs
```

browser runnerはruntime Playwrightを`CODEX_PRIMARY_RUNTIME_NODE_MODULES`から使い、Chromium実行ファイルを`AMBER_BROWSER_EXECUTABLE`で指定できる（既定は研究環境の`/tmp/amber-h0-browser/chromium`）。WebKit不足は未検証として記録する。既存user browserを操作しない。Node測定はframe/端末RAM/実プレイの代替ではない。

`play-run`は既定で研究dirにresultsを出すため、再現時はコードを同じ相対配置の独立checkoutへコピーする。保存入力は読み取りのみ。formalの標準出力に計測JSONが出る。コミットしたformal結果のprovenanceはその実行branchのSHAに固定し、計測後の集計整理と区別した。

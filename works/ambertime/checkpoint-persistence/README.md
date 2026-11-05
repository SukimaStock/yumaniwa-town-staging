# H1-A3 研究実装

本編からimportしないNode専用研究。正式保存、ブラウザ保存キー、origin、本編計算を変更しない。

- [結果](REPORT.md)、[機械可読値](results.json)、[検証記録](VALIDATION.md)、[正式採用前の契約案](DESIGN.md)
- `persistence.mjs`: creator検証receipt、content-addressed checkpoint/tail、commit-last atomic書込、局所照合、正式元保存fallback。
- `online.mjs`: prefix時点だけからのMap/Set collector。表示時のcloneと世代情報の再構成で未来依存を分離。
- `worker.mjs`: 別processの状態復元。`boundary-run.mjs`: 増分資料と9交代境界、別processの資料継続。

```sh
node --test works/ambertime/checkpoint-research/*.test.mjs works/ambertime/checkpoint-persistence/*.test.mjs
node works/ambertime/checkpoint-persistence/baseline.mjs /outside-repo/saves /outside-repo/h1-a3/baseline.json
node --expose-gc works/ambertime/checkpoint-persistence/long-run.mjs /outside-repo/saves/local-1200.json /outside-repo/h1-a3/long-final/local local
node --expose-gc works/ambertime/checkpoint-persistence/boundary-run.mjs condition /outside-repo/saves/local-1200.json local /outside-repo/h1-a3/materials
# wide/mixedも各条件で実行した後、contextを別計測して集計する
node works/ambertime/checkpoint-persistence/context-probe.mjs all /outside-repo/h1-a3 /outside-repo/h1-a3/context-probes.json
node works/ambertime/checkpoint-persistence/summarize.mjs /outside-repo/h1-a3 works/ambertime/checkpoint-persistence
```

`saves`は既存H1-A1/H1-A2の12入力を完全保持する。無い場合は未変更の`chronicle-lab/research-h24-saves.mjs`で別scratchへ再現し、必ずbaselineの全SHA/容量を通す。既存保存を上書きしない。

生成checkpoint/sidecar/bundleは必ずrepository外のscratchへ置く。tracked成果物はコード・テスト・集計・レポートだけ。新しいWeb画面ではないため作品identityやLAB入口は追加しない。

完了結果は`status/sourceHash/codeFingerprint/modelFingerprint`を照合して再利用する。実測コードを変えたら新しい出力先を使い、旧計測を新fingerprintへ書き換えない。`.tmp`やpartial進捗を完了条件へ混ぜない。結果の5方式比較は条件単位で再利用する設計であり、途中で停止した条件のfull replayは再実行となる場合がある。

`readBundle(observer)`は低水準API。外部collectorを直接変更せず、複製したcollectorを渡し、成功した場合だけ採用する。失敗したcollectorは破棄する。`restoreOrFallback`は状態専用でdirect observerを拒否する。元保存がない場合にhashだけで復旧する機能はない。

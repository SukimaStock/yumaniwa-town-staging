# H1-A2 checkpoint＋tail研究

本編へ接続しないNode用研究コード。正式保存・旧origin・保存キー・モデル・既存研究資料は変更しない。

- [再生契約・信頼境界](CONTRACT.md)
- [結果と間隔比較](REPORT.md)
- [検証と未確認](VALIDATION.md)
- `prototype.mjs`：正式ソースの固定した内部applyを研究プロセス内だけ公開。checkpointのJSON codec、局所検査、tail再生。
- `projections.mjs`：過去資料のcollectorを保持してtailの観測だけで継続する研究用adapter。
- `benchmark.mjs` / `summarize.mjs`：条件ごとの計測と集計。
- `results.json`：入力SHA・コードfingerprint・条件ごとの完了結果。

checkpoint本体と元保存はrepository外へ保存する。研究checkpointは正式readerで読める保存ではない。自己ハッシュは偶発破損や対応不一致を検出するが、prefixの正当性を認証しない。

## 再現時の原則

Nodeでrepositoryルートから実行する。既存H2-4保存が利用できる場合は、H1-A1の`results.json`にあるSHA-256を照合して再利用する。元保存は読み取り専用とし、生成し直す場合も新しい空の出力先を選ぶ。既存の100年保存やH1-A1の測定結果を上書きしない。

最初に短い条件のテストを実行し、その後30→60→90→100年へ段階的に広げる。CPU負荷のある回帰や別benchmarkを重い計測と並行実行しない。完了済み条件は入力SHA・モデル/研究コードfingerprintが一致した場合だけ再利用し、中断中の一時ファイルを正常結果へ混ぜない。CLIの実行方法・実測条件はREPORT/VALIDATIONを参照する。

```sh
node --test works/ambertime/checkpoint-research/*.test.mjs
```

## 性能値の読み方

純粋なtail時間、読み込み・局所整合性検査付きの部分復元、独立した正式全再生の検証を分ける。研究方式の局所検査は現行の全再生検証と同等の保証ではない。現在状態の比較用JSONやcollector資料を含む研究processのpeak RSSを、本編の復元単独メモリと呼ばない。

checkpointを追加しても町の評判状態は減らない。今回のcheckpoint容量は追加資料の容量であり、正式保存の削減率ではない。正式形式・readerの採用、過去操作の削除、移行、H1-A3実装は別判断となる。

個別条件を再開する場合:

```sh
node --expose-gc works/ambertime/checkpoint-research/benchmark.mjs condition /path/to/saves/local-360.json /new/scratch/h1-a2/results/local-360.json
```

12条件全体の実行と集計:

```sh
node --expose-gc works/ambertime/checkpoint-research/benchmark.mjs all /path/to/saves /new/scratch/h1-a2/results
node works/ambertime/checkpoint-research/summarize.mjs /new/scratch/h1-a2/results/results.json works/ambertime/checkpoint-research
```

`all`は年数順、方針順で新しいchild processを逐次起動する。完了済みの条件が同じfingerprintなら再実行せず、残りだけ実行する。研究資料prefixはその最終対象へのbindingを持つため、異なる将来の帳面へ流用する入口ではない。

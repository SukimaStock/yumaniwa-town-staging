# H1-A1 100年保存の構造監査

研究用のオフラインコード。AmberTime本編・正式保存形式・既存研究資料を変更しない。

- [依存関係と保存設計](DEPENDENCIES.md)
- [検証結果と未確認事項](VALIDATION.md)
- `REPORT.md`：容量と時間の実測
- `results.json`：全条件の生計測値・保存SHA・計測スクリプトfingerprint
- `structure.csv`：親/子inclusive容量、件数、平均、割合、30→100年増分
- `ledger-counts.json`：画面ごとの生成・表示・走査元件数

## 再現

Nodeでrepositoryルートから実行。正式保存と中間結果はrepository外の新しいscratchディレクトリへ出す。既存の保存・測定結果を上書きしない。H2-4は保存が同名なら上書きする入口なので、必ず新しい空の出力先を選ぶ。

```sh
mkdir -p /tmp/amber-h1-a1-new/saves
for id in local wide mixed; do
  node works/ambertime/chronicle-lab/research-h24-saves.mjs "$id" /tmp/amber-h1-a1-new/saves > "/tmp/amber-h1-a1-new/$id-generation.jsonl"
done
node --expose-gc works/ambertime/save-audit/run.mjs /tmp/amber-h1-a1-new/saves /tmp/amber-h1-a1-new/results
node works/ambertime/save-audit/summarize.mjs /tmp/amber-h1-a1-new/results
node --test works/ambertime/save-audit/measure.test.mjs
```

測定は複数の全再生を逐次実行するため時間がかかる。CPU負荷のあるテストや別のbenchmarkと並行しない。完了済み条件は入力SHAと計測コードfingerprintを照合して再利用する。中断した条件は再測定する。source savesを直接変更する処理はない。

`measure.mjs <save> official|instrumented|ledger`で単独実行もできる。instrumentedはpartner-ordersの厳密に一致するsource seamへ計測だけを挿入し、メモリ内で読み込む。境界が変わった場合はassertで停止する。ゲーム配信から呼ばない。

同じ正式復元に対して完全なJSON一致を毎回確認する。正式保存の検証を省略した速い代替値を正式復元時間として扱わない。候補archiveの容量は別の研究投影であり、正式保存の置換後容量ではない。

## 原計測の環境

2026-11-05の本監査はNode v24.22.1 / Linux x64、AMD EPYC 9V74、論理CPU 9、hostメモリ約9.7 GiBで実行した。別hostでの再実行にこの機種・メモリ量を引き継がない。REPORTのNode/platform/archは各results.jsonの記録を使用する。

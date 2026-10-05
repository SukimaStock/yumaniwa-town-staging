# 変換エンジンの独立検証

執筆画面への組み込み前の調査。結論・ライセンス・判定粒度は [REPORT.md](REPORT.md)。
このディレクトリを追加しただけで既存エディタの変換は改善しません。

## 再実行

Node 24で確認。WASMや辞書は同梱しない。以下の参照checkoutを、repositoryの外側の同じディレクトリへ用意する。

```sh
git clone https://github.com/egegungordu/jaime.git jaime-reference
git -C jaime-reference checkout 8d7a41ccb23acb129c01936a2fb31c36ab9965c0
git clone https://github.com/msonrm/hechima.git hechima-reference
git -C hechima-reference checkout 5cab51b401b76d95aee1657eba2366cdc5d9bca5
```

staging repositoryのルートから実行する。`..` は参照checkoutがあるディレクトリに置き換えられる。

```sh
node works/mixed-note/research/run.mjs .. /tmp/results-node.json
node works/mixed-note/research/check-quality.mjs /tmp/results-node.json
```

観測ハーネスのexit 0は「測定できた」の意味。品質ゲートは現状 **exit 1**。
入力失敗やかなだけの出力を成功へ読み替えない。既存の36例テストとは別の品質判定。
`results-node.json` / `results-chromium.json` は実測snapshotで、時間は環境依存。

ブラウザも別ハーネスで試す。Playwrightは検証用外部依存（Apache-2.0）、同梱しない。
Playwrightのインストール先と、必要なら実行ファイルを渡す。

```sh
node works/mixed-note/research/browser-run.mjs .. /tmp/results-browser.json /path/to/playwright/index.mjs chromium /path/to/chromium
```

`webkit`も指定可能だが今回の環境にWebKitバイナリはなく未実行。
ローカルHTTPサーバーは必要ファイルだけを配信し、終了時に停止する。外部サービスへ文章を送信しない。

## 何を測るか

- 6件の指定入力、スペースなし混在、指定段落＋追加2段落、Compositionの9例、編集操作3例、日本語だけの長入力。
- 現行実装、Jaimeへの生入力、Jaimeへの日本語区間入力、WanaKanaのComposition＋Mozcへのかな入力を比較。
- `fixtures.json` の `spans` は **人手で指定した正解境界（oracle）**。自動Detectionではない。
  rawの完全復元を検査するが、境界の推定能力は採点していない。
- `jaimeRaw.words` は最良経路の構成単語。複数の代替候補ではない。
- `mozcOracle.segments[].candidates` は文節候補。`output`は各第一候補を連結した実出力。
  `targetSelectable`は期待文がその候補集合から選べるかで、正解へ自動ランキングし直さない。
- 英語区間に指定した`game`はそのまま残る。指定段落の理想にある「ゲーム」へ変えることや読点追加は別の修正となり、完全一致PASSにはしない。
- 残ったfinal `n`のflush、句読点・日本語区間内のスペース処理はアダプターの明示的な操作。
  WanaKanaもCompositionの採用確定ではなく、かな漢字エンジン比較用の入力生成に使う。
- Jaimeエラー後は候補メモリを読まない。`engine-failed` / `output:null`として記録する。
  生入力のスキップ、大文字消失、部分かな、失敗位置を隠さない。

参照のcommitとWASM/glue/辞書のSHA-256は `provenance.json`。不一致ならコード実行前に停止。
upstream同梱済みWASMを実行しており、この環境ではZigから再ビルドしていない。

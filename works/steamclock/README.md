# SukimaStock Starter v0.1.1

Koderで新しいSukimaStock作品を始めるための原本フォルダです。

このStarterは、Codea Liteの上にSukimaStock Engineを載せ、作品固有部分だけを`sketch.js`へ書く構成です。

## 最初にやること

1. このフォルダを複製する。
2. 複製したフォルダを作品名または作品IDに変更する。
3. `sketch.js`の`id: "replace-with-work-id"`を作品IDへ変更する。
4. 必要なら`index.html`の`<title>`を作品名へ変更する。
5. Koderで`index.html`を開いてPreviewする。
6. 以後は複製側だけを編集し、原本Starterは直接制作に使わない。

## ファイル構成

```text
index.html                  新作の起動ページ
index.demo.html             Engine更新後の動作確認用Demo
codea-lite.js               Codea風Canvasランタイム
sukimastock-engine.js       SukimaStock Engine本体
sketch.js                   新作開始用Blankテンプレート
examples/
  sketch.starter-demo.js    Engine機能確認用の動くStarter
assets/                     画像などを置く場所
sounds/                     音声などを置く場所
docs/
  ENGINE-README.md          Engineの詳しい使い方
  ARCHITECTURE.md           Engineと作品の境界
  CHANGELOG.md              Engine更新履歴
  VALIDATION.md             v0.1.1で確認済みの項目
WORKFLOW.md                  制作から公開までの標準フロー
PUBLISH-CHECKLIST.md         公開直前に使う短いチェックリスト
```

## 使い分け

- 新作制作: `index.html` + `sketch.js`
- Engine / テンプレート更新後の確認: `index.demo.html`
- Engine仕様の確認: `docs/ENGINE-README.md`

`index.demo.html`は`examples/sketch.starter-demo.js`を読みます。新作の`sketch.js`とは独立しているため、Blankテンプレートを壊さずにEngineの基本動作を確認できます。

## 重要な境界

作品固有の遊び、ルール、絵、文章は`sketch.js`へ置きます。

共通化するのは、二作品以上で実際に必要になったものだけです。Engine本体を作品ごとに気軽に変更せず、共通化する価値が確認できた変更だけをStarterへ戻します。

詳しくは`docs/ARCHITECTURE.md`を参照してください。


## 公開するとき

詳しい手順は `WORKFLOW.md`、公開直前の確認だけなら `PUBLISH-CHECKLIST.md` を使います。

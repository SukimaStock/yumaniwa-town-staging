# SukimaStock Engine Architecture

## 1. 境界

```text
Browser / HTML Canvas
        ↓
Codea Lite
描画API、入力イベント、時間、基本Tween
        ↓
SukimaStock Engine
Scene、Viewport、Motion、Theme、Audio、Share、公開環境
        ↓
sketch.js
各作品だけの遊び、ルール、絵、文章
```

エンジンへ入れる基準は「二作品以上で実際に必要になったか」です。将来使いそうという理由だけでは追加しません。

## 2. 作品側に残すもの

- 焼き台、投擲物、盤面など固有のゲーム状態
- 得点ルール
- 当たり判定と物理定数
- 個別の画面構図
- 作品固有の名称、文章、画像

## 3. Engineへ昇格させるもの

- タイトル、プレイ、結果、履歴などの画面切替方式
- 360×640論理画面と端末差の吸収
- 入力の優先順位とModal中の背後入力防止
- quick / card / read / sceneという時間の役割
- title / body / monoなど文字の役割
- 音声unlock、音量、cooldown
- Webフォント待機
- 画像保存／共有
- Analytics、エラー表示、湯間庭町Bridge

## 4. 命名

公開APIは`SSE`に集約します。

```text
SSE.app        Sceneと画面遷移
SSE.viewport   論理画面
SSE.motion     アプリ全体の時間と動き
context.motion Sceneに属する時間と動き
SSE.storage    作品ごとの保存データ
SSE.theme      色とデザイントークン
SSE.type       文字階層
SSE.ui         基本部品
SSE.audio      音
SSE.i18n       言語
SSE.share      結果画像
SSE.analytics  行動計測
SSE.bridge     湯間庭町
SSE.debug      エラー
```

作品固有の変数には作品ごとの短い名前空間を使えますが、Engine本体はグローバル関数を追加しません。

## 5. Scene Stack

通常画面は`replace`、メモや説明は`push / pop`を使います。

```text
Title
  replace
Play
  push Memo
Play + Memo
  pop
Play
  replace
Result
```

上のSceneは既定で入力を止めます。背後へ渡す特殊なSceneだけ`blocksInput: false`を指定します。

各Scene Recordは専用のMotion Scopeを持ちます。`enter / update / draw / touch`へ渡される`context.motion`で開始した処理は、`replace`または`pop`でSceneを離れたときにまとめて停止します。

## 6. 既存作品への移植

既存作品を一括でEngine化しません。

### 安全に切り出しやすい順

1. Error
2. Analytics
3. Font gate
4. Audio
5. Share
6. Viewport
7. Scene Router
8. Motion token

物理、盤面、対戦状態は最後まで作品側で構いません。

## 7. バージョン方針

- `0.1.x`: 4本目を作り始められる基礎
- `0.2.x`: 4本目で繰り返したFeedbackとResult部品
- `0.3.x`: 既存作品一つで段階移植を検証
- `1.0.0`: 新作でEngine側の書き換えなしに一本完成できた状態

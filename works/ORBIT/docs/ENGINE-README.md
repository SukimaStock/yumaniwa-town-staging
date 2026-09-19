# SukimaStock Engine v0.1.1

Codea Liteの上に載せる、SukimaStock作品向けの共通制作基盤です。

Codea LiteはCanvas描画・入力・時間などの低層ランタイムを担当し、SukimaStock Engineは、作品を重ねるほど蓄積したい「画面構成」「呼吸」「手触り」「公開時の仕組み」を担当します。

## ファイル構成

```text
index.html                 起動ページ
codea-lite.js              Codea風Canvasランタイム
sukimastock-engine.js      共通エンジン本体
sketch.js                  作品固有のSceneとゲームルール
README.md                  この説明
```

## v0.1に入っているもの

- 360×640などの論理画面と端末サイズへの自動フィット
- Scene登録、置換、重ね表示、入力ルーティング
- フェード付きScene遷移
- 主ポインター管理と論理座標への変換
- Camera2D
- SukimaStock Baseの色、文字、モーション時間
- Tween、待機、Timeline
- Sceneを離れたときに自動停止する`context.motion`
- 作品IDごとに分離された`SSE.storage`
- 日英切替とlocalStorage保存
- Web Audio合成音、音声ファイルプール、iOS向けunlock
- Paper、Panel、Button、Progressなどの基本UI
- Webフォント読込とCanvas表示ゲート
- Canvas画像の共有／保存
- Plausibleへ安全に接続できるAnalytics入口
- 実行時エラーの画面表示
- 湯間庭町への`work-ready`通知

## 最小の作品定義

`sketch.js`では、`setup()`、`draw()`、`touched()`を作りません。これらはエンジンが管理します。

```javascript
SSE.createApp({
  id: "my-small-app",
  logicalWidth: 360,
  logicalHeight: 640,
  initialScene: "title",

  scenes: {
    title: {
      opaque: true,

      draw() {
        background(SSE.theme.color("night"));
        fill(SSE.theme.color("cream"));
        SSE.type.apply("title", { align: CENTER });
        text("MY APP", 180, 360);
      },

      touch(touch) {
        if (touch.state === ENDED) {
          SSE.app.replace("play", null, { duration: "scene" });
        }
        return true;
      },
    },

    play: {
      opaque: true,
      update(dt) {},
      draw() {},
      touch(touch) { return true; },
    },
  },
});
```

## Sceneのルール

Sceneは必要な関数だけ持ちます。

```javascript
{
  opaque: true,          // 下のSceneを描画しない
  pauseBelow: true,      // 下のSceneを更新しない
  blocksInput: true,     // 入力を下へ渡さない（既定true）

  enter(context) {},
  leave(context) {},
  pause(context) {},
  resume(context) {},
  update(dt, context) {},
  draw(context) {},
  touch(touch, context) {},
}

// context.motionは、このSceneをleaveした時点で自動停止します。
```

画面遷移：

```javascript
SSE.app.replace("result", resultData, {
  duration: "scene",
  color: "nightDeep",
});
```

Modalやメモ：

```javascript
SSE.app.push("memo", memoData);
SSE.app.pop();
```

## モーション

作品間で同じ「呼吸」を使います。

```javascript
SSE.motion.time("quick"); // 0.16秒
SSE.motion.time("card");  // 0.24秒
SSE.motion.time("read");  // 0.96秒
SSE.motion.time("scene"); // 0.60秒
```

Scene内のTween：

```javascript
const playScene = {
  enter(context) {
    context.motion.to(
      card,
      { y: 320, alpha: 1 },
      "card",
      "backOut"
    );
  },
};
```

Scene内のTimeline：

```javascript
enter(context) {
  context.motion.sequence()
    .to(card, { y: 320 }, "card", "backOut")
    .wait("read")
    .call(() => SSE.app.replace("result", null, { duration: "scene" }))
    .start();
}
```

`context.motion`で開始したTween、Delay、Timelineは、そのSceneが`leave`すると自動的に破棄されます。画面をまたいで継続させる音量フェードなど、本当にアプリ全体へ属する処理だけ従来の`SSE.motion`を使います。


## データ保存

作品ごとの設定や進行状況は`SSE.storage`へ保存します。キーは`createApp()`の`id`ごとに分離されるため、別作品と衝突しません。

```javascript
SSE.storage.set("activeCity", "Skopje");
SSE.storage.set("settings", { lowPower: false });

const city = SSE.storage.get("activeCity", "Tokyo");
const settings = SSE.storage.get("settings", { lowPower: false });
```

```javascript
SSE.storage.has("activeCity");
SSE.storage.remove("activeCity");
SSE.storage.clear(); // この作品の保存データだけを削除
```

保存先を確定するため、`SSE.storage`は`SSE.createApp()`実行後、Sceneや`setup`コールバック内で使います。保存できない埋め込み環境では、`get`は指定したfallbackを返します。

## テーマ

標準テーマは、暗い夜、木、紙、生成り、赤茶、琥珀を共通語彙にしています。

```javascript
fill(SSE.theme.color("paper"));
fill(SSE.theme.color("red", 180));
SSE.type.apply("cardMain", { align: CENTER });
```

作品ごとに上書きできます。

```javascript
SSE.createApp({
  theme: {
    colors: {
      accent: [80, 140, 180],
    },
    motion: {
      scene: 0.72,
    },
  },
});
```

同じ色に統一するのではなく、色名・文字の役割・時間の役割を共有します。

## Camera2D

```javascript
const camera = new SSE.Camera2D({
  x: 490,
  y: 320,
  zoom: 0.8,
  smoothing: 0.12,
  bounds: { x: 0, y: 0, w: 980, h: 640 },
});

camera.moveTo(targetX, targetY, 1.0);
camera.update(dt);

camera.begin();
drawWorld();
camera.end();
```

タッチをワールド座標へ戻す場合：

```javascript
const world = camera.screenToWorld(touch.x, touch.y);
```

## 音

音声ファイルを登録：

```javascript
SSE.createApp({
  audio: {
    masterVolume: 0.7,
    sounds: {
      tap: {
        file: "sounds/tap.ogg",
        volume: 0.12,
        cooldown: 70,
      },
    },
  },
});

SSE.audio.play("tap");
```

合成音：

```javascript
SSE.audio.tone({
  frequency: 440,
  endFrequency: 620,
  duration: 0.10,
  type: "triangle",
  volume: 0.04,
});
```

## 日英切替

```javascript
SSE.createApp({
  i18n: {
    defaultLanguage: "jp",
    text: {
      title: {
        start: { jp: "はじめる", en: "START" },
      },
    },
  },
});

text(SSE.i18n.t("title.start"), 180, 100);
SSE.i18n.toggle("jp", "en");
```

## 画像共有

現在の論理画面だけを切り出します。

```javascript
await SSE.share.image({
  fileName: "result.png",
  title: "MY APP RESULT",
  text: "今回の結果",
  pixelRatio: 2,
});
```

スマートフォンでは共有シート、非対応環境ではPNGダウンロードへフォールバックします。

## Plausible

Plausibleが読み込まれていれば、そのまま安全に送れます。読み込み失敗や広告ブロックでゲーム本体は停止しません。

```javascript
SSE.createApp({
  analytics: { enabled: true },
});

SSE.analytics.track("Game Started", {
  language: SSE.i18n.language,
});
```

## 湯間庭町との接続

```javascript
SSE.createApp({
  bridge: {
    workId: "my-small-app",
  },
});
```

Canvasとフォントの表示準備が整った最初のフレーム後に、次を通知します。

```javascript
{
  type: "yumaniwa:work-ready",
  version: 1,
  workId: "my-small-app"
}
```

## 既存作品の扱い

v0.1は既存3作品を直接書き換えるためのパッチではありません。

1. 4本目をこのStarterから作る
2. 実制作で不足したAPIだけEngineへ追加する
3. 安定した機能から既存作品へ段階的に戻す

という順番を前提にしています。

最初に移植しやすいものは、Font、Audio、Share、Error、Analytics、Viewportです。ゲーム状態や個別ルールは作品側に残します。

## 次の候補

v0.2では、実際の4本目に合わせて次を追加する想定です。

- ParticleEmitter
- Stamp / HitStop / Shakeの共通Feedback
- ResultCard / Receiptの部品化
- Scene単位のAsset preload
- 共通の保存データVersion管理
- 湯間庭町の共有パネルBridge

機能を先回りで増やすのではなく、二作品以上で必要になったものから昇格させます。

## StarterとBlankの使い分け

- `sketch.js`：機能確認用の動くStarter
- `sketch.blank.js`：新作開始用の空テンプレート

新作では`sketch.blank.js`を複製して`sketch.js`へ改名します。

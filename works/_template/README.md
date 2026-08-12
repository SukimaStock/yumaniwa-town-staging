# 触れるらくがき：作品テンプレート

この `_template` フォルダを丸ごと複製して、作品IDのフォルダ名に変更します。

```text
works/rainy-window/
  index.html
  style.css
  work-meta.js
  sketch.js
  assets/
```

- `sketch.js`：Codea風の `setup()` / `draw()` / `touched(touch)` を書く本体。
- `assets/`：作品だけが使う画像・音素材。
- `work-meta.js`：作品内のメモ。公開設定は町側の `data/works.js` を編集します。

新しい作品を町に置くときは、`data/works.js` へ `launch: "embedded"` と `entry: "./works/<作品ID>/index.html"` を登録します。

## 座標は必ずCodea式

作品側では、画面左下が `(0, 0)`、画面右上が `(WIDTH, HEIGHT)` です。`touch.y` も画面下で0、上へ行くほど大きくなります。

- 下へ落とす：`y -= speed * DeltaTime`
- 上へ動かす：`y += speed * DeltaTime`
- ブラウザCanvas用の `HEIGHT - y` は作品側に書かない

## 消しゴム・マスク・裏Canvasを使う場合

`document.createElement("canvas")` と生の `getContext("2d")` を直接使わず、必ずEngineの層を使います。

```javascript
var layer = CodeaLite.createCodeaLayer(WIDTH, HEIGHT, 0.6);

layer.withCodeaContext(function(ctx) {
  // この中もCodea座標のまま描けます。
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
});

layer.eraseSoftEllipse(touch.x, touch.y, 18, 18, 0.8);
layer.drawToScreen(0, 0, WIDTH, HEIGHT, { smoothing: true });
```

## 初回移植チェック

最初に動かすときだけ `sketch.js` 冒頭の `COORDINATE_CHECK` を `true` にします。上下のガイドとタッチマーカーが、実際に触った位置と一致することを確認してから `false` に戻してください。

# 観光協会 0.1 — 実装と確認

2026-10-13。独立したactive / staging-only試作。Production、町への入口登録、3D Lab、モデル原典、共通Engineは変更しない。

## 採用資産

|番号|ID|動作|
|---|---|---|
|78|ticket-stamper|押している間プレスを下げ、離すと戻る。既存の上下直動|
|103|mail-sorting-trays|2枚のトレーを別々に引き出す|
|115|twin-bookends|左右の本立てを別々にずらす|
|116|folded-newspaper|机上で少し移動|
|119|school-globe|既存の傾いた地軸を指で回す。作品側の定義コピーだけをspinからrotateへ変更|
|128|desktop-fan|既存ローターの自律回転。触ると停止／再開。ドラッグで道具全体を少し移動|
|132|folding-reading-stand|案内板の傾き|
|135|desk-stapler|ヘッドを押し、離すと戻る|
|143|paper-boat|机上で少し移動|
|148|warded-key|机上で少し移動|
|177|brass-whistle|机上で少し移動。吹く機構は追加しない|
|198|old-spectacle-frame|机上で少し移動。つるを別パーツ扱いしない|
|208|three-leaf-succulent|鉢を添え、植物を少し移動|
|212|folding-service-shelf|既存ヒンジで棚を畳む。取り付け板を机の奥に設置|
|214|turning-hourglass|既存の横軸を指で回す。流れる砂は未実装|
|232|rotary-dial-telephone|既存ダイヤルの縦軸を回す|
|233|tilting-reading-lamp|既存ランプシェードの角度を変える|
|280|carved-chess-knight|机上で少し移動|
|283|sliding-matchbox|既存の内箱を左右に引き出す／戻す|
|289|wooden-toy-sailboat|机上で少し移動|

11モデルに既存パーツによる直接操作、1モデルに自律モーションと停止／再開を接続。その他の静止モデルは可動機構を捏造せず、道具全体を机上の狭い範囲で動かす。可動部以外に触れた場合はその道具の主操作へ割り当て、近隣の道具へは割り当てない。タップでも主操作を試せる。

## 原典調査と配置判断

- 候補20個全て採用し、置換なし。コレクションは番号300まで存在。実行時には全300個をロードせず、一覧＋採用20定義だけを4並列で読む。
- 模型のdisplay.orientationは単体展示用なので机上配置には使用せず、幾何形状・パーツ姿勢・軸・範囲を維持して各道具の置き角度を指定する。
- モデルは展示時の共通サイズから、電話／扇風機／鍵など実際の机の比率に個別スケール調整。各静止姿勢の最低点を机上へ接地させる。
- 鍵と眼鏡を机に寝かせる。折り畳み棚は壁付けモデルなので机の後ろに取り付け板を置く。多肉植物には新規の素朴な鉢を添える。
- 本立てに3冊、スタンプ前に重ねた紙、横にインク台、手前に案内紙を添える。新規造形は家具とこれらの小物だけ。

## Engine再利用

LabのRendererのシェーダー、初期化、VAO、リサイズ処理を継承。新作側のDeskRendererが複数モデルのフレーム、机上の接触影、depth testを管理する。従来Renderer.drawの「モデルごとに画面を消去」を使わず、一つの深度バッファへ机＋20モデルを描く。

RigidParts、MotionPlayer、ManipulationPlayer、Camera、manipulationMapping、validateSpecimen、既存の行列／クォータニオン計算を読み取り専用で利用。世界／道具／可動パーツの座標変換を新作側に追加。rayを道具座標へ逆変換して三角形単位で判定し、全道具の最近接hitを採用。大まかな球判定で離れたモデルの三角形探索を省く。可動パーツの現在姿勢もピッキングに反映。

SSE Engine 0.3.0のaudio.configure / withBaseline / unlock / tone / lifecycle APIを利用。BGMなし、初期は無音。「音なし」を切り替えたときだけ小さな素材別の短音。Web Audioの独自管理は追加しない。音の聴感は実機未確認。

固定カメラ。pointer captureで対象を保持し、touch-action:noneでスクロールを抑止。resize／回転／キャンセル／visibility／pagehideで操作を終了。ページ復帰でdtをリセット。WebGL context lossは停止・案内、restoreでGPUバッファを再作成。音も既存lifecycle経由で休止。キーボード左右キーで対象を選びEnter／Spaceで反応。

GPUへ頂点を一度だけSTATIC_DRAWで転送し、各フレームはパーツ行列だけを更新。DPR上限1.5。非表示時はRAF停止。

## 検証

- 新作テスト7件PASS：全20モデル番号／原典無変更、world-localと行列合成、全道具接地・机の範囲、11モデルの独立操作と範囲、fan／globe／hourglass機構、4画面サイズで全20道具と全11可動モデルの可視ピッキング、机座標でmatchboxのドラッグ。
- 390×844、844×390、768×1024、1366×900の4構図で静止＋操作後の8フレームをMesa/EGL GLES 3.2で描画。既存の実シェーダーがcompile/link成功、全フレームGL error 0。静止／操作後の画像差分も確認。phone縦、横、tablet、desktopの静止画像を視覚確認。
- 既存Labのmanipulation／motion回帰75件PASS。SSE audio lifecycle回帰もPASS。
- 証拠はoffscreen GLESとNodeによる検証。ブラウザ／Safariでの表示、DOMイベント、実iPhone／iPadの触感・描画負荷・音・復帰は未確認。静的検査成功を実機PASSとは扱わない。
- 作品台帳と生成LABの追加を含むため、scopeをPlan Lockに固定。Scope → Risk → Impactとtrusted CIを確認してからマージ。

## 制約と次の候補

道具の自由な持ち上げ、衝突物理、状態保存、電話の発信／自動巻き戻し、扇風機の首振り、砂の流量、光源を動かす照明表現はない。棚は奥でやや小さく、細い鍵・眼鏡・笛はスマートフォン実機で触りやすさの調整余地がある。

次は作者の実機確認をもとに、道具間の距離、音の材質感、指先への反応を詰める。町の紙面や観光記念印、受話器を持ち上げる機構は別の小さな追加候補。

検証コマンド：

```sh
node --test works/yumaniwa-tourist-desk/tests/*.test.mjs
node --test works/sukima-3d-lab/tests/manipulation.test.mjs works/sukima-3d-lab/tests/motion.test.mjs
node works/yumaniwa-tourist-desk/tests/render.mjs > /tmp/tourist-desk-scenes.json
python works/sukima-3d-lab/tests/check-gles.py /tmp/tourist-desk-renders < /tmp/tourist-desk-scenes.json
```

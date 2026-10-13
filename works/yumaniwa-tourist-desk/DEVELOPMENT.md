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

## 0.2 — 受付のひとすみ（2026-10-13）

上記0.1の記録は制作履歴として保存。現在の配置は以下の8モデルのみ：78スタンプ、232黒電話、128扇風機、233照明、103トレー、132資料台、283マッチ箱、208植物。12モデルの参照を机から外しただけでコレクションを削除していない。

奥は電話と送風、照明と整理トレー、中央はスタンプ用紙と案内台、手前はマッチ箱と受付の空き。壁付け棚、玩具、鍵、眼鏡、新聞、本立て、地球儀、砂時計、笛、ホチキス等を除き、関連する紙をまとめた。台の既存パーツに地図の紙面を重ね、道路・川・駅の目印を少数の三角形で印刷表現。紙面はそのヒンジと同じ行列で描き、原典の形・軸・範囲は変更しない。

カメラを近づけ、机の左右を切った受付の構図に変更。小さなタイトルは画面端に移し、14svhの上余白を撤廃。390×844における主役の投影幅は、電話62→128px（2.06倍）、スタンプ43→86px（2.00倍）、ランプ51→93px（1.83倍）、マッチ箱48→92px（1.93倍）。模型の全頂点からの投影幅であり、可動部単体や指の体感のサイズではない。

タッチは既存の三角形最近接hitを優先。近くの外れタッチのみ、最大14 CSS px以内で画面上のrayをサンプル。複数モデルが同じ近さなら選択しない。拡大hitから得た点で既存パーツマッピングを始める。キャプチャ後の操作対象は固定する。扇風機の自律回転／停止、プレスの押下／復帰、他の既存パーツ操作、SSE音・キャンセル・復帰処理は保持。

### 0.2検証

- 新作の更新テスト11件：8原典／9リクエスト、座標・接地、6モデルの独立した機構、扇風機の時間変化／停止、4サイズの全8道具・6可動モデルの可視ピッキング、マッチ箱操作、拡大hitで直接hitを横取りしないこと、曖昧な隣接hitの不選択、4主役の拡大比率、案内地図のヒンジ追従。
- 既存Labのmanipulation/motion回帰75件、SSE audio lifecycle回帰20件。
- 4サイズの静止／操作後8フレームをMesa/EGLで描画、実シェーダーcompile/link、GL error 0。phone縦・横、tablet、desktopの画像を確認。
- `tests/evidence/portrait-comparison.png` は0.1／0.2の同一390×844オフスクリーン描画比較。ブラウザのスクリーンショットではなく、HTMLタイトルや接触影は含まない。
- Browser/Safariと物理iPhone/iPadの実際のDOMイベント・触感・音・復帰はUNVERIFIED。今回の実機での採用判断は作者に委ねる。
- 共通Engine、3D Lab、モデル原典、作品台帳、LAB、町、他作品、Productionは無変更。既存0.1の検証recordは履歴であり0.2の確認証拠ではない。

## 0.3 — もう少し近くで見る（2026-10-13）

1本指は既存の道具操作、2本指は1.0〜1.6倍のピンチ拡大／縮小。角度・カメラ距離・モデル位置を保ち、作品側Cameraの画角だけを変更する。パン、自由回転、通常タップでの自動フォーカスは追加しない。机を見渡す1.0倍が下限。拡大時だけ画面左下に「元の眺めへ」を表示し、道具の状態は保持して倍率だけ戻す。

2本目の接触で進行中の道具操作をcancelし、スタンプ等は従来のreleaseで戻す。ピンチ中は同じ2個のpointer idが倍率を所有し、片方が離れたら残る接触が全て離れるまで道具のtap/dragを再開しない。3本目は倍率を所有しない。上限外からの反転は直ちに反応する。拡大・縮小は指の間隔の増分から計算し、指の中心移動をパンへ変換しない。

pointer captureは背景への接触も保持し、キャンセル／lost capture／resize／visibility／GL loss／戻すボタンで入力を整理する。元の文字選択・コピー・長押しcalloutの抑止、既存パーツ／静かなMotion／SSE音を維持。戻すボタンのクリックと音ボタンのクリックは独立。

### 0.3検証

- 作品テスト22件PASS：従来11件、pinch状態・倍率・camera/pickingの10件、実appのイベント接続fixture1件。
- イベントfixtureはNodeのfake DOM／fake rendererで実app.jsを評価する。実際のpointerdown/move/up/cancel/lostcaptureとbutton/lifecycleの接続で、道具cancel、残る指のdrain、新しい単指tap、reset、押下中スタンプ復帰、画面回転、非表示、GL loss、copy抑止、音ボタンを確認。ブラウザ試験と扱わない。
- Camera倍率は有限な1.0〜1.6に制限。元の角度・距離・モデル行列不変、resetで投影行列が元と一致、4viewportの最大倍率で電話とスタンプの可動部が画面内で選択可能、投影幅が1.6倍になることを確認。
- 既存Lab manipulation/motion75件、SSE audio lifecycle20件PASS。
- 同じ実シェーダーで4サイズ×通常／操作後／最大倍率の12フレームをMesa/EGL描画、compile/link成功・GL error 0。4構図の最大倍率画像を確認。比較画像 `tests/evidence/peek-zoom-comparison.png` はオフスクリーンの倍率比較であり、HTML UI／接触影／ブラウザ画面は含まない。
- 物理iPhone/iPad・Safariのピンチ、触感、描画負荷、音とネイティブUI抑止はUNVERIFIED。最大倍率では周辺の模型の一部が画面外へ切れるため、見渡す場合は「元の眺めへ」で戻す。
- 8原典、共有Engine、3D Lab、他作品、台帳、LAB、町、Productionに変更なし。旧verification recordは旧版の履歴、0.3の証拠は別recordへ記録。

## 0.3.1 — カメラワークの調整（2026-10-13）

ピンチの範囲1.0〜1.6は維持し、smoothstepで距離を最大約30%近づけ、見下ろし角を44.7度から34.4度へ緩める。視野角は36度から34度への補助的な変化だけとした。初期位置は従来と一致し、縮小で完全に戻る。自由回転／パン／遅延アニメーションは追加しない。静止小物のdrag変換も現在のpitchを参照する。

下部の戻す／音ボタンはCSSで常時非表示。縮小ピンチで元の眺めへ戻る。音は従来の初期ミュートを維持し、勝手に有効化しない。前版にタップフォーカスは存在せず、今回も通常タップを道具の操作に残す。物体を触ってカメラが自動で寄る機能はない。長押しcallout／コピー抑止とピンチ中の道具cancel・指が全て離れるまでのdrainは維持。

作品24テストPASS。距離・角度の単調で連続した変化、元の投影・姿勢への完全復帰、奥行きによって異なる拡大比、4画面サイズの電話／スタンプの操作部ピッキング、常時非表示UIを確認。既存Lab75件・SSE音20件を回帰確認。4サイズ×初期／途中／操作後／最大の16フレームを実シェーダーでMesa/EGL描画、GL error 0。比較画像 `tests/evidence/camera-approach.png` は初期／途中／最大の390×844オフスクリーン描画で、ブラウザのスクリーンショットではない。最大では周辺模型が切れるが、電話・スタンプ・資料と手前の余白を保つ。

物理iPhone/iPad・Safariの触感と音はUNVERIFIED。モデル原典、共有Engine、Lab、他作品、Productionは変更しない。

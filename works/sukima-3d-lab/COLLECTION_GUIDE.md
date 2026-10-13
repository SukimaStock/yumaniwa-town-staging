# SukimaStock 3D · 立体を追加する

立体を作る → 一覧へ登録する → 実際に触る。通常の追加作業では、エンジン・UI・既存展示物を編集しません。

## 最短の追加手順

1. 最新staging/mainとAGENTS.mdを確認し、作業branchを作ります。既存の作品内の小変更に適合するか、現在の開発運用で判断してください。
2. `works/sukima-3d-lab/objects/<id>.json`を作ります。閉じた凸形状を触れる立体にするなら`stone.json`や`seed.json`、自由な形を眺めるなら`dent.json`・`ring.json`・`bowl.json`・`leaf.json`・`mobile.json`、パーツを動かすなら`pinwheel.json`・`shutter.json`・`pendulum.json`・`slider.json`・`mobile-motion.json`、指で動かす模型なら`door.json`・`crank.json`・`drawer.json`を複製し、**新しいID**で形・色・触感・姿勢を調整してください。既存データを上書きしません。
3. `works/sukima-3d-lab/collection.json`の`items`末尾へ`{"id":"<id>","file":"objects/<id>.json"}`を追加します。`number`省略時は従来どおり0始まりの登録順です。既存00〜15、17〜36を保ち、v0.6追加分は37〜41、Collection 03は42〜56、v0.7追加分は57〜59です。次番号は正本`collection.json`の登録済み番号を確認し、その最大値＋1を指定します（16の欠番は埋めません）。以後も既存の順序・番号を変えません。番号は一意な0〜9999の整数です。
4. 下記の自動テスト・描画・触感確認を行います。プレビューは同じデータから自動生成され、画像を別途用意する必要はありません。
5. PRを作成し、必要なCI後にStagingへ反映します。Productionへの反映やDotsの定期実行は別の指示が必要です。

追加する基本ファイルは**JSON 1つ＋一覧への1行の登録**です。JSONはHTTPキャッシュを再確認して読むため、データだけの追加でエンジンの版番号を変える必要はありません。描画、当たり判定、入力、変形のコードに`if (id === ...)`を足さないでください。個性はシルエットとデータで作ります。

## データ形式 v1

実例は`objects/polyhedron.json`（元の20面体）、`stone.json`、`crystal.json`、`seed.json`、`shell.json`、`odd.json`です。

| フィールド | 指定する内容 |
| --- | --- |
| `schema` | 固定値 `sukima3d-specimen/1` |
| `id` | 小文字英字で始まる2〜48字。英数字とハイフン。ファイル名と一致させる |
| `name` | 展示名。空文字不可、48字以内。HTMLは使わない |
| `tags` | 短い分類語の配列。8個以内、各24字以内 |
| `geometry.vertices` | `[x,y,z]`の配列。4〜64頂点、有限値、各成分−2〜2 |
| `geometry.faces` | 頂点番号の配列を並べる。4〜96面、各3〜12頂点 |
| `geometry.cornerCompliance` | 元の頂点の押し込みやすさ（0〜1） |
| `geometry.centerCompliance` | 面の中心に追加される頂点の押し込みやすさ（0〜1） |
| `geometry.limits` | 任意の形状保護上限。`pressDepth`、`maxDisplacement`、`maxPull` |
| `material` | `kind:"matte"`、`color:[r,g,b]`（各0〜1）、`variation`（0〜0.08） |
| `material.faceColors` | 任意。各論理面のRGBを、面と同じ順序・数で指定 |
| `feel.profile` | `HARD` / `SOFT` / `BOUNCY`。通常の基準はSOFT |
| `feel.overrides` | 個別に上書きする触感の値。上書きなしでも`{}`を指定 |
| `display.orientation` | 単位クォータニオン `[x,y,z,w]`。無回転は`[0,0,0,1]` |
| `display.scale` | 正の一様倍率（0.55〜1.25）。物体半径×倍率は1.65以下 |

座標は **Xが右、Yが上、Zが正面**。原点の周りに形を作ります。目安として半径1前後、少し不規則でも重心と見た目の中心が大きく離れないようにします。正規化・再センタリングは自動では行いません。カメラは表示半径に応じて余白を確保します。

v1は**厚みがある、閉じた、凸の立体**を対象にします。各面も平らな凸多角形にしてください。穴、薄い一枚板、内部面、凹形状、自己交差、複数の離れた塊は対象外です。自由な形には下記のv2を使います。既存の貝殻（SHELL）は、中空モデルではなく厚みのある扇形の立体です。

## 頂点・面のルール

- 外側から面を見たとき、頂点を**反時計回り**に並べます。裏返りをローダーが勝手に直すことはありません。
- 面の境界は同じ頂点番号を共有します。座標だけ同じ別頂点を作らないでください。すべての頂点が使われ、各辺が逆向きに2回ずつ現れる閉じた構造にします。
- 平らでない四角形は三角形に分割します。極端に細い面や短い辺を避け、辺は0.025単位以上、面の面積にも余裕を持たせます。
- ローダーが各面へ中心頂点を1つ追加し、周囲と結ぶ三角形へ変換します。作者が中心頂点の番号を計算する必要はありません。GPU三角形の合計は512以下です。
- 押し込みや引っ張りで面が少し曲がりますが、共有頂点によって継ぎ目はつながります。複雑さより外形と光の当たり方を優先してください。

## 最小の有効例

この形状を`objects/cube-study.json`に保存し、一覧へ登録すると、そのまま触れます。これは形式の説明例で、現在の展示には登録していません。

```json
{
  "schema": "sukima3d-specimen/1",
  "id": "cube-study",
  "name": "CUBE STUDY",
  "tags": ["角", "面"],
  "geometry": {
    "vertices": [[-0.55,-0.55,-0.55],[0.55,-0.55,-0.55],[0.55,0.55,-0.55],[-0.55,0.55,-0.55],[-0.55,-0.55,0.55],[0.55,-0.55,0.55],[0.55,0.55,0.55],[-0.55,0.55,0.55]],
    "faces": [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]],
    "cornerCompliance": 0.48,
    "centerCompliance": 1,
    "limits": {"pressDepth":0.15,"maxDisplacement":0.20,"maxPull":0.36}
  },
  "material": {"kind":"matte","color":[0.62,0.50,0.40],"variation":0.028},
  "feel": {"profile":"SOFT","overrides":{}},
  "display": {"orientation":[0,0,0,1],"scale":1}
}
```

## データ形式 v2 — Free Forms

`schema:"sukima3d-specimen/2"`は**明示的な三角形メッシュ**です。面中心を追加せず、凸包に変換せず、穴を塞ぎません。v1 JSONの一括変換は不要で、同じCollectionで共存します。

| 作りたい立体 | 選ぶ形式・指定 | 実例 |
| --- | --- | --- |
| 従来の押せる閉じた凸多面体 | v1 `geometry.faces`＋`feel` | 元の16作品 |
| くぼみ、溝、枝、穴 | v2・作者が三角形を明示 | DENT / RING |
| 器・筒・内側が見える殻 | v2・外面／内面／縁を作る | BOWL |
| 薄い面 | v2 `surface:"open"`・`doubleSided:true`、または実際の厚みを作る | LEAF |
| 複数パーツ | v2 `parts`・各パーツのTRS | MOBILE |

### 必須フィールド

`id`・`name`・`tags`・`display`の意味と範囲はv1と同じです。`geometry`と`material`を各パーツへ分け、振る舞いは`behaviors`で指定します。

| フィールド | 内容 |
| --- | --- |
| `parts` | 1〜32パーツ。各`id`は立体内で一意、命名規則は立体IDと同じ |
| `parts[].geometry.surface` | `closed`（閉じた表面）または`open`（境界がある表面）。穴のあるRINGも表面はclosed |
| `geometry.vertices` | `[x,y,z]`の配列。3〜2048頂点／パーツ、各成分−2〜2、全頂点を使う |
| `geometry.triangles` | `[a,b,c]`の頂点インデックス配列。1〜4096三角形／パーツ。多角形を渡さない |
| `geometry.normals` | 任意。各頂点の単位法線、頂点数と一致。省略すれば三角形ごとのフラット法線 |
| `material` | `kind:"matte"`・RGB・`variation`はv1と同じ。`doubleSided`は必須boolean |
| `material.triangleColors` | 任意。三角形と同じ順・数のRGB。パーツごとに色を指定できる |
| `transform.position` | `[x,y,z]`、各−2〜2 |
| `transform.orientation` | 単位クォータニオン `[x,y,z,w]` |
| `transform.scale` | `[sx,sy,sz]`、各0.02〜4の**正**の倍率。負倍率による巻き順反転は不可 |
| `behaviors` | 表示のみは`{}`。Touchを適用する場合は下記の`touch`を追加 |

変換順は**パーツ内の倍率 → パーツ回転 → パーツ移動 → displayの一様倍率 → 展示姿勢**です。全パーツの変換後の座標は、原点から半径1.65以下に収めます。法線には倍率の逆数を適用して正規化し、その後回転します（非一様倍率の逆転置）。

全体の上限は2048頂点・8192描画三角形です。両面は裏側の三角形コピーも予算に数えます。今回の作品は90 / 144 / 168 / 32（両面） / 240描画三角形です。上限まで使う必要はなく、少ない面でシルエットを作ります。

### 三角形と表面の品質

見せたい側から見て**反時計回り**です。器の内面は外面と逆を向き、外面・内面・縁を同じ表面として接続します。リングの穴を大きな面で横断してはいけません。凹多角形や穴を持つ面の分割は作者が行い、ローダーによる中心ファン分割へ任せません。

共有辺は逆向きに使います。1辺に3面以上、同じ三角形の重複、未使用頂点、範囲外／小数インデックス、非有限値、面積ゼロ、変換後に潰れる三角形を拒否します。closedはすべての辺が2面に接し、正の符号付き体積を持つ必要があります。openは1面だけの境界辺を認めます。離れた連結成分も扱えます。両面描画は壊れた巻き順を直す機能ではありません。

任意の法線は有限な単位ベクトルで、各接続三角形の巻き順と同じ側を向く必要があります。平たい面をはっきり見せたいときは省略してください。自己交差、入れ子の表面の外向き判定、対向面の衝突を完全には検出・修復しません。回した描画と制作者の確認も必要です。

### 最小の薄い面

```json
{
  "schema":"sukima3d-specimen/2",
  "id":"paper-study","name":"PAPER STUDY","tags":["薄い面"],
  "parts":[{
    "id":"sheet",
    "geometry":{"surface":"open","vertices":[[-0.6,-0.5,0],[0.6,-0.5,0],[0,0.6,0.08]],"triangles":[[0,1,2]]},
    "material":{"kind":"matte","color":[0.58,0.62,0.46],"variation":0.018,"doubleSided":true},
    "transform":{"position":[0,0,0],"orientation":[0,0,0,1],"scale":[1,1,1]}
  }],
  "behaviors":{},
  "display":{"orientation":[0,0,0,1],"scale":1}
}
```

### STATICとTOUCH

STATIC / TOUCHはUI上の操作説明です。形状の排他的な種類ではありません。

- **v1**は`behaviors`省略で従来どおり`feel`を使ってTouchを有効にします。形・色・姿勢は変えず、`behaviors:{}`を追加すれば表示と回転だけにできます。
- **v2**は`behaviors:{}`がSTATICです。押し込み・引っ張り用のbody状態を作りません。穴や背景からのドラッグ、長押し後のドラッグも回転でき、「初期姿勢」で回転と余韻を停止して戻せます。
- 同じ閉じた凸形状をTouchで使いたい場合は`behaviors:{"touch":{"profile":"SOFT","overrides":{}}}`とします。v1では既存geometryを使い、v2では既存Touch用の面中心を追加するアダプターを使います。
- **v2のTouchは現行物理が扱える1パーツの閉じた凸形状のみ**です。v1の頂点数・面数・体積等の厳しいチェックも適用し、doubleSidedは不可。任意で`touch.deformation`に`cornerCompliance`・`centerCompliance`・`limits`（v1と同じ範囲）を指定できます。法線は変形に合わせてフラットに再計算します。今回の5作品には付けません。
- 凹形状・リング・器・薄い面・複数パーツへTouchを付けても、危険な変形を黙って適用せず読込み時に拒否します。新しい物理は次の検討事項です。

共通の描画・カメラ・回転はTouchに依存しません。v0.6では別の能力として下記のMotionを実装します。未知の振る舞いは無視せず拒否します。独立したMotion Labの変更はありません。

### プレビュー

v1は従来の静的SVG（論理面ごと）を維持します。v2は同じメッシュ／パーツ変換／マテリアル／カメラ／光から200pxの静止プレビューを生成し、奥行きバッファで前後を判定します。穴は透明で、内面と複数パーツの遮蔽も扱います。一覧にWebGLコンテキストやアニメーションは作りません。実物の投影と色の一致はCPU/GPU比較テストで確認します。

## Motion — パーツを動かす（v0.6）

形状はv2の`parts`、動きは`behaviors.motion`に記述します。表示だけは`behaviors:{}`（STATIC）、弾性変形は`touch`（TOUCH）、パーツの自律的な動きは`motion`（MOTION）です。これらは形状種別や排他的なmode列挙ではありません。v0.6はMotion単体を実装し、**TouchとMotionの同時指定は未対応として拒否**します。剛体パーツ変換と弾性変形を組み合わせる座標系は今後の課題です。

`motion`は`version:1`と1〜64本の`tracks`を持ちます。トラックの`part`は`parts[].id`と完全一致させます。1パーツには回転（spinまたはswing）を1本、slideを1本まで指定できます。同じパーツの回転と移動を併用する場合は、支点回転のあとにslideを合成します。複数回転の順序や階層・親子パーツはまだ扱いません。静止した支柱や台座にトラックを付ける必要はありません。

| type / 必須キー | 意味・範囲 |
| --- | --- |
| 共通 `part`, `type` | パーツIDと小文字`spin` / `swing` / `slide`。未知の種類・キー・欠けたキーを拒否 |
| spin `axis`, `pivot`, `speed`, `initialAngle` | axisは単位3ベクトル。pivotは形状座標、各−2〜2。speedは−6〜6 rad/s（符号で方向、0も有効）、initialAngleは−2π〜2π rad |
| swing `axis`, `pivot`, `baseAngle`, `amplitude`, `period`, `phase` | 基準角baseAngle＋amplitude×sin(2πt/period＋phase)。基準角・位相は−2π〜2π rad、振幅0〜1.4 rad、周期1〜120秒 |
| slide `direction`, `amplitude`, `period`, `phase` | 単位direction×amplitude×sin(2πt/period＋phase)。振幅0〜0.65、周期1〜120秒、位相−2π〜2π rad |

角度はすべて**ラジアン**、時間は秒です。pivotはパーツの`geometry.vertices`と同じ、倍率適用前の座標です。axisとdirectionは**パーツ基準の直交軸**で、base orientationが向きを決めます。directionの移動量はbase scaleで増減しません。変換順は **base scale → pivotを中心とするMotion回転 → Motion移動 → base orientation → base position → display.scale → 全体の展示回転**です。軸は作品全体の回転で逆転しません。

base transformと形状データを保存し、時間から毎回ローカル変換を計算します。元の頂点へ少しずつ回転を積み重ねません。非一様のbase scaleは読み込み時に形状と法線へ一度適用し、再生時は剛体回転＋一様display scaleの行列をGPUへ渡します。平面法線もパーツとともに回転します。描画・プレビュー・当たり判定で同じ変換を使います。

読み込み時の通常v2半径1.65制約は維持します。Motion全周期の最大半径は3以下に制限し、支点・全回転弧・移動の両端から安全な表示範囲を計算します。異なる位相を同時に最大にした上限なので、実際の形より余白が増えることがあります。カメラはその範囲に合わせ、途中で画角を変えません。パーツ同士の衝突や自己交差は自動検出しません。作者が周期全体を回して見て、必要なら支点・振幅・形を調整します。

### 動く薄い面の完全な例

```json
{
  "schema":"sukima3d-specimen/2",
  "id":"turning-sheet","name":"TURNING SHEET","tags":["回る","薄い面"],
  "parts":[{
    "id":"sheet",
    "geometry":{"surface":"open","vertices":[[-0.6,-0.5,0],[0.6,-0.5,0],[0,0.6,0.08]],"triangles":[[0,1,2]]},
    "material":{"kind":"matte","color":[0.58,0.62,0.46],"variation":0.018,"doubleSided":true},
    "transform":{"position":[0,0,0],"orientation":[0,0,0,1],"scale":[1,1,1]}
  }],
  "behaviors":{"motion":{"version":1,"tracks":[{"part":"sheet","type":"spin","axis":[0,1,0],"pivot":[0,0,0],"speed":0.35,"initialAngle":0}]}},
  "display":{"orientation":[0,0,0,1],"scale":1}
}
```

37 PINWHEELはSPIN、38 SHUTTER・39 PENDULUMはSWING、40 SLIDERはSLIDE、41 MOBILE（IDは`mobile-motion`、21の静止MOBILEは`mobile`のまま）は3種の同時再生の例です。Dotsは近い例を複製し、ID・形・色・base transform・トラックを編集して、manifest末尾へ新番号で登録します。エンジンやプレビューへ作品名の分岐を追加しません。

作品を開くとt=0から再生します。「一時停止／再生」は現在時刻を保持し、「初期姿勢」は全体の回転・慣性・Motion時刻を戻します（停止中なら停止を維持）。一覧・作品切替で古い状態を破棄します。非表示・フォーカス離脱・描画中断はRAFを停止し、復帰時に非表示中の時間を追いかけません。動きを減らすOS設定では最初は停止し、作者の操作で再生できます。`?debug`では経過時間とパーツ／トラックの対応を確認できます。一覧プレビューは**初期角・位相を適用したt=0**の静止画で、36既存作品のプレビューは変わりません。

### Motionの必須確認とよくある破綻

- 自動テストで未知type、存在しないpart、単位軸、有限値、周期／振幅、重複回転、変換順、全周期の範囲、停止・リセット・作品切替を確認します。登録された全作品はネイティブ描画スクリプトの対象です。
- Motionが大きな円を描く場合はpivotの座標とbase scaleを確認します。形状の端を支点にするとき、世界座標やpositionをpivotへ混ぜません。
- パーツが離れる／交差する場合は連動する部品を同じパーツのメッシュにまとめる、または同じトラック・支点を与える方法を使います。今回はジョイントや衝突で補正しません。
- 静止プレビューが実物と違う場合はinitialAngle・phaseを含めたt=0を比べます。Motionを止めて全方向から確認し、再生して周期全体の余白と接続を確認します。
- `tests/motion-fixture.html`はWebGLがないブラウザで入力と再生時計を確認するCPU用ページです。WebGL性能・iOS実機の証拠にはしません。

## Manipulation — 指で動かす（v0.7）

形は引き続き`parts`、直接操作は`behaviors.manipulation:{version:1,controls:[...]}`です。v1/v2既存データの変換は不要です。自律的に眺めたい動きにはMotion、指で角度や位置を保持したい動きにはManipulationを選びます。時間制御を手動値へ流用せず、同じ固定メッシュ・ローカル変換・描画・Pickingの基盤に、別の値制御を付けています。

操作対象の`part`は`parts[].id`と一致させます。1パーツに操作を1つ、全体で1〜32個まで設定できます。**同じパーツのMotionとManipulationは拒否**します。異なるパーツなら自律Motionと直接操作を併用できます。**Touch変形との併用、親子階層、衝突、機構の連動は未対応**です。

| type / キー | 内容・範囲 |
| --- | --- |
| 共通 `part`, `type`, `axis`, `initial`, `sensitivity` | typeは小文字`rotate` / `hinge` / `linear`。axisは有限な単位3ベクトル。感度0.25〜2、通常1。未知キー／欠けたキーも拒否 |
| ROTATE `pivot` | 支点は形状座標（各−2〜2）、initialは−2π〜2π rad。操作中の角度は連続保持し、描画だけ周期を折り返す |
| ROTATE 任意 `inertia`, `damping` | 慣性0〜1（省略・通常0）、減衰2〜18（省略8）。比較用で、通常は離した角度を保持 |
| HINGE `pivot`, `min`, `max` | 支点はROTATE同様。範囲各−π〜π rad、max−minは0.001以上。initialは範囲内。途中で止められ、自動的には閉じない |
| LINEAR `min`, `max` | パーツ軸に沿った移動量、各−1〜1、max−minは0.001以上。initialは範囲内。pivotは指定しない |

角度はラジアン、移動量はbase scale適用後・display.scale適用前の単位です。axisはパーツ基準の直交軸で、base orientationが向きを決めます。pivotは倍率適用前のgeometry座標です。変換順はMotionと同じ **base scale → 支点回転／軸移動 → base orientation → base position → display.scale → 全体回転**です。元の頂点を書き換えて変形や復元を繰り返しません。

### 指との対応と保持

可動パーツに触れた時点でパーツIDを固定してPointer Captureを行います。途中で指が外れても同じ操作を続けます。固定パーツ・背景から始めたドラッグは従来の全体回転で、操作中に分類を切り替えません。つかむ瞬間の見えている姿勢を保存し、全体の慣性と揺れを止めるので、姿勢が突然変わりません。

回転は軸を正面から見られる場合、軸に垂直な面へのレイ交点から支点周りの角度差を求めます。±πをまたいでも差分を連続して積み重ね、逆回転できます。斜め・横向きの軸は、触れた点の回転軌道を画面へ投影して指の差分に合わせます。LINEARは投影した移動軸へ指の差分を対応させます。範囲端では差分を取り直すため、大きく外へドラッグした後も逆方向へすぐ動きます。

軸上や画面からほぼ見えない方向では、小さな指の移動を過剰に拡大せず動きを抑えます。固定部分・背景で模型を少し回し、操作方向が見える姿勢にしてください。操作開始でパーツは跳ねません。カメラ係数と全体姿勢は操作開始時に固定し、リサイズや画面切替で古い操作をキャンセルします。大きな角度差と慣性速度は上限で守ります。

離すと角度・位置を保持します。cancel、capture loss、非表示、リサイズでも値は保持し、つかみ状態と速度だけ解除します。初期姿勢ボタン・作品の選び直しはJSONの初期値へ戻します。慣性はROTATEだけ任意で、基本3作品は0です。

### 最小の開閉する面

```json
{
  "schema":"sukima3d-specimen/2",
  "id":"flap-study","name":"FLAP STUDY","tags":["指で開閉"],
  "parts":[{
    "id":"flap",
    "geometry":{"surface":"open","vertices":[[0,-0.5,0],[0.8,-0.5,0],[0.8,0.5,0],[0,0.5,0]],"triangles":[[0,1,2],[0,2,3]]},
    "material":{"kind":"matte","color":[0.48,0.56,0.43],"variation":0.018,"doubleSided":true},
    "transform":{"position":[-0.4,0,0],"orientation":[0,0,0,1],"scale":[1,1,1]}
  }],
  "behaviors":{"manipulation":{"version":1,"controls":[{"part":"flap","type":"hinge","axis":[0,1,0],"pivot":[0,0,0],"initial":-0.15,"min":-1.3,"max":0,"sensitivity":1}]}},
  "display":{"orientation":[0,-0.1986693308,0,0.9800665778],"scale":1}
}
```

実例は57 DOOR（枠＋扉）、58 CRANK（台座＋軸＋回しやすい端のグリップ）、59 DRAWER（外箱＋中空のトレー）です。可動部にノブや面積を持たせ、細い軸だけをつかませない形を作ります。DOORは少し開いた初期値で方向を分かりやすくし、DRAWERは最大位置でも箱に一部残ります。見た目の支持・隙間・全可動範囲を作者が確認してください。衝突で隙間を自動修正しません。

Dotsは近いJSONを複製し、新ID・part ID・形・マテリアル・軸・支点・初期値・範囲を調整して、collection末尾へ次番号（`collection.json`の最大番号＋1）で登録します。**エンジン・入力・プレビューへ作品名の条件分岐を加えません**。静止プレビューは手動初期値を反映し、Pickingは操作後の行列で判定します。

`?debug`に対象パーツ、入力mode、角度／移動量、感度、範囲、ROTATEの慣性／減衰を表示します。調整は一時的でJSONへ保存しません。範囲を変更すると位置はその範囲内へ制限され、表示範囲も再計算します。リセットは現在の調整範囲内の初期値へ、選び直しはJSON設定へ戻ります。

必須確認：少しだけ動かして離す、逆へ戻す、端を越えてから逆へ動かす、全体を回した後に操作する、指を画面外へ動かす、操作中にリサイズ／切替／capture loss、リセット、静止・Motion・Touchの回帰。自動テストは既存56作品のJSON・登録・描画・Motion数値を変更前mainと照合し、手動操作のレイ、範囲、保持、キャンセル、同一パーツ競合、不正値も検査します。`tests/manipulation-fixture.html`は実際のPickingとPointerInputを使うCPU検証面です。WebGLや実機性能の確認とは区別します。

| 症状 | 確認すること |
| --- | --- |
| つかんでも動かない | 固定部に隠れていないか、軸上を触っていないか、操作軸が画面上で見えるか |
| 操作方向が違う | axisの符号、base orientation、pivotを世界座標で指定していないか |
| 初めに大きく跳ねる | 初期値と範囲、ローカル支点、作者による独自の姿勢補正を混ぜていないか |
| 扉が枠を貫く／引き出しが抜ける | 全範囲を回して確認。形やmin/maxを調整。今回は衝突で制限しない |
| リセットすると違う位置 | 一時debug範囲内にinitialがあるか。選び直してJSON設定と比較 |

## 触感と形状保護

形は`geometry`、見た目は`material`、触感は`feel`です。形を変えずにプロフィールを切り替えられます。`?debug`の比較は一時的な調整で、JSONへ自動保存しません。決まった値だけデータへ戻してください。

上書き可能なキーと範囲は`engine/behaviors.js`の`SETTINGS`にあります。代表例は`depth`、`radius`、`pressRate`、`restoreStiffness`、`returnDamping`、`tapImpulse`、`holdDelay`、`pullStrength`、`maxPull`、`pullRadius`です。存在しないキーや範囲外の値は拒否されます。

`geometry.limits`は形の薄い部分を守る上限です。HARD/SOFT/BOUNCYやデバッグで値を上げても、この上限を超えません。細い結晶・薄い縁は上限を小さく、角のcomplianceも低めにします。特定の立体名を判定する処理は使いません。貝殻のように控えめな変形も、その立体の触り心地になります。

現在の実例：

| 立体 | 論理面 / GPU三角形 | 押し込み上限 / 引っ張り上限 |
| --- | ---: | ---: |
| POLYHEDRON | 20 / 60 | 元のv0.3基準（0.205 SOFT / 0.48） |
| STONE | 26 / 88 | 0.17 / 0.40 |
| CRYSTAL | 18 / 60 | 0.10 / 0.26 |
| SEED | 28 / 98 | 0.16 / 0.36 |
| SHELL | 33 / 118 | 0.075 / 0.20 |
| ODD | 22 / 66 | 0.15 / 0.36 |

## 必須テスト

repositoryのrootから実行します。

```sh
node --test works/sukima-3d-lab/tests/*.test.mjs
node works/sukima-3d-lab/tests/render-collection.mjs | python works/sukima-3d-lab/tests/check-gles.py /tmp/touch-collection-render
git diff --check
```

v1/v2の検査は分かれています。36作品のJSON・登録・コンパイル済みメッシュ・初期プレビューを変更前v0.5 mainと照合し、16作品の変更前v0.4コードから取得した3プロフィールのtap/hold/pull/restore/flick数値も固定して照合します。全展示物の品質テストと描画スクリプトは一覧を読み込むため、新しいJSONも検査対象になります。任意の標準形の登録テストや不正データの検査も含まれます。Pythonの描画検証は任意の実行環境としてMesa/EGLとPillowを使い、アプリには不要です。実行できない場合は未確認として記録し、可能なブラウザ描画確認で補います。検査コードを弱めて通さないでください。

Stagingでは、一覧のプレビューと実際の形が一致するか、全方向へ回して面が消えないか、短いタップ・1秒の長押し・回転・フリック・長押し後の引っ張りを確認します。STATICではくぼみ・穴・内面・表裏・パーツを回して見て、長押しでも変形しないことと初期姿勢への復帰を確認します。TOUCHでは面の端と尖った部分も触り、離した後に形が戻ること、他の立体へ切り替えて状態が残らないことを見ます。iPhone/iPadで触っていない触感は未検証として報告します。

## よくある破綻

| 症状 | 最初に確認すること |
| --- | --- |
| 面が消える・裏面しか見えない | 面の巻き順、閉じた辺、重複頂点 |
| 黒い筋、NaN、不自然な陰影 | 面積ゼロ、非平面の多角形、細すぎる辺 |
| 押すと針や縁が潰れる | 形の厚みと`limits`、角/中心のcompliance |
| 引っ張りがほとんど動かない | 安全制約が働くほど面が細くないか。形を整えてから上限を調整 |
| プレビューとTouch Viewが違う | 同じJSONか、初期姿勢・倍率・色を一致させたか。別の画像でごまかさない |
| 読み込めない・一覧の一部が準備中 | JSON構文、ID、登録パス、スキーマ、各数値と巻き順 |
| 完全に元へ戻らない | 復元の待ち時間、連続操作テスト。独自の座標補正を入れない |

形の問題を形で直し、共通処理の問題が再現したときだけエンジンを直します。物体ごとに特殊な物理処理を足すのは避けます。

## 別アプリでの使用

`engine/specimen.js`の`validateSpecimen(data)`と`createSpecimen(data)`はDOM・展示室・通信に依存しません。JSONを読む方法は利用側で選べます。`createSpecimen`は元のbase transformを適用したbind meshを返し、Motionを自動再生しません。Motion／直接操作を使うアプリは下記のsessionまたは独立したMotionPlayer／ManipulationPlayerを組み合わせます。`engine/session.js`の`SpecimenSession.select(data)`は能力に応じて新しい`RotationBody`または`TouchBody`とmeshを返します。旧名`TouchSession`も互換の別名として残っています。`engine/mesh.js`はパーツの変換とメッシュを扱い、`engine/rotation.js`は変形のない回転・慣性を扱います。`engine/behaviors.js`はTouch/Motion/Manipulationを選ぶ能力設定です。`session.assembly`は描画・Picking・snapshotを行う共有パーツ基盤、`session.manipulation`は手動値の制御です。`engine/manipulation-mapping.js`はDOMなしで画面差分を軸の差分へ変換し、PointerInputは取得済みhitと保持した対象へ渡します。`SpecimenSession.motion`はMotion作品だけの`MotionPlayer`で、`session.step(dt)`、`session.resetPose()`、`session.clear()`で描画以外の再生ライフサイクルを扱えます。`Renderer.draw(mesh,pose,camera,motion)`へ任意で渡し、`motion.drawCommands(pose)`はUIなしでパーツごとの描画行列を返します。描画・カメラ・入力は利用するアプリ側で組み合わせます。今回、他作品への組込みや共通2D Engineの変更は行っていません。

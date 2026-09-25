# Yumaniwa Pixel Standard v0.1

制定: 2026-09-25

湯間庭町の画像アセットを、生成元・端末・保存倍率に左右されず、同じ「町のピクセル密度」で扱うための基準。

この文書は WORLD OBJECT パイプラインの正本とする。

## 1. Core Rule

**1 logical asset pixel = 1 Yumaniwa world pixel.**

町での大きさを決める基準は、PNGファイルの物理ピクセル数ではなく logical canvas である。

例:

```text
Cleaner logical canvas : 32x32
Codea physical PNG     : 96x96
filePixelRatio         : 3
Town logical size      : 32x32 world px
```

96x96のファイルを96x96 world pxとして扱わない。

## 2. Terminology

### Logical Canvas

Cleaner上で編集・確定する町基準のキャンバス。

`logicalCanvasPx` がWORLD OBJECTの実寸の正本。

### Physical File

Codea等が実際に保存したPNGファイルの寸法。

Retina / device scale により logical canvas の2倍・3倍で保存されることがある。

### File Pixel Ratio

```text
filePixelRatioX = physical width  / logical width
filePixelRatioY = physical height / logical height
```

X/Yが同じ整数倍率なら device-scale file として扱える。

### Town Canonical Asset

Townが直接使用するアセット。

原則として **logical 1x PNG** を採用する。

```text
32x32 logical
96x96 physical delivery / 3x
        ↓ verified normalization
32x32 Town canonical PNG
```

## 3. Cleaner Contract

WORLD OBJECTでは以下を必須とする。

- source import は CLEAN BLOCK 1 から始め、早期に情報を潰さない
- TARGET確定後に TOWN CANVAS を構築する
- TOWN CANVASは exact final logical canvas とする
- 編集単位は1 logical px
- SAVE FINAL OBJECTでPNGとobject JSONを同時に出す
- physical PNGの実寸を保存後に検査する
- `logicalCanvasPx`
- `fileCanvasPx`
- `filePixelRatio`
- `physicalFileVerified`
- `physicalFileStatus`
- `exportContract`

をMETAに記録する。

現在の契約名:

```text
yumaniwa-logical-canvas-physical-file/0.1
```

## 4. TARGET Selection

TARGETは**元画像の縦横比・画像サイズ・見た目の形だけでは決めない**。

**町の中で、その物体が何world pxの大きさで存在すべきか**を基準に選ぶ。

立て看板では、縦長形状だけを見て PROP_T 32x56 を選ぶと町で大きすぎた。
PROP_M 32x32 に変更すると、町で自然な実寸になった。

したがって:

> TARGET = Town size class

であり、

> TARGET != source image shape class

である。

## 5. TARGET Presets

Cleaner v0.1.11時点:

| Target | Logical Canvas | 用途 |
|---|---:|---|
| CHARA | 16x24 | キャラクター候補。Character Pipeline確立までは暫定 |
| PROP_S | 24x24 | 小型小物 |
| PROP_M | 32x32 | 標準小物 |
| PROP_W | 48x40 | 横広小物 |
| PROP_T | 32x56 | 細身の縦物 |
| PROP_L | 56x56 | 大型小物 |
| FACILITY_S | 64x64 | 小型施設・情報物 |
| FACILITY_M | 96x96 | 中型施設・情報物 |
| FACILITY_L | 128x128 | 大型施設・建物 |
| SHOP_S | 96x96 | 小型店舗候補 |
| SHOP_L | 128x128 | 大型店舗候補 |

Presetは固定的な物体分類ではない。実際のTown scaleを優先する。\n\n`FACILITY_L` は駅舎の検証開始に合わせて追加した128x128の大型施設クラス。既存の `SHOP_L` と寸法は同じだが、TARGET名を物体の役割と矛盾させないため分離する。

## 6. Manual TARGET Lock

自動推薦は初期値にすぎない。

ユーザーがTARGETを手動変更した場合、その判断を現在のWORLD OBJECTについて優先する。

画像再読み込みや再解析によって自動推薦へ勝手に戻してはならない。

新しいWORLD METAを貼り付けたときのみ、TARGET LOCKをリセットしてよい。

## 7. Physical Delivery → Town Canonical Normalization

physical PNGをlogical 1xへ正規化してよい条件:

1. METAでlogical sizeとphysical sizeが明示されている
2. X/YのfilePixelRatioが同一
3. filePixelRatioが整数
4. physical PNGが各 N x N ブロックで完全同一ピクセル
5. logicalへ縮約後、nearest-neighborでN倍すると元画像とpixel-for-pixelで一致する

この条件を満たす場合のみ:

```text
LOSSLESS_INTEGER_DEVICE_SCALE_COLLAPSE
```

としてTown canonical 1xへ変換できる。

条件を満たさない場合、**推測で縮小しない**。原因を確認する。

## 8. WORLD OBJECT Identity and Placement

Asset identity と placement は分離する。

```text
WORLD OBJECT
  objectId
  category
  type
  canonical src
  finalization metadata

PLACEMENT
  id
  objectId
  x / y
  w / h
  footY
  collision
  interaction
  tap
```

`placementSnapshot` は受け渡し・監査用であり、live placementの正本ではない。

**live placementの正本は現在の `data/station-plaza.js`。**

反映前には必ずmainの最新値を取得する。

## 9. Placement Preservation Rule

アセットのlogical sizeを変更するときは、見た目だけでなく既存ゲームロジックを保つ。

原則:

- `footY` を維持
- 必要に応じてcenterを維持
- collisionの**absolute world rectangle**を維持
- interactionの**absolute world rectangle**を維持
- tapの**absolute world rectangle**を維持

relative値は新しいw/hに合わせて再計算してよい。

## 10. Validated References

2026-09-25 時点の実地検証済みReference:

| Object | Type | Target | Logical |
|---|---|---|---:|
| planter_01 | greenery / planter | PROP_M | 32x32 |
| post_box_01 | street_furniture / post_box | PROP_M | 32x32 |
| standing_sign_01 | sign / standing_sign | PROP_M | 32x32 |
| street_lamp_01 | light / street_lamp | PROP_T | 32x56 |
| bench_wood_01 | furniture / bench | PROP_L | 56x56 |
| tourist_map_01 | sign / tourist_map | FACILITY_S | 64x64 |
| notice_board_01 | sign / notice_board | FACILITY_M | 96x96 |

これは「物体タイプ→絶対サイズ」の表ではない。

**Town scaleを判断するReference集**として使う。

## 11. Station Plaza Status

駅前広場の有効PROPは13インスタンス。

WORLD OBJECT化済み: **12 / 13**

WORLD OBJECT種類: **7**

内訳:

- bench x2
- street lamp x4
- planter x2
- tourist map x1
- notice board x1
- post box x1
- standing sign x1

有効・未WORLD OBJECT化:

- `station_stationBuilding_10` — station building

無効・未対応:

- `station_direction_sign_candidate`

駅舎は小物群とは別クラスの検証対象とする。

## 12. Current Migration State

現在は旧方式と新方式が混在している。

Town canonical 1x化済み:

- notice_board_01
- post_box_01
- standing_sign_01

logical sizeは正しいが、repo内ファイルが旧3x physicalのままのもの:

- bench_wood_01
- street_lamp_01
- planter_01
- tourist_map_01

これらは表示上は成立しているため、急いで書き換えない。

移行する場合は本Standardのlossless normalization条件を満たすことを確認し、一つずつ行う。

## 13. Display Layer

`imageSmoothingEnabled = false` と pixelated表示を維持する。

Pixel Snapはカメラ/CSS/端末物理ピクセル間の揺れを減らすための表示レイヤーであり、**高解像度ソースをTown logical assetへ変換する代替ではない**。

表示スナップとアセット正規化は別問題として扱う。

## 14. Character Assets

Character Pipelineはv0.1のWORLD OBJECT検証から分離する。

現在のプレイヤー画像のように高解像度ソースを32px程度へ直接縮小すると、目や線の太さが不均一になる場合がある。

将来は:

- stand / walk
- 4 directions
- foot anchor
- frame alignment
- native logical canvas

を含むCharacter Pipelineとして別途確立する。

## 15. Acceptance Checklist

新しいWORLD OBJECTをTownへ入れる前に確認する。

- [ ] objectId / category / type がある
- [ ] sourceはBLOCK 1から開始
- [ ] TARGETはTown scaleで選んだ
- [ ] TOWN CANVASがlogical exact final
- [ ] physical file sizeを検査した
- [ ] integer uniform device scaleか確認した
- [ ] 必要ならlossless normalizationした
- [ ] Town canonical size = logical size
- [ ] 1 logical px = 1 world px
- [ ] mainの現在placementを取得した
- [ ] footYを意図なく変えていない
- [ ] collision / interaction / tapのabsolute geometryを保った
- [ ] Stagingで実寸を目視確認した
- [ ] 「大きい/小さい」をコード側のw/hだけで帳尻合わせしていない

## 16. Anti-Patterns

禁止または避ける:

- physical PNGサイズをそのままTown sizeと解釈する
- METAを無視して「たぶん3倍」と推測する
- source画像の縦横比だけでTARGETを決める
- Cleanerで選んだTARGETを自動推薦が後から上書きする
- Town側だけ縮小してlogical standardのズレを隠す
- placementSnapshotをlive placementの正本として上書きする
- 非整数・非uniformな画像を無検証で縮小する
- 問題を後段の手作業補正で隠す

## 17. Principle

このStandardの目的は、全画像を同じファイルサイズにすることではない。

**「湯間庭町では1ドットが同じ意味を持つ」状態を作ること。**

生成元や端末解像度が違っても、Townへ入った瞬間には同じpixel languageで扱えることを目標とする。

# Yumaniwa Map Factory System v0.7

Map Factory は「完成画像を生成する場所」ではない。

役割は、湯間庭町らしい素材原型を仕入れ、比較し、組み合わせ、正規ドット化の前工程まで支えること。

## Responsibility split

- AI generation: source material / 原型候補
- Map Factory: intake / split / crop / compare / compose / draft export
- Dot tool: native pixel normalization / palette cleanup / manual adjustment / final asset

AI側に厳密な最終ピクセル寸法や1px単位の完成精度を要求しない。
統一するのは「同じ町の素材に見えること」。
最終規格化は Dot tool 側で行う。

## Asset layers

1. BASE — 店の器
2. NOREN — 店の第一印象
3. SIGN — 業種のヒント
4. LANTERN — 夜の営業感
5. BOARD — 店先の生活感
6. SPECIAL — その店だけの一手

全部を使う必要はない。
余白も構成の一部として扱う。

## Import modes

### Pair Import

従来方式。

- 左右2案の画像を読み込む
- 中央で分割
- foreground bbox を検出
- preview 用に背景を簡易透過
- 同じカテゴリの A / B として棚へ登録

少数の追加補充用。

### Identity Kit Sheet Import

v0.4 の標準大量仕入れ方式。

1店舗分の素材を1枚のシートとして生成し、
その1枚から BASE / NOREN / SIGN / LANTERN / BOARD / SPECIAL をまとめて抽出する。

Current preset:
- Identity Kit Sheet v1
- expected slots: 32
  - BASE 2
  - NOREN 6
  - SIGN 6
  - LANTERN 6
  - BOARD 6
  - SPECIAL 6

## Kit detection

完全汎用画像認識にはしない。

標準シート内の各 asset の expected center を preset として保持する。

解析時:

1. 入力画像を最大 900px 程度まで縮小して detection canvas を作る
2. alpha または四隅背景色との差から foreground mask を作る
3. connected components を抽出する
4. 各 component の center を計算する
5. preset の expected slot center に最短距離で割り当てる
6. 同じ slot に入った component を union する
7. 元解像度へ bbox を戻す
8. padding を足して crop
9. preview 用に背景を簡易透過する

この soft-slot 方式により、
SPECIAL の「3本の瓶」のように複数 component で構成された1 asset も、
同じ slot にまとめられる。

preset から遠すぎる component は無視する。
タイトル、ラベル、ノイズを asset に混ぜにくくするため。

## Kit Import Preview

解析後すぐ登録しない。

カテゴリ別に:

- thumbnail
- detected / expected count
- size
- ON / OFF checkbox

を表示する。

操作:
- すべて選択
- 選択解除
- 選択した asset を一括登録

expected 数と detected 数が違う場合は warning 表示するが、
Import 自体は止めない。

## Batch cleanup

Asset Library の下部に IMPORT BATCHES を表示する。

同じ読み込み画像から作られた asset を1 batchとして扱う。

新規 import:
- Pair Import: sourceBatchId = pair_<timestamp>
- Kit Sheet: sourceBatchId = kit_<timestamp>

既存 asset:
- sourceBatchId がない場合は sourceKind + sourceFile + createdAt から batch を復元する

各 batch には:
- source file name
- KIT / PAIR
- part count
- category別 count

を表示する。

「一括削除」で、その画像から読み込んだ asset をすべて IndexedDB から削除する。

削除対象に現在選択中の BASE / NOREN / SIGN / LANTERN / BOARD / SPECIAL が含まれる場合は、その選択も解除する。

個別 asset の × 削除は従来どおり残す。

用途:
- 間違った画像を読み込んだ場合
- 不要になった Identity Kit を丸ごと整理する場合
- 個別削除と一括削除を使い分ける場合

## Asset metadata

Kit Sheet 由来 asset は追加情報を保存する。

- sourceKind: kit-sheet
- sourcePreset
- sourceFile
- sourceSlotIndex
- sourceWidth
- sourceHeight

Pair 由来は sourceKind: pair。

## Composition work slots

Composition は1件だけではなく、複数の WORK SLOT として保存する。

- 01 / 02 / 03 ... の横並びスロット
- 各スロットは自動保存
- ＋で現在の composition を複製して新しいスロットを作る
- スロットをタップすると即切り替え
- ×で不要なスロットを削除
- 最低1スロットは必ず残す

各スロットに保存するもの:
- selected BASE
- selected NOREN / SIGN / LANTERN / BOARD / SPECIAL
- part ごとの Scale / X / Y
- 現在の PART ADJUST 対象

既存 v0.5 以前の単一 composition state は、初回読み込み時に WORK SLOT 01 へ自動移行する。

Asset を個別削除または batch 一括削除した場合、
その asset を参照している全 WORK SLOT から参照を解除する。

## Direct preview selection

部品棚まで戻らず、プレビュー上の表示パーツを直接タップして編集対象にできる。

render 時に NOREN / SIGN / LANTERN / BOARD / SPECIAL の実描画矩形を hit region として記録する。

タップ時:
- canvas 座標へ変換
- 前面に描画された part から逆順に hit test
- hit した part type を PART ADJUST 対象にする

選択中 part には DOM overlay の薄い selection border を表示する。

selection border は canvas 自体には描かないため、
Draft PNG export には含まれない。

## Multi-SPECIAL placement

SPECIAL は単一選択レイヤーではなく、複数の配置インスタンスとして扱う。

通常レイヤー:
- BASE: 1
- NOREN: 1
- SIGN: 1
- LANTERN: 1
- BOARD: 1

SPECIAL:
- 0個以上
- 同じ asset を複数回配置可能
- 各配置は独立した instanceId を持つ
- 各配置ごとに Scale / X / Y を保持
- 配列順を描画順として扱う
- 先頭ほど後ろ、末尾ほど前

SPECIAL棚の asset をタップすると ON/OFF ではなく新しい instance を追加する。
同じ素材を何度でも追加できる。

配置後の操作:
- プレビュー上を直接タップして個体選択
- Scale / X / Y 個別調整
- 後ろへ
- 前へ
- 複製
- 配置削除

PLACED SPECIALS に現在の配置一覧を表示する。
一覧順が z-order を表す。

SPECIAL の X 調整範囲は通常パーツより広く取り、
店先の左側から右側まで複数小物を散らせるようにする。

棚 asset 自体の削除と配置 instance の削除は別操作:
- 棚カードの × = asset 自体を削除し、全 WORK SLOT の参照 instance も除去
- PLACED SPECIALS の 配置削除 = 選択中 instance だけ除去

既存の v0.6 以前の selected.special は初回ロード時に1つの SPECIAL instance へ自動移行する。

WORK SLOT は SPECIAL instance 配列と activeSpecialId も丸ごと保存する。

Recipe JSON v0.7:
- parts は NOREN / SIGN / LANTERN / BOARD
- specials は instance 配列
- specials の各要素に assetId / label / scale / x / y / z を保存する

## Composition

BASE を共通 preview canvas に contain する。

各パーツの仮 slot:

- NOREN: facade center / upper entrance
- SIGN: side / eave area
- LANTERN: entrance side
- BOARD: ground / entrance side
- SPECIAL: ground / opposite side

各パーツ:
- aspect ratio 維持
- nearest-neighbor preview
- Scale / X / Y を個別保存

部品棚の asset をクリックして ON / OFF。
BASE は差し替え。
他レイヤーは同じ asset を再クリックすると OFF。

Kit Import 後:
- BASE が未選択なら最初の BASE を選ぶ
- NOREN が未選択なら最初の NOREN を選ぶ
- SIGN / LANTERN / BOARD / SPECIAL は自動では載せない

最初から全部載せて情報過多にしないため。

## Quick comparison

BASE 2案 + NOREN 2案は、
B1/N1, B1/N2, B2/N1, B2/N2 の4通りを quick chips で比較する。

他パーツは棚から差し替える。

## Export

Draft PNG:
- 現在の仮 composition
- 正規ドット化前
- transparent canvas

Recipe JSON v0.7:
- selected BASE
- selected NOREN / SIGN / LANTERN / BOARD / SPECIAL
- source metadata
- part ごとの Scale / X / Y

最終成果物ではない。

## Prompt production standard

Identity Kit Sheet の生成プロンプト自体も Factory の正式規格として保持する。

構造:

- Identity Kit Sheet / Production Master v1
- Shop Identity Add-on

Master 側で固定するもの:
- 32 assets
- BASE 2 / NOREN 6 / SIGN 6 / LANTERN 6 / BOARD 6 / SPECIAL 6
- 固定レイアウト
- plain removable background
- no poster / no presentation elements
- same logical pixel density
- same outline thickness
- same rendering quality
- same scale family
- 70% shared / 30% meaningful variation
- low visual density
- Anti-Luxury rule
- reusable neutral BASE
- Map Factory automatic cutout compatibility

Identity Add-on 側で変えるもの:
- shop feel
- motifs
- accent colors
- per-layer identity clues
- six SPECIAL prop ideas
- shop-specific avoid rules

Current registered identities:
- Craft Cola
- Kissaten
- Curry Shop
- Yakitori Shop

新しい店を追加するときは 32-slot Master を書き直さない。
原則として Identity Add-on を1件追加するだけで同じ生産規格を再利用する。

Factory の SOURCE PROMPT は2モード:

### Identity Kit Sheet / 32 assets

通常の新店舗用。
Production Master v1 + selected Shop Identity Add-on を結合する。

### Focus Part / 2 variations

不足した棚だけ追加補充する。
既存の BASE / NOREN / SIGN / LANTERN / BOARD / SPECIAL Master + selected identity add-on を結合する。

BASE の Focus Part は常に neutral とする。

この分離により、
「店ごとに毎回プロンプト全体を作り直して品質がぶれる」ことを避ける。

## Source generation

通常の新店舗制作:

1. 1店舗 = 1 Identity Kit Sheet
2. 1枚の中で色・サイズ感・pixel density・detail density を揃える
3. Map Factory で一括分解
4. 棚で比較しながら compose
5. 採用候補のみ Dot tool へ渡す

不足カテゴリだけ Pair Import / Focus Sheet で追加補充する。

## Current validation target

Craft Cola Identity Kit Sheet で確認する:

- 32 expected slots の大半を自動検出できる
- 3本の瓶など複合 asset が1つにまとまる
- 6カテゴリへ正しく振り分けられる
- Import Preview で不要候補を外せる
- 一括登録後すぐ compose できる
- 従来の Pair Import も壊れていない
- 既存 v0.3 の IndexedDB assets をそのまま利用できる
- Dot tool に渡す前工程として制作が明確に速くなる

## Validation result / 2026-09-23

Craft Cola Identity Kit Sheet（1536×1024）で preset を検証。

- connected components: 34
- final expected slots: 32
- detected assets: 32 / 32
- BASE: 2 / 2
- NOREN: 6 / 6
- SIGN: 6 / 6
- LANTERN: 6 / 6
- BOARD: 6 / 6
- SPECIAL: 6 / 6
- SPECIAL の3本瓶は3 componentから1 assetへ正しく統合

現行 preset はこの実シートを基準サンプルとして扱う。

## Repository

Map Factory の変更はまず yumaniwa-town-staging で検証する。
Production への反映は明示的な確認後に行う。

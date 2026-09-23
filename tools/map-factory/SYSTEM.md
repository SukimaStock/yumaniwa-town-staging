# Yumaniwa Map Factory System v0.4

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

## Asset metadata

Kit Sheet 由来 asset は追加情報を保存する。

- sourceKind: kit-sheet
- sourcePreset
- sourceFile
- sourceSlotIndex
- sourceWidth
- sourceHeight

Pair 由来は sourceKind: pair。

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

Recipe JSON v0.4:
- selected BASE
- selected NOREN / SIGN / LANTERN / BOARD / SPECIAL
- source metadata
- part ごとの Scale / X / Y

最終成果物ではない。

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

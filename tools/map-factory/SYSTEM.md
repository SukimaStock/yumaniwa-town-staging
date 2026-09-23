# Yumaniwa Map Factory System v0.3

Map Factory は「完成画像を生成する場所」ではない。

役割は、湯間庭町らしい素材原型を仕入れ、比較し、組み合わせ、正規ドット化の前工程まで支えること。

## Responsibility split

- AI generation: source material / 原型候補
- Map Factory: intake / crop / compare / compose / draft export
- Dot tool: native pixel normalization / palette cleanup / manual adjustment / final asset

AI側に厳密な最終ピクセル寸法や1px単位の完成精度を要求しない。

統一するのは「同じ町の素材に見えること」。
最終規格化は Dot tool 側で行う。

## Asset layers

1. BASE
   - 店の器
   - 中立
   - 業種を決めすぎない

2. NOREN
   - 店の第一印象
   - 業種差を出す

3. SIGN
   - 業種のヒント
   - 小さな記号として使う

4. LANTERN
   - 夜の営業感
   - 店種説明より人の気配を担当

5. BOARD
   - 店先の生活感
   - 今日ここで商売している感じ

6. SPECIAL
   - その店だけの一手
   - 一つの強い物体だけに絞る

全部を使う必要はない。
余白も構成の一部として扱う。

## Source generation rule

- 原則 TWO VARIATIONS
- 同じ規格の中で意味のある2案を作る
- 70% shared / 30% difference を目安にする
- 完成品としての美しさより、比較しやすい原型を優先する
- 背景は透明または除去しやすい単色
- 余白を十分に取る
- 2案を左右に配置する

## Intake flow

1. Asset type を選択
2. 左右2案の生成画像を読み込む
3. Factory が中央で左右に分割
4. 各半分について背景色 / alpha を判定
5. foreground bounding box を検出
6. 余白を少量残して自動 crop
7. plain background は preview 用に簡易透過
8. A / B を IndexedDB の部品棚へ登録

これは最終背景除去ではない。
Dot tool へ渡す前の比較用処理。

## Composition

BASE を共通 preview canvas に contain する。

各パーツには役割別の仮 slot がある:
- NOREN: facade center / upper entrance
- SIGN: side / eave area
- LANTERN: entrance side
- BOARD: ground / entrance side
- SPECIAL: ground / opposite side

各パーツは:
- aspect ratio 維持
- nearest-neighbor preview
- Scale / X / Y を個別保存

PART ADJUST で触っているレイヤーだけを調整する。
他レイヤーの位置は壊さない。

## Layer behavior

部品棚のパーツを選ぶと composition に追加する。

BASE 以外は、選択中の同じパーツをもう一度押すと OFF にできる。

初期スロットは完成座標ではない。
比較を始めやすくするための仮配置。

## Quick comparison

BASE 2案 + NOREN 2案については、
B1/N1, B1/N2, B2/N1, B2/N2 の4通りを quick chips で比較する。

他パーツは部品棚で差し替えながら比較する。

## Export

Draft PNG:
- 現在の仮 composition
- 正規ドット化前
- transparent canvas

Recipe JSON:
- selected BASE
- selected NOREN / SIGN / LANTERN / BOARD / SPECIAL
- source file references
- partごとの Scale / X / Y
- system version

最終成果物ではない。

## Prompt system

Master prompt は「完成店」ではなく「部品原型」を生成するために使う。

Current Masters:
- BASE / Source Asset Master v1
- NOREN / Source Asset Master v1
- SIGN / Source Asset Master v1
- LANTERN / Source Asset Master v1
- BOARD / Source Asset Master v1
- SPECIAL / Source Asset Master v1

Identity Add-on:
- Neutral
- Craft Cola

BASE は常に neutral。
Identity Add-on は shop identity layer に適用する。

構造:
MASTER + IDENTITY ADD-ON

## Validation

まず Craft Cola 1店舗で以下を確認する。

- BASE + NOREN が自然に成立
- SIGN を追加しても情報過多にならない
- LANTERN が業種説明ではなく夜感として機能
- BOARD が生活感を足す
- SPECIAL が店の記憶点になる
- 6レイヤー全部を使わなくても成立する
- source asset の寸法差が composition 時に問題にならない
- Draft PNG と Recipe JSON を出せる
- Dot tool に渡す前工程として制作が楽になったと感じる

## Repository

Map Factory の変更はまず yumaniwa-town-staging で検証する。
Production への反映は明示的な確認後に行う。

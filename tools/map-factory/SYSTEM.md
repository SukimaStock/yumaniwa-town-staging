# Yumaniwa Map Factory System v0.2

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
   - 生成頻度は低い

2. NOREN
   - 店の第一印象
   - 業種差を出す
   - 生成頻度は高い

Future:
3. SIGN
4. LANTERN
5. BOARD
6. SPECIAL

v0.2 では BASE + NOREN だけを実装する。

## Source generation rule

- 原則 TWO VARIATIONS
- 同じ規格の中で意味のある2案を作る
- 70% shared / 30% difference を目安にする
- 完成品としての美しさより、比較しやすい原型を優先する
- 背景は透明または除去しやすい単色
- 余白を十分に取る
- 2案を左右に配置する

## v0.2 intake flow

1. Asset type を BASE または NOREN から選択
2. 左右2案の生成画像を読み込む
3. Factory が中央で左右に分割
4. 各半分について背景色 / alpha を判定
5. foreground bounding box を検出
6. 余白を少量残して自動 crop
7. plain background は preview 用に簡易透過
8. A / B を IndexedDB の部品棚へ登録

これは最終背景除去ではない。
Dot tool へ渡す前の比較用処理。

## v0.2 composition

BASE と NOREN をそれぞれ棚から選択する。

Factory は:
- BASE を共通 preview canvas に contain
- NOREN を BASE の仮 slot に配置
- aspect ratio を維持
- nearest-neighbor preview
- NOREN の Scale / X / Y だけ軽く補正可能

調整範囲は「完成処理」ではなく比較用。

BASE 2案 + NOREN 2案が登録されている場合、
B1/N1, B1/N2, B2/N1, B2/N2 の4通りを即座に比較できることを最初の成功条件とする。

## Export

Draft PNG:
- 現在の仮 composition
- 正規ドット化前
- transparent canvas

Recipe JSON:
- selected BASE
- selected NOREN
- source file references
- NOREN Scale / X / Y
- system version

最終成果物ではない。

## Prompt system

Master prompt は「完成店」ではなく「部品原型」を生成するために使う。

Current Masters:
- BASE / Source Asset Master v1
- NOREN / Source Asset Master v1

Identity Add-on:
- Neutral
- Craft Cola

BASE は常に neutral。
Identity Add-on は NOREN など shop identity layer に適用する。

今後:
MASTER + IDENTITY ADD-ON
の構造で SIGN / LANTERN / BOARD / SPECIAL に拡張する。

## Validation target

最初の実地テストは以下だけでよい。

- adopted BASE pair を登録できる
- adopted NOREN pair を登録できる
- 4 combination をワンタップで比較できる
- source asset の寸法差が composition 時に問題にならない
- Draft PNG と Recipe JSON を出せる
- 「生成画像を完成させる」より制作が楽になったと感じる

この検証を通るまでは機能を増やさない。

## Repository

Map Factory の変更はまず yumaniwa-town-staging で検証する。
Production への反映は明示的な確認後に行う。

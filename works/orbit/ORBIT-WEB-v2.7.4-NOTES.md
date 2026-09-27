# ORBIT Web v2.7.4 — RESOURCE VISUAL LANGUAGE

資源の「色・形」を HUD / world / pickup で統一。

## ORE / VOX
- red-orange
- mineral cluster icon

## DATA / SERA
- yellow
- diamond signal icon

同じアイコンを
- 右上 HUD
- VOX / SERA 本体
- resource pickup (`+3` etc.)
に使用。

文字を読まずに「欲しい資源 → 行く星」を結びつける。

## Mining sparks
v2.7.3 の火花はShip中心から発生して本体に隠れていた。

v2.7.4:
- planet -> ship の外向き方向を計算
- Ship外周から13 units外側を発生点にする
- 外向き＋左右へ扇状に拡散
- 9〜13 sparks
- life 0.32〜0.56 sec
- lineを長くし、小さな発光点も追加

採掘tick時だけ出る静かなFXという方針は維持。

## Unchanged
- resource amounts / economy
- planet colors
- HOME Terminal / Ritual
- flight / RESTORE / story

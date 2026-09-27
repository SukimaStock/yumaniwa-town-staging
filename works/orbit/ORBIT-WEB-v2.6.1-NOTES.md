# ORBIT Web v2.6.1 — VISUAL SCALE / THIN INSTRUMENTS

v2.6 の四隅構造を維持し、原作スクリーンショットとの見え方の差を縮める visual-only pass。

## 狙い
レトロ風装飾を足さない。
小さい機体、細線、直角、小さい文字、低コントラスト、広い空白によって、
自然に古い宇宙船の計器らしく見せる。

## Ship
- 0.20 → 0.16（約20%縮小）
- trail / plume / halo も同率で縮小
- strokeも縮尺に合わせて細く
- physics / collision / landing は変更なし

## HUD
- FUEL: 角丸撤去、11px高、0.8px枠、文字を一段小さく
- ORE / DATA: 文字のみ、小さく・薄く
- SYSTEM / E.V.E.: 角丸撤去、薄い背景、0.8px枠、7.6px文字
- MiniMap: 角丸撤去、1px前後の細い枠、薄い十字線
- BASE contextual textも少し弱く

## 変更なし
- planet / BASE / Station size
- gameplay / progression / resources
- fuel balance
- MiniMap content / range
- RESTORE Rituals
- story / Echo / finale

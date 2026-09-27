# ORBIT Web v2.7.3.1 — HUD ICON HOTFIX

v2.7.3 で追加した `drawCargoIcon()` に、
Codea本体にはあるが Web runtime には存在しない
`pushStyle()` / `popStyle()` を使用していたため、
右上の ORE / DATA アイコン描画時に draw error が発生していた。

## Fix
- `pushStyle()` / `popStyle()` を撤去
- icon drawing contents are unchanged
- caller側が直後に fill / font / textAlign 等を設定するため
  state contaminationは起きない構造

## v2.7.3から維持
- UI文字拡大
- オレンジのship plume撤去
- ORE / DATA icon HUD
- mining sparks
- integer acquisition feedback

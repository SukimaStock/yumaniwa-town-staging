# 器と食卓の素材

形・配置・配色はすべて本作のJavaScriptから生成する。原画には画像素材を使わない。

印刷風・水彩画風はPostcard Generatorで2026-10-30に採用されたCC0素材の派生PNGとdata URIモジュールを本作へ独立複製した。既存作品への実行時依存はない。

- 実紙：UrsaFrank「A4 Paper Scans」Cold Pressed 1。紙地・白いインク欠けの加工、URL、ハッシュは `assets/materials/SOURCES.md`。加工スクリプトも同梱。
- 手描き濃淡：Jonas Voland / Voxel Core Lab「Water_02.png」。輝度だけを使用する白いアルファマップ。URL・ライセンス・加工・ハッシュは `assets/watercolor/SOURCES.md` と `LICENSE.txt`。物理顔料のスキャンと確認された素材ではない。

本作では色面ごとに元の形でクリップした弱い白抜きと、低濃度の紙地を合成する。全面ノイズだけで形を表現しない。汚れに見える黒い高濃度の斑点を加えず、輪郭と幾何は原画から変えない。素材はSVG内のPNG data URIに内包され、外部通信せず表示できる。

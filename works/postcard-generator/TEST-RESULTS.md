# Postcard Generator Lab 0.1 — 検証記録

2026-10-29。対象コードのハッシュと計測は `review/performance.json`、36枚の構造検査は `review/metrics.json` を参照。

## 自動検査

- `node --test works/postcard-generator/engine.test.mjs`：7件成功。300seed × 4輪郭 × 3密度 = 3,600条件。
- 同seed・設定からsceneとSVGが一致。パレットを変えても配置・寸法・窓・船の構造が一致。異seedでは構造が変化。
- 不正数値、負の寸法、建物の足元・隙間・境界、塔の可視性、帆を含む船の境界、SVG内seedのエスケープを検査。
- 最終36枚のSVGはエンジン出力とバイト一致。全件をsharpでPNGへ変換できた。XMLとしてもパース可能。
- `node tools/work-lifecycle.cjs --write-lab` → `--check`：成功。制作機材室に一件だけ配置。
- `node --test tests/test-work-lifecycle.cjs`：24件成功。
- 既存作品・保存形式・共通runtime・Productionの差分なし。LAB生成物・台帳の差分は新作追加のみ。

## ブラウザーで観測した結果

Chromeのプレビューで確認。実機Safariとは区別する。

- 初期表示、生成ボタンによる新seed、seed入力と再表示、36枚生成、一覧選択→大きい表示・URLのseed更新を確認。
- 同seed再表示前後のSVG DOM文字列が完全一致。
- PNG保存ボタンから実際のファイルを受信。Pillowで1600×2000 RGBA PNGとして全画素を読み込み成功。
- SVG保存ボタン後の書き出し通知は確認。ブラウザー自動操作のdownloadイベントがタイムアウトしたため、SVGの端末への受信は未確認。SVG自体の生成・XMLパース・別レンダラーでの描画は確認済み。
- 360・375・390pxのiframe閲覧領域で表示を目視確認。各領域のscrollWidthがclientWidthと一致（横はみ出しなし）、SVG表示あり。360pxの主ボタン高46px、その他の操作ボタン高44px。
- PNG作成中に別の街を表示した場合の保存名競合は、書き出し開始時にSVG・ファイル名を固定して修正。独立レビューで確認。
- 比較一覧は36枚、SVGはimgで表示。Object URLを再生成・離脱時に解放。PNG用canvasは書き出し時だけ作成。生成時以外の連続描画なし。

## 表現監査

タイトル、操作ボタン、入力ラベル、書き出し状態、任意の生成記録だけを表示。詩的コピー、副題、説明カード、架空の感情・結論は追加していない。色名は実際のパレットに対応。検査は美的な点数を付けない。

## 未確認

iPhone Safari実機のタップ感・SVG/PNG受信・発熱、クリップボードの実端末動作、作者による配色・構図の採否。PNGダウンロードの一件確認を全ブラウザーの保証とはしない。Staging配信・CIの結果はPRに記録する。

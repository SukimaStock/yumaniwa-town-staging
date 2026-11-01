# カットUI本編接続 第1段階

基準 main: c927acf16128e0bd4b8096596221c70f9ed69355。Plan Lock: `.change-plans/ambertime-cut-main/r0.lock.json`。

## 接続

Lab #741と完全一致する瞬間成分・混色を読み取り専用の本編モジュールへ写し、既存バー領域にC案を描画。3pxの現在位置・開始/終了印・下線で色以外でも区間を示す。48点平均、最小12step、正式収量には接続しない。

グラスは採取開始0から8stepで一定高さ0.7へ達する象徴演出。確定時も跳ねず保持する。採取中の量予測パネルを非表示にし、正式Lは従来の結果表示に残す。液面は正式保存へ入れない。

正式fillingでレバーを120msの3姿勢で復帰（reduced-motionは即時）。レバー矢印は初回9px/1500ms、2〜3回目6px/2400ms、4回目以降非表示。触れると停止し、無効時は動かない。

独立したUI設定に、正式保存成功後の手動開始と同じ仕込みの正式終了だけを記録。重複、失敗保存、preview、自動開始は計数しない。世代交代で初期化せず、再読込のpendingを識別する。ストレージ失敗はゲームを妨げない。操作数・3秒カウントダウンは従来どおり。

## 検証

- 変更前に採取4条件×5段階の20正式保存を固定。変更後と完全一致。正式モデル146ファイルのhashも基準mainと一致。味・量・費用・熟成・販売・保存を変更していない。
- focused40、関連モデル・市場・地図Node72、販売室browser2成功。
- Chromium89観測／Linux WebKit86観測成功。360×568、375×620、390×680。実pointer/tap/左右slide、cancel、多重入力、実カウントダウン、再読込、preview、設定保存拒否、reduced-motion、実画素、位置・overflow確認。詳細は `browser-output/BROWSER.md` と各 `results.json`。
- 手動の本当の完了1回で習熟保存を確認。2〜3回目・卒業後の画像は表示fixture、計数ロジックは独立テストで確認している。
- 追加の既存map-initial-display-browserは360px安全領域stressでラベル境界assertに停止。基準mainの別worktreeでも同じ19観測JSONが完全一致し、同じ位置で停止（184px mapに一部labelがはみ出す既存事象）。通常の初回表示・開閉・店舗選択・縮尺操作はその前に成功。今回地図/CSSを変更せず、この既存問題を成功とは報告しない。

## 比較画像

`browser-output/chromium/390-ready.png`、`390-middle.png`、`390-countdown-3.png`、`390-collection-start.png`、`390-collecting.png`、`390-return-middle.png`、`390-finished.png`、`390-learned-no-arrow.png`。各幅・両engine版も同ディレクトリ内。

iPhone Safari実機は未確認。既存の細いバーにおける色差と3px印の可読性、実機指追従、ブラウザーバー/安全領域を追加確認する。

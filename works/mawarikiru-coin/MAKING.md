# まわりきる硬貨 — 2026-10-15

- 狙い：止まりそうでまだ回る、終わり際の小刻みな首振りを手元で眺める。
- できたこと：硬貨の縁（面も広めに受け付ける）を短く払うと回転。弱い払いは短く、速い払いは長く回る。傾きが小さくなり、終端に首振りが細かくなって接地。平らな硬貨も同じ操作で再開できる。Enter/Spaceも対応。
- 想定差：剛体物理ではない。時間正規化した減衰曲線と歳差・傾きの振動をCanvasへ投影する近似。硬貨はその場に留まる。非表示中は停止、復帰後続行。音、保存、得点なし。
- 面白い部分：倒れかけから急に細かくなる最後の首振り。静止時の面と縁、薄い接地影。
- 次の可能性：実指の感想に応じて終端区間の長さと払う速度の対応だけを調整する。

## 検証

作品内 `node --test works/mawarikiru-coin/test-model.mjs`：速度差、傾き、終端振動/静止、1000回再試行、30/60/120Hz、長時間、停止時の連続性。
`test-browser.cjs`：repo rootをHTTP配信して実行。Chromium 390×844 / 820×1180 / 844×390 / 1280×900でmouseとCDP touchフリック、静止後再開、touchCancel、resize中断、keyboard、60秒経過、LAB往復、横溢れ/JS例外なし。回転中・終端・静止のスクリーンショット目視。
既存Lifecycle 24件とgenerator --write-lab → --check成功。
既存LABブラウザテストは変更前baseと変更後とも33行の非表示Archive見出しassertで失敗（前作PR380と同じ）。検査を変更せず、本作のLAB往復を別途確認する。

自己レビューで終端の刻印角度が初期値へ戻る不連続を発見、最終角度の保持へ修正1回、連続性回帰を追加。独立レビューなし。新規workと台帳一項目・既存generatorのLAB一項目だけ。Scope/Risk/Impactとexact SHA、CI/Pagesの結果はPRへ記録。

実機iPhone/iPad Safariと作者の触感はUNVERIFIED。正式verificationStateは現行契約どおりUNVERIFIED。Production公開・作者の採用を意味しない。接続先はLAB / Prototype Bench。

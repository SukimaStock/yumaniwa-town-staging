# 傾けて止める — 2026-10-17 / B

狙い：落ちる輪を、つまみのほんの少しの傾きで止める。
実現：一本の棒と輪。上下になぞると角度だけ変わり、7度で停止、4度以内で滑走再開。離しても角度を保持。初期は停止、下端では「上から、もう一度」で小さく再試行。64 CSS pxの操作領域。キーボードは上下で1度ずつ、左右で水平、Homeで再試行。
近似・違い：静止摩擦を二つの角度閾値で近似し、停止時の速度をゼロにする。重さ・接触点の物理計算はなく、滑走速度は70 SVG単位/秒まで。再つかみは角度を変えず、cancel/blur/resize/非表示では安全に停止。ばね復元・反発・得点・音・保存・外部通信はない。
未確認：実機iPhone/iPad Safariの触感、作者の採否。自動検証を実機確認とは扱わない。

## 制作と検証

base f31baa73693be830d4a27e5e6418477653fdf510。実装前Lock commit 709078df0f9de56250c25ce29814d2c45388a153。Lifecycle JSONと生成LABのunknown-code floorに従いSYSTEM/WORK・Full、既存schema/generator内で設計照合。軽量ルート不使用。町、共通Engine、既存作品、Productionは変更なし。

- Scope → Risk → Impact PASS。node syntax PASS。
- Lifecycle --check PASS、既存Lifecycle回帰24件PASS。
- Chromium/Playwright: マウスとCDPタッチ入力、滑走・停止・離した後の保持・再つかみ・反復・角度両端・下端・reset・cancel・resize・LAB往復をtest-browser.cjsで確認。
- 独立レビュー（別agent、読取専用）：重大欠陥なし。模擬DOMで20回反復と入力境界PASS。レビュー対象app.js SHA256 ff12d140ad1a724872da96430d3ec65e1a4901178ca6035faaa63b844f49b6fc。実機は未確認。
- ブラウザテスト初回はLABの部屋を開かずリンク可視待ちになった。原因はテスト導線。既存Prototype Benchを開いてから入る手順へ修正（1回）。作品の変更なし。

LAB接続先：Prototype Bench（試作作業台）、既存generatorの通常一覧。
正式verificationStateはUNVERIFIED。CI/Pages・公開URLはPRのexact SHA記録を参照し、未配信を公開済みと扱わない。

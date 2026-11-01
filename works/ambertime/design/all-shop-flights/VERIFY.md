# 全店舗の販売時瓶移動

`tests/all-shop-flights-browser.mjs` は、自家販売・町の酒店・スーパーの正式な月次販売を使って確認する。既存セーブと公開APIだけで状態を生成し、架空の販売を正式データへ加えない。

- 自家販売2発売回が各1本、酒店が1本を同じ月に販売。同じ商品5が別の店で売れる場合も、店舗＋商品IDごとに自身の瓶をコピーし、自身の店舗アイコンへ移動する。
- スーパーは既存テストと同じ公開操作で解放し、ルール採用後の正式な2本販売を再現。スーパーの瓶2本と`−2`を確認する。
- 店舗ごとの到着X・Y座標と瓶画像の一致、全店合計600ms以内、実残数と減少表示の分離、複数時点の文字・瓶・飛行との重なりを確認する。
- reduced-motionでは全店の減少数を残し、瓶を飛ばさない。通常再描画・同じ通知・再読込・取消で重複／残留演出なし。配置時の`＋n／−n`は販売演出と混同しない。
- 360・375・390pxで既存の3店舗×2商品共通配置を維持し、通常表示の内部スクロールなし。100本残の表示専用例も維持する。

`375-retail-town-delta-flight.png`と`375-native-supermarket-delta-flight.png`は正式な販売結果。`360-display-only-all-three-sale.png`は3店同時の見た目を比較する既存表示専用fixtureであり、正式な進行データではない。前版はPR #748を保持する`market-common-feedback`。

実機iPhone Safariは未確認。再現：`AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/all-shop-flights-browser.mjs`（`webkit`へ変更可能）。前版ルートは`AMBER_ALL_SHOP_BEFORE_ROOT`で指定可能。

最終表示専用ケースでは各3店がそれぞれ2本売れ、各店2本ずつ合計6本の移動を保つことと、全店合計600ms以内を確認する。合計本数を一律4本へ削っていない。

実行結果：Chromium／Linux WebKitとも10チェック、エラー0。375pxの共通配置は前版とページ寸法・board寸法・各店の矩形が完全一致。3幅すべて通常の3店舗×2商品で内部縦スクロールなし。実売時の保存・モデル状態は元の正式月次結果と一致し、描画による変更なし。

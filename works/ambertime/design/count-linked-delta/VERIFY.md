# 数量に結び付く販売減少表示

`tests/count-linked-delta-browser.mjs` をLinux Chromium（公式headless bundle1194）／WebKit2336で実行し、各13チェック、エラー0。実機iPhone Safariは未確認。

- `−n`は各商品の上段の専用slotに入り、実際の本数と同じbaseline、その右側に収まる。年月は下段に独立する。3幅で全3店×2商品を確認した。
- 正式な既存APIで生成する自家販売2発売回＋酒店の同時実売、別の正式スーパー実売を引き継ぐ。実残数・売上・保存状態は元の正式月次結果と一致する。表示・再通知・再読込・取消では重複／保存変更なし。配置時の`＋n／−n`は維持。
- 移動元の瓶画像と店舗／商品IDを対応させ、全離散キーフレームの飛行矩形が本数・年月・減少数を横切らないことを確認。通常再生中の4時点でも文字・瓶・飛行との衝突0。全店舗の共通上段経路と600ms以内を維持する。
- reduced-motionでは瓶移動を省略し、数量横の減少数を残す。
- 作者画像を参考にした「32本／3本」「33本−5」、100本残・世紀違いの同月でフル年月が必要な例は、明示した表示専用fixture。架空の本数や売上を正式保存には使わない。slot・本数・年月・隣の商品に重なり／切れなし。

通常の3店×2商品のboard client/scrollは次のとおりで、内部縦スクロールなし。

| 幅×高さ | Chromium | WebKit |
| --- | --- | --- |
| 360×568 | 278/278 | 282/282 |
| 375×620 | 288/288 | 292/292 |
| 390×680 | 329/329 | 329/329 |

各engineの`375-display-32.png`・`375-display-33-minus-5.png`が数量と年月の関係を示す。`375-display-100-full-date-minus-1.png`は高密度・フル年月の表示専用例。正式結果は`375-retail-town-delta-flight.png`・`375-native-supermarket-delta-flight.png`。`375-layout-before.png`はc240a9e3（PR #749）の旧表示。

再現：前版c240a9e3を別worktreeへ用意し、`AMBER_COUNT_BEFORE_ROOT=/absolute/baseline AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell AMBER_TOOL_ENGINE=chromium node works/ambertime/tests/count-linked-delta-browser.mjs`。WebKitでは`AMBER_TOOL_ENGINE=webkit AMBER_WEBKIT_EXECUTABLE=/absolute/pw_run.sh`を指定する。今回のruntimeはscratch内に復旧し、製品依存・OSパッケージは追加していない。

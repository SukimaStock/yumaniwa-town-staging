# 観光協会のPlausible接続

既存town-analytics.jsと同じsite trackerを使う。Productionの正確なhost/pathだけでSDKを読み込み、Staging・localhost・他ページでは読み込まず送信しない。SDKの自動pageviewを使い、独自pageviewやhash切替の送信を重ねない。

| 計測 | 意味 |
| --- | --- |
| pageview | 観光協会への訪問。SDK標準計測 |
| Tourist Desk Touch | そのページで最初に模型へ触れた時。操作完了ではなく、有効なhitの操作開始。1ページにつき1回 |
| Tourist Desk to Town | 町トップ、3エリア、通知の2作品への通常リンククリック。町への到着・作品ロード完了とは別 |

マウス/タッチ/キーボードの既存入力を妨げない。touchmove、ピンチ、animation frame、カメラ更新ごとにイベントを増やさない。リンク遷移をpreventDefaultや待機で止めない。trackerの読み込みや送信が失敗しても作品は動く。カスタムプロパティ・新しいsession ID・保存・町runtimeのラップを追加しない。

Plausibleの管理画面に次のCustom event Goalが未登録なら、登録後に件数が表示される。管理画面の認証済み操作はこの環境では実行しておらず、Goal登録・実ブラウザでの送信・dashboard受信は未確認。ページ閲覧は通常のTop Pages対象。

- Tourist Desk Touch
- Tourist Desk to Town

公式：https://plausible.io/docs/custom-event-goals / https://plausible.io/docs/script-extensions

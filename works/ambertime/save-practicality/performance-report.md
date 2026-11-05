# H1-A5 プレイ処理と復元

`performance-results.json`は12入力をH1-A1結果の入力SHAと照合した。H1-A1の計測コード3ファイル連結fingerprintが一致し、model/ledgerの43個の静的推移依存の現行内容とH1-A1基準Git blobのSHA-256がすべて一致した。この範囲の完了済み正式restore/serialize・帳面データ生成の結果を、元資料SHA付きで再利用する。旧計測を新測定へ改名しない。元結果の最初のcold runはpriming扱いであり、比較には2・3回目を使う。

新規計測では、hash一致のparsed stateに正式`tickDistillery`を1回適用し、全12条件でmonthが1増えた。入力のJSONが不変であることも確認した。正式readerを省略した新形式や保存先への接続を作ったものではない。各状態の操作前提を満たす月次APIと、地図の`mapProgress`だけを測り、描画は含めない。計測process内で複数条件が続くため、各条件の完全cold process比較ではない。

|方針|30年月次|60年月次|90年月次|100年月次|
|---|---:|---:|---:|---:|
|地元|43.6ms|42.9ms|50.8ms|61.8ms|
|広域|26.4ms|53.0ms|51.4ms|54.4ms|
|混合|38.4ms|35.0ms|46.0ms|62.6ms|

時間はhost負荷・cacheに依存する単発値。mapProgressは約1ms前後のデータ走査であり、Canvas paint、DOM帳面表示、worker起動・転送、iPhone実機の表示時間は含まない。再利用した帳面workerデータ生成には長いcold replayが含まれ、UIの操作感を直接保証しない。

広域100年については現行正式readerを新しいNode processで再検証した（`performance-formal.json`）。復元92.38秒で再保存が元JSONと完全一致した。同じ状態のwarm serializerは184.7ms、1か月tickは139.1msで1200→1201月に進み、その後の正式serializeは234.4ms、再serializeは214.4msだった。最大RSSはrestore終了まで471.4MiB、その後の一連の保持で506.3MiB、restore後heapUsed観測値128.5MiB。このheapUsedは同期処理中peakではない。正式validationのcache条件を保持した値であり、毎回cold全再生する値ではない。

2倍速3秒に対して月次と保存の計算負荷は無視できず、同期main threadで同等に走れば操作停止を生じ得る。しかしこのNode値からゲーム時計の遅延やSafari frame timeを算出しない。100年時点の月次計算後に正式再保存できたことと、ブラウザquotaに入ることは別である。

蒸留開始・進行・終了、瓶詰め、納品、世代交代の30/60/90/100年個別操作比較、DOM/Canvas paint、実1〜2時間の連続プレイは今回未計測として残す。重大な容量問題が確認された場合は、保存容量と失敗後の安全性を先に改善し、次段階でこの実機性能matrixを完成する。

再実行：`node --expose-gc works/ambertime/save-practicality/performance-run.mjs run /tmp/amber-h1-a1/saves /tmp/h1-a5-performance.json`。広域正式測定：`node --expose-gc works/ambertime/save-practicality/performance-run.mjs formal /tmp/amber-h1-a1/saves/wide-1200.json`。

# H1-C1 起動時間監査（作業中）

基準main: `74924b2729565531dcc3a499dcb7e24bcc0dced8`。
Plan: `.change-plans/ambertime-h1-c1/r0.lock.json`。
Production変更なし。完了条件を満たすまでマージしない。

## 確認済みの依存関係

| 起動経路 | 処理 | cache |
| --- | --- | --- |
| boot → readSession → restoreDistillery | v3展開、正式全検証 | partner-ordersのmodule-local checkpoint |
| boot → enableStage4/enableStoreMarket | 状態確認、必要時の移行 | 同じ正式checkpoint |
| render → caskName → createCaskSerials | 検証、樽作成順のprojection | 別URLのcheckpoint、resolver token |
| boot完了後double-rAF | Workerモジュール生成 | snapshot送信なし |
| 帳面・歩みを開く | Worker内検証・projection | Worker固有realm |

変更前のappだけが`partner-orders.mjs?v=market-rules-r1&touch=1`、樽番号と比較表示は`?v=market-rules-r1`を使う。モジュールのbyteが同じでもURLが異なるためcheckpointを共有できず、樽番号初回検証がcoldになる。

候補はappのimport URLを既存表示側と一致させる1行。validateDistillery、正式reader、codec、projection APIは不変。全JSON照合とseed・origin・operation prefixによるcache判定を維持する。配信URLにstartup識別子を追加する。

樽番号の全projectionは別に残る。正式readerのcheckpointにはobserverの樽作成順がなく、この監査でreaderを拡張しない。未表示帳面は既にdemand-drivenなので、起動時全帳面生成の削除は行わない。

## 計測方法と限界

`browser-timing.mjs`は隔離HTTP originの実index.html、native localStorageの正式key、Chromiumを使用。配信コピーだけに観測wrapperを加え、before/sharedのimport URLを切り替える。モデル動作や正式検証は変更しない。入力SHAは既存H1-B1容量記録の12条件へ照合する。

- readSession / restoreDistillery / validateDistilleryは包含区間。加算しない。
- validate呼出回数は全再生回数ではない。warm prefix検証も含む。
- boot-completeは同期boot経路完了。
- paint-opportunityはdouble-rAFの描画機会。実画素の描画完了とは断定しない。
- inputResponseMsは起動後の実メニューボタン応答。
- observationCompleteMsはsnapshot複製・JSON化も含む観測完了時間。起動時間とは区別。
- before/sharedは同一disk fingerprintでも配信appが異なる。modeとservedAppSha256で識別。
- Worker生成完了・帳面初回・月次・保存・再読込は別検証が必要。

予備の地元30年: Chromium観測完了33.24秒→22.61秒。正式reader約8.54秒→8.20秒、樽番号projection約14.06秒→13.47秒。変更前は別moduleのcold検証が約9.68秒追加。起動後JSONのハッシュ一致。予備値は最終比較に混ぜず、100年の結論へ外挿しない。

100年の最初の試行は関連テストと同時実行されたため中断し、統制比較には採用しない。入力やユーザー保存は変更していない。

## 未完了

100年詳細比較、12条件の起動比較、全再生回数の直接計数、Worker/帳面/歩み初回、月次・保存・再読込、9世代境界の依存fingerprint照合、復旧browser回帰、全必須CI、Staging公開確認。分類A/B/Cの最終判断は保留。

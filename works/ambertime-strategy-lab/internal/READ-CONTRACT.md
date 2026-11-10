# 第2段階・最小読取契約 v0.1

基準 main `f7e69701c507429e4fd4e28d746031fcb9c237a8`。本編への接続・正式v8変更は行わない。作業Aを先に確定した境界。これは完全な旧保存復元契約ではない。

| 読取機能／現正本 | 必要な情報 | 保持期間・集計 | 失うと消える体験 |
|---|---|---|---|
| `shop-remarks.mjs:shopRemarkFacts/classifyShopRemark` | 店×ブランド、契約開始、正の納品累計、異なる納品月数、最終月、今の申し出、デパート5本の受渡状態 | 契約と成果は継承。過去月配列は月数と最終月へ。現在月を含む | 初回・反復・6か月休止、デパート未受渡と受渡済みの区別 |
| `shop-dialogue.mjs:dialogueCandidates` | 店×旧発売ID×商品ID×ブランドIDの初納品・直近2つの異なる納品月、発売月、packageFamily、契約開始、方式境界 | 月初の閉じたスナップショット。現在月を含めない。過去に扱った酒の対応は長期保持 | 24か月前の酒、12か月空いて3か月以内に再納品された酒。酒特性IDで発売を混同してはならない |
| 同 `additionalShopCandidates` | スーパーはstoreMarket開始月より後の納品。デパートは5本adoptionとdeliveryId、selectionId/projectId/brandId/releaseId/sourceReleaseId/month/countの一致 | 適格性を確認した境界で根拠を付ける。未確認を推測しない | 契約だけで受取済みと話す誤り、別企画の酒への取り違え |
| 同 `shopDialogueHistory` | seed、方針境界、過去の各月の候補集合、発話間隔・文別cooldown | 既存の確定した選出台詞を境界で保持。未来は月ごと確定し直近発話と文別最終月を持つ | 現在集計だけでは過去の実際の選出台詞は再現不能。過去を再選出しない。選出台詞と本人が読んだことは別 |
| `release-package.mjs:packageArt/releasePackageArt` | 瓶詰め時profile、ブランド瓶型・label、priceTier。旧productId→releaseId→特性ID | 現役は正確に保持。完売後は最小外観＋識別、重要酒は風味・製法詳細。外観方式versionも必要 | 昔の瓶・箱を同じ見た目で再表示できない。現役樽から再計算しない |
| 帳面／B案 `memory.mjs:currentView` | 発売日・旧ID・本数・名前・出自、直近操作、節目、世代、酒の詳細 | 現役は全状態。通常完了は集計、直近は固定件数、節目と確定回想は保持 | 選外の全明細は消える。省略と欠落を明示する。B案の代表1酒だけでは全酒の再登場は不足 |
| `world-map-view.mjs:mapProgress` | 初瓶詰め・初売上・実契約、地域別non-direct到達、問い合わせ/訪問/取扱状態 | 地域×事実種別の初回・最終＋進行中状態 | 到達だけを問い合わせ／契約と誤認。history-recordのdirectを含む到達と同一視しない |
| `history-record.mjs:advanceHistoryRecord` | 世代集計、選ばれた節目、店関係のfirst/last、12か月超の休止でresetする周年起点、選択した因果鎖 | 通常操作を集計できるが、現行assertは全releaseのbottlingと原本を要求する | 旧検証をそのまま通す最小モデルではない。周年継続と毎月連続を区別 |
| `recall/collector.mjs:readCompletedRecalls` | 確定場面・文章・scene・links・出自・世代境界と参照旧ID | 確定版をそのまま継承。参照される酒を保護 | 後年の再選出で先代の回想が変わる |
| `recall/selection.mjs:selectC` | 現世代の候補事実、前代とのリンク、順序・seed・境界 | 候補を削ると選出同値は未保証。今回、既存B案の確定版を再利用し、入力事実の不足を明示 | 全候補を捨てて全場面同値とは言えない。正式collectorへの偽履歴入力は禁止 |

## 販売と供給の読取境界

`partner-orders.mjs` の通常棚配置は予約在庫だけを変える。`settleStoreMarket` は顧客実売後に `deliverShopInto` を呼ぶ。旧注文方式／デパートも同関数を通るが、卸売受渡の成立であり顧客実売の証拠ではない。`retailMirror` は納品分をcoreの商品売上から引き、release.soldには自家販売だけを載せる。

新独立モデルは shelf allocation／confirmed delivery／consumer sale／retail sale／orderを区別する。一つの確定transactionに納品と実売が同時に含まれても売上は一度だけ計上する。旧記録から判別不能な顧客実売はunknownとし、0や納品本数で埋めない。

増分処理は単調な確定連番・月順を入力契約にし、完了したtransactionのみ原子的に受理する。再送は同じ連番を再利用する。過去の全ID集合を無限保持しない代わりに、任意順配送・古いtransactionの内容変更は対象外として拒否／未保証を明示する。月末確定前の更新と月初会話用snapshotを分離する。

## 新モデルの層

樽の現在値／瓶詰め時の共有特性／旧IDを維持した現役発売／完了後の識別と記憶を分離する。同一風味だけで統合せず、熟成・元樽・出自・ブランド・価格・外観・販売条件が同一であることを要求する。価格変更は現役発売の状態として保持し、過去外観を黙って変えない。

記憶A（全発売の小さな識別・外観）、B（重要酒詳細のみ）、C（全発売最小情報＋重要酒詳細）を比較する。現役在庫、未完口コミ／問い合わせ、確定回想から参照される発売は集約対象から保護する。任意の昔の酒を正確に思い出すには、最低でも発売IDごとの対応情報が必要であり、その線形成長を隠さない。

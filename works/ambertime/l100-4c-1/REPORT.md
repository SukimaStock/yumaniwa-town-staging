# AmberTime L100-4C-1 結果

## 判定：追加研究

推奨は **C：既存v8の原bytesを保持するIndexedDB世代管理**。最初は1世代1オブジェクトに限定し、Dの分割/checkpointは後段に分ける。今回、Node transaction契約モデルで旧正常保存の保持・候補拒否・復旧を確認したが、実ブラウザーの新規障害試験は未実施。正式採用候補と呼べる証拠には不足する。100年耐久全体の判定は引き続き保留。

本編・保存形式・上限・ゲーム計算・RNG・歴史/回想・UI/Canvas・Productionは無変更。マージしないDraft成果。AGENTS/Change OS/Work Lifecycle確認済み、AmberTimeはactive。

## 確認できたこと

- C単一payload、D分割manifestの2方式。候補を非公開で保存→読戻しと正式検証→head/revision比較で公開という順序を隔離モデルで実装。
- 正常旧世代は候補失敗でも保持。読戻し失敗、commit前中断、hash/世代/版/欠落、2writer・stale revision・ABA・復旧中の競合を拒否する。
- 全候補不正/全消失ではsafe-stop。prepared orphanを復旧元に昇格しない。新規ゲームを自動保存しない。
- 3方針100年の実v8コピー、C/D計6ケースで旧正常bytesへ完全一致復旧。3方針とも正式readerを再実行し、正式状態・RNG・帳面・歩み・回想一致、1200→1201月の本編計算とcollector一致を確認。
- 隔離モデル53試験成功、既存formal-save/codec/recall-save23試験成功。モデルのvalidatorは小fixtureでは意味的整合性oracle、実100年では正式readSession。小fixtureの成功だけをゲーム保証にしない。
- 対象外の9世代交代/蒸留から販売までの再操作/30～90年の新規再試験は実施していない。原bytes不変の互換根拠とL100-2/4A-3既存証拠を分けて扱う。

## 容量

単位はdecimal bytes。正式wire JSONのUTF-8 bytesであり展開後コード上限・実ヒープ・ブラウザー割当量とは別。

|方針|原v8 bytes|UTF-16 units|2世代原bytes|3世代準備原bytes|
|---|---:|---:|---:|---:|
|地元|3,467,349|3,189,109|6,934,698|10,402,047|
|混合|4,535,936|4,170,204|9,071,872|13,607,808|
|広域|5,282,030|4,853,106|10,564,060|15,846,090|

localStorageを単純UTF-16換算すれば1世代地元6,378,218／混合8,340,408／広域9,706,212 bytes。ブラウザーのquota計算法とは限らない。広域2世代が入ると仮定できない。

試作のJSONエンベロープ込みC/D 1世代は地元3,941,250/3,944,084、混合5,156,883/5,160,433、広域6,003,353/6,007,617 bytes。広域3世代candidate準備peakは18,010,166/18,022,904 bytes。これはモデル全体JSONを測った論理量でありIndexedDB物理サイズではない。2正常世代を守ったまま新候補を準備するには3世代分の一時領域が必要。Dは今回重複削減しないので、メタデータだけ増える。

自動GCは未実装で全publishedを保持する。このまま長期製品運用すれば容量増加が続くため採用不可。bounded retention＋独立検証済み旧正常pinningが正式導入前条件。

## 性能・復旧

|方針|初回正式read(ms)|復旧後同プロセスread(ms)|2回の翌月比較合計(ms)|
|---|---:|---:|---:|
|地元|65,933.4|211.6|194.2|
|混合|99,870.2|363.8|196.5|
|広域|128,710.6|285.0|178.5|

Node24.22.1、3独立processを同時実行した単回値。初回と復旧readの差は既存module cache等のwarm効果を含み、この研究によるcold高速化ではない。復旧時も公式readerを呼ぶがキャッシュがある。100年分の全再生を毎障害で繰り返していない。exact raw文字列をprocess内で正式検証済みSetに保持し、同じ入力だけ重複検証を再利用。永続化したhash/receiptを信頼したわけではない。

candidate/model書込/readback/recoveryの値は各policy JSONに分離。広域Cは31.5/173.6/121.2ms、Dは36.9/211.1/162.1ms（candidate／モデル保存＋読戻し／モデル復旧）。MemoryDriverのcloneとJS処理時間でありlocalStorage/IDB I/O性能として使用不可。実ブラウザーの容量、書込時間、readback時間、物理耐久、GC peakは未測定。

## 実ブラウザー

新規sandbox有効Chromium156.0.8078.79がページ生成前にsocket() Operation not permittedでSIGABRT。Firefox/WebKit binaryなし。Cloud Chromeは既存game tabあり、公開APIに隔離context・storage障害注入なし。既存player領域には触れず、制限解除もしない。起動失敗はアプリ不具合ではない。

H1-A4には歴史的なChromium42試験等の証拠があるが、今回の世代adapter/100年入力の新規成功ではない。既存runnerのno-sandbox指定は今回再利用していない。iPhone Safari実機未確認。

## iPhone Safariの最小確認（次の隔離IDB試作ができてから）

1. 専用テストoriginにwide100コピーを取込み、元SHAと復旧SHAを確認。通常月次を1回進め、保存完了を待ってSafariを閉じ再開。
2. 同じoriginを2タブで開き、一方保存後に古い方で保存。古い方は拒否し、新しい正常保存が残る。
3. テスト用障害スイッチで候補書込中断/読戻し失敗/最新世代破損を各1回。旧正常世代への復旧と翌月進行、帳面/回想閲覧を確認。
4. 専用originのquota試験と全候補不正で安全停止を確認。既存プレイヤーoriginのデータは削除しない。全origin消失は復旧元なしなら復旧不能と表示する設計を確認。

現時点では新adapterのUIがないため、これを人間にすぐ実施できる完了手順として依頼しない。デスクトップ隔離browser試験を先に自動化し、実機でしか判らないライフサイクル/容量に絞る。

## 再現・対象

base main: 28f00c81cb1b374758da34dc79cf7f63dfe657c2。
Plan実装前local: 5f7f29ec0e4af241269f91fc998a0f1a6842c0c5。remote Plan: c26f6c9b3aa14c31095f5baa71fc43dfd5099571。同一Plan tree。
Plan digest: 42c2cfc497a6221401970436709d602a489bd4f3b11ebb3466f87d7a20068769。
#828/#831～834は全てopen Draft・unmergedを確認。コミットはinputs.json。研究コードのcherry-pickなし。H1-A4はcurrent mainのcheckpoint-idb-research/を読取参照。
既存baseline保存コピーはinputs.jsonのSHAに一致。元データ不変を実行後確認。

再現: repository rootで `node --test works/ambertime/l100-4c-1/generation-store.test.mjs`。
100年: `node works/ambertime/l100-4c-1/measure.mjs <policy-100-year-1200-v8.json> <output.json>`。入力は既存L100-1 baseline paused/、詳細SHAはinputs.json。
ブラウザー可否: `node works/ambertime/l100-4c-1/browser-feasibility.mjs <output.json>`（実際のCLIはsource参照）。

詳細契約/比較/移行条件はDESIGN.md、独立監査はAUDIT.md。研究の再現に機密・プレイヤー保存へのアクセスは不要。報告文は必要な技術根拠のみ、ゲームUI/表現変更なし。

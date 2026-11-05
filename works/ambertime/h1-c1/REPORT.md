# H1-C1 起動時間監査（作業中）

基準main: `74924b2729565531dcc3a499dcb7e24bcc0dced8`。
Plan: `.change-plans/ambertime-h1-c1-proof/r0.lock.json`。
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

最初の候補はappのimport URL統一。起動は短縮したが、履歴内のenable-stage4等から呼ばれる検証が、現在のcheckpointを古いprefixへ置き換えた。次の操作へ全再生を移すため不採用。

修正版はappが厳密なD.validateDistilleryを樽番号resolverへ渡し、検証後のprojectionは従来の別moduleで動かす。既定のvalidatorは従来通り。正式reader、codec、projection APIと全JSON一致は不変。配信URLにstartup識別子を追加。

樽番号の全projectionは別に残る。正式readerのcheckpointにはobserverの樽作成順がなく、この監査でreaderを拡張しない。未表示帳面は既にdemand-drivenなので、起動時全帳面生成の削除は行わない。

## 計測方法と限界

`browser-timing.mjs`は隔離HTTP originの実index.html、native localStorageの正式key、Chromiumを使用。配信コピーだけに観測wrapperを加え、before/sharedのimport URLを切り替える。モデル動作や正式検証は変更しない。入力SHAは既存H1-B1容量記録の12条件へ照合する。

- readSession / restoreDistillery / validateDistilleryは包含区間。加算しない。
- validate呼出回数は全再生回数ではない。warm prefix検証も含む。
- boot-completeは同期boot経路完了。
- paint-opportunityはdouble-rAFの描画機会。実画素の描画完了とは断定しない。
- inputResponseMsは起動後のTabキー応答。保留中modalを誤って確定しない。実際のゲーム操作可能性は別途確認する。
- observationCompleteMsはsnapshot複製・JSON化も含む観測完了時間。起動時間とは区別。
- before/sharedは同一disk fingerprintでも配信appが異なる。modeとservedAppSha256で識別。
- Worker生成完了・帳面初回・月次・保存・再読込は別検証が必要。

予備の地元30年: Chromium観測完了33.24秒→22.61秒。正式reader約8.54秒→8.20秒、樽番号projection約14.06秒→13.47秒。変更前は別moduleのcold検証が約9.68秒追加。起動後JSONのハッシュ一致。予備値は最終比較に混ぜず、100年の結論へ外挿しない。

100年の最初の試行は関連テストと同時実行されたため中断。次の試行は既存modalを妨げない操作計測へ変更するため中断。どちらも完了値として再利用しない。入力やユーザー保存は変更していない。

## 未完了

広域・混合100年の変更前後ペア、12条件の起動比較、全再生回数の直接計数、Worker/帳面/歩み初回、月次・保存・再読込、復旧browser回帰、全必須CI、Staging公開確認。地元100年は暫定B、全体判断は保留。

回帰: 樽番号既存7件＋module共有境界2件、9/9成功。追加テストの初回は非対応モードへのrange開始というテスト入力誤りで失敗、既存staffモードのstartDistillationへ修正後成功（製品修正なし）。

歴史: 関連53依存のSHA256が一致し、既存9境界の証拠を再利用可能。Scope→Risk→Impact成功。Draft PR #813へ作業保存。

地元100年変更前（同一ホスト逐次、最終runner）: boot-complete 182.317秒、paint-opportunity 182.328秒。正式reader47.493秒、別module cold検証47.530秒、樽番号projection86.044秒。後続比較は未完了。

【不採用案の診断】地元100年URL統一後: boot-complete **134.446秒**、paint-opportunity **134.459秒**。正式reader46.444秒、樽番号projection86.739秒。起動差 **47.871秒（26.3%短縮）**。入力・wire・起動後全JSON SHA・runner・Chromium版一致。両方のpageerrorは0。樽番号専用の完全検証は温かいcacheの検証に変わるが、全projectionは残る。操作計測はTab入力のみで、ゲーム操作検証は別runner。

この地元100年結果は待機内訳の診断値。修正版の性能値ではない。残るのは正式readerに加えて樽番号projectionも大きく、checkpointだけでは解消しない。最初に樽作成順の安全な再利用を独立に研究する余地がある。今回の製品には導入しない。

再現: `node works/ambertime/h1-c1/matrix.mjs <H24入力ディレクトリ> <隔離出力ディレクトリ>`。12入力は既存容量証拠のSHAに照合し、100年3方針から逐次起動。`node works/ambertime/h1-c1/operations.mjs <正式game JSONまたは一時停止済v3> <結果JSON>` は独立した実操作確認。重い計測と同時実行しない。

広域100年変更前（旧runner）: boot-complete 359.578秒、paint-opportunity 359.620秒。正式reader99.985秒、別module cold検証98.993秒、樽番号projection158.736秒。変更後は未完了。

追加確認: R0/R6配信依存グラフ・H1-C1境界計15/15 PASS（重い再生を含まない）。Node v24.22.1 / Linux x64 / Chromium 153 / viewport 390×740。15件には先のH1-C1境界2件を含む。

修正版の回帰3/3 PASS。テスト用にだけcheckpoint長を観測し、同一module案のcache破棄と、分離案の正式checkpoint保持、樽番号・全JSON一致を同じfixtureで確認。

最終比較の `matrix.mjs` は `browser-safe-timing.mjs` を使う。変更前は基準mainの実blobを使用、修正版は作業tree。初回の正式シリアライズ前にcheckpoint長が全操作件数と一致することを確認し、その所要時間も記録する。古い `browser-timing.mjs` と `local-100-shared.json` は不採用案の診断記録で、修正版の合格証拠に流用しない。

**修正版・地元100年:** boot-complete 134.031秒、paint-opportunity 134.039秒、正式reader47.352秒、樽番号projection85.388秒。正式cacheは1,522/1,522操作を保持し、直後の厳密なserializeは0.118秒。以前の変更前診断と入力・wire・起動後全JSON hashが一致。エラー0。メモリはChromiumの粗いサンプル47.4MB（peakではない）。同じ最終runnerのbefore比較は別途実行。

## 最終runnerで完了した比較

地元密着100年。同一入力・ブラウザ・runnerの逐次実行。正式cacheは両側とも1,522操作、起動後全JSON SHA・v3入力wire SHA・pageerrorなしが一致。

| 指標 | 変更前 | 修正版 |
| --- | ---: | ---: |
| boot-complete | 194.263 秒 | 134.031 秒 |
| 描画機会 | 194.275 秒 | 134.039 秒 |
| 正式reader（包含区間） | 50.727 秒 | 47.352 秒 |
| 樽番号projection | 91.681 秒 | 85.388 秒 |
| 起動直後の厳密serialize | 0.119 秒 | 0.118 秒 |
| Chromium heapサンプル | 56.800 MB | 47.400 MB |
| Tab往復 | 4.000 ms | 22.000 ms |

起動差 60.232秒（31.0%短縮）。一回ずつの測定値で、iPhone実測や統計比較ではない。地元100年は **B**。正式readerと樽番号projectionの両方が残り、後者が最大区間。

地元密着30年の実UI: 起動・通知解除、蒸留/貯蔵/販売、地図、仕込み/たる/発売/取扱店/歩み、正式時計の次月保存、正式reader読戻し、再読込に成功。読み取りUIの前後で全JSON不変、次月と再読込は正式tickの全JSONと一致。仕込み初回23.982秒、たるは仕込み後のWorker cache使用で0.071秒、歩み初回14.278秒。時計を進めて停止する操作から保存確認まで6.805秒（時計待機を含み、保存書込単独ではない）。pageerrorなし。

修正版の短い検証: 配信依存・cache境界16/16、H1-B2のapp/codec14/14。歴史9境界の53依存一致を保持。H1-B2ソース逆変換の固定テストは基準mainの正確なblobで成功、候補の追加差分に対しては新規失敗。既存R5固定失敗と区別し、現Planで許可されない証拠テスト変更は行わない。

実Chromium復旧: 既存のB2 native failure runnerを修正版の隔離worktreeで実行し **11/11 PASS**。試飲・判断・世代交代の容量不足で元保存bytes、確定状態、救出download、容量回復後の再試行を確認。B2の既存evidenceは上書きせず、今回の結果を別ファイルに保存。

広範囲回帰: `node --test --test-concurrency=4 works/ambertime/tests/*.test.mjs works/ambertime/chronicle-lab/*.test.mjs` — 1303件、1296成功、5失敗、2skip。基準mainのtreeは#812の報告対象と同じ `7af2213147afe182fb04efca97a2fda7fd818c42`。A1-3/R4/R5固定ソース3件と販売UI1件の計4件は同じ既存失敗。B2逆変換1件は新規。対象の実blobを基準mainから隔離した試験でPASSを再確認した。修正版による新しいソース差分を既存証拠が認識しないため、旧hashを更新したり既存失敗に混ぜたりしない。Planの対象外なのでマージ停止。

固定証拠テストの解消: Scope対象外を見つけた時点で元Lockを保持し、基準mainから新branchと新r0を作成。H1-B2逆変換テストへの前処理は、承認済みC1差分の完全一致部分だけを逆変換する。無関係なbyteは旧オラクルへそのまま渡し、重複や改変は拒否する。旧ハッシュ、基準main、製品差分、計測の製品fingerprintは不変。固定証拠とC1境界の再検証 **5/5 PASS**。先の広範囲suiteの失敗を既存扱いせず、この変更で解消した。新branchでの広範囲suite全件再実行とは区別する。

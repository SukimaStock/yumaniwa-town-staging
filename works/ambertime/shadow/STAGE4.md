# 第4段階：小さなモデルの読取境界

基準main: `1ceafc3cffb0ef8f2ed3db2599ebc4dbcf030a7b`。正式ゲーム状態・経済・v8・解放・口コミ・回想は既存正本を維持。PR #894、Production、個人セーブは対象外。

## 移行判定

「一致」は表に限定した入力・出力契約の一致であり、保存移行や全ゲーム100年を保証しない。「意図的差分」「情報不足」「未検証」を成功へ合算しない。

|機能／現在の読取正本|新モデルの情報・旧ID対応|判定／切替条件|不足・失われ得る体験と扱い|
|---|---|---|---|
|店舗短文 `shopRemark` / `shopRemarkFacts`、正式relations・deliveries・offers・department|readerの店×ブランド集計、初回／最終月・異なる月数、確定契約・現在の申し出・adoption。旧shopId/brandId維持|一致：同一保存済み状態のkey/text。明示的機能指定・active・確定状態同一性・当該結果一致が必要|販売室モーダルの表示はkey/textのみ使用。元factsのdeliveryMonths配列全体を再構築しない。バーの現行短文はneutral/空文字であり勝手に追加しない|
|当月短文と `dialogueCandidates`|reader.allは当月込み。closedは前月までのeligible集計。発売IDを維持|一致：既存全4店replay・方式開始境界・adoption証明比較。正式候補選出は旧経路|スーパー開始月、バー有効化、デパート7項目一致と5本は集計数だけで推測しない|
|発売・在庫・自家販売 `readRelease` と正式release/product|core.identities、wines、live releases、retailとdeliveryを分離。releaseIdとproductIdを別保持|一致：観測済み新規セッションの在庫・自家売上・確定納品。経路別事実を読取可能|特性共有は発売統合ではない。製造世代は観測できた元樽だけ。古い出自を推測しない|
|店舗実績 `buildShopLedger` / 正式deliveries|core.storesのdelivery/sale、unknownSaleReceipts、最初／最後／異なる取引月数・最近8件|一致：確定取引の集計。実売不明の納品はunknownのまま|全休止・再開の年月一覧は保持しない。継続streakと現在gap、直近再納品を全履歴と呼ばない。契約開始と初取引を混同しない|
|発売帳 `buildReleaseLedger` / records・products・履歴coverage|在庫・retail・deliveriesと発売識別は取得可能|一致：発売ID・商品ID・在庫・retail・deliveriesの集計を比較後に切替。情報不足：帳面全体|完売商品がcore.productsから消えた際、旧帳面stockはcoverageによってnullになり得る。新coreの0へ無条件置換しない。deliveryCompleteも旧根拠を保護。record・仕込み・樽timeline・legacy卸売明細は旧経路|
|店舗帳面 `buildShopLedger`|合計本数・金額、最初／最後・契約開始、取引月数|一致：count・revenue・firstMonth・lastMonth・startedMonthを比較後に切替。情報不足：帳面全体|納品1件ずつの日時・projectName・adoptionリンク・相談状況をcore totalsから生成しない。店名不明IDの既存表示も保護|
|昔の酒 `shopDialogueHistory` / 正式projection|reader.chosenは実選出entry、発話月・ID・text・cooldown。reader.releasesは旧発売IDと最小profile|一致：観測済みの実選出entry全文が旧結果に一致する場合だけ切替。情報不足／未検証：過去全履歴の代替|候補は発話実績ではない。選出済み台詞を再抽選しない。通常の履歴projectionと選出は旧経路。再起動後はchosenがないため旧経路|
|記憶C `internal/memory.mjs` とB案比較|通常発売の識別・外観、重要発売の詳細を分離できる|一致：独立Labの既存比較範囲。未検証：正式帳面全項目の代替|Cのexportと実行中coreが保持する完全descriptorは別物。通常酒の全風味・価格推移・過去明細が再現できるとは主張しない。既存過去記録は削除しない|
|店舗解放 `shopEvidence`|比較用候補実績のみ|意図的差分：仮policy。情報不足：複数ブランド実売月・紹介・企画の全条件|正式解放は旧正本。候補評価を正式判定へ接続しない|
|供給と浸透 `storeRelation`|deliveryとsaleを別保持|意図的差分：候補の点・段階|正式関係・帳面の評価へ無断表示しない|
|`syncTown()` receipt/cursor/packet、問い合わせ・契約|対応集計だけでは因果・配信順序が不足|情報不足：正式切替対象外|receiptや過去口コミを再生成しない。到達・関心・問い合わせ・契約・取引を別の事実として保護|
|世代回想collector・確定回想|記憶Cと独立候補比較のみ|未検証：次世代選出。正式切替対象外|確定snapshot・旧発売ID・背景リンクを変更しない。存在しない出来事を補わない|

すべての切替候補はセッション内に限定。再起動・復元・旧v8読込みは新モデルを初期化せず、旧読取へ戻す。確定状態がなければ「一致」行でも切り替えない。

## 安全な実装境界

正式writerの書込み・読戻し成功より前に新しい状態を読取へ渡さない。QuotaExceededError、書込み失敗、読戻し失敗、競合では元の確定状態を保持する。observer停止・例外・上限・発売対応欠落・同期不一致・表示不一致は理由を診断し、旧表示を返す。診断停止は成功ではない。

機能は店舗短文、発売帳集計、店舗帳面集計、昔の酒の会話を別に扱う。一つの明示フラグが他の機能を有効化しない。4つの経路を実装し、発売帳と店舗帳面は同一性を確認した集計フィールドだけを旧行へ渡す。残りの明細・coverage・表示は旧結果を保つ。昔の酒は観測済み実選出entryの全文一致だけを許す。通常URLでは第3段階と同様に新モデルをimportしない。新しい常設UI・台詞・選出規則・演出・帳面画面は追加しない。

`read-contract.mjs` は履歴を偽造せず必要な事実を返す共通入口。短文は当該店・ブランドだけを読み、全店舗の会話候補を生成する `readReader()` や全stateを複製する `report()` を通常の描画経路で呼ばない。

## 性能の測定方法

`node works/ambertime/shadow/stage4-measure.mjs` の結果は [stage4-measurements.json](stage4-measurements.json)。12、360、1200か月に各1発売、2本のうち1本を確定卸売・1本を自家販売し完売圧縮する合成入力。店は4店を循環する。正式ゲーム・正式保存・正式Shadow上限内の長期進行ではない。明示的にcoreとreaderを単独測定し、正式診断上限を緩和しない。

各条件で旧短文と新短文のkey/text一致をassertした後、4店舗の読取、旧読取、新旧比較、実際のread-switch経由（旧読取・一致比較・診断記録込み）の各平均を測る。無効フラグの分岐も単独測定する。sourceReadFieldsBytesはこの読取試験用の原データであり、ゲーム全保存容量ではない。coreBytesとreaderBytesも別の層なので単独の削減率にしない。

JSONコピー回数はこのfixtureの呼出経路から算定する。registerRelease・applyTransaction 2回・compactReleaseで月4回のcore全体JSONコピー。readerは月1回のstructuredCloneと月境界のeligibleコピー。読取自体は全履歴を再構築しないが、更新側のコピーと比較走査は依然増大する。第3段階のadvanceShadowにはさらに全coreコピー、各予約の解除／再設定、契約・現在樽のコピーがあり、このcore単独結果より重くなり得る。100ms停止は処理後の検出であり初回の長い同期処理を防げない。

Node v24.22.1の今回の単回計測（4店舗を一組、各2,000回平均）：

|合成月数|旧短文 ms|集計のみ ms|実router・旧比較込み ms|core / reader bytes|core更新合計 ms|
|---|---:|---:|---:|---:|---:|
|12|0.00463|0.00189|0.01686|8,388 / 4,969|4.75|
|360|0.02204|0.00136|0.03655|185,394 / 100,078|1,135.84|
|1200|0.07899|0.00114|0.08807|613,816 / 332,634|12,258.44|

各条件の実routerは8,000回compact採用・fallback 0。読取だけは履歴件数にほぼ依存しない一方、安全な比較込み経路は旧履歴走査のコストを残す。1200か月のcore更新最大は53.94msであり、全更新平均や実ゲーム1tickではない。reader更新合計は2,267.80ms。保持する発売と店別発売の識別は増加し続ける。この最小合成fixtureではcore＋readerは原読取用データより大きく、今回を保存容量削減の達成とは扱わない。

iPhone Safariの同期処理停止時間・GC・メモリ上限はNode計測から保証できない。将来は確定状態のrevisionに結び付けた読取キャッシュ、変更された発売／店だけの更新、必要なコピー範囲の縮小を独立検証する。未確定previewをキャッシュキーにしない。

## 第5段階への引継ぎ

1. **次の読取**：今回切替可能な帳面集計を広げる際は旧coverage/null意味まで維持し、店舗帳面の既存明細との境界を保つ。昔の酒は「実際に発話した記録」の保存契約を先に決める。現在の候補一致だけで履歴の置換を承認しない。
2. **旧v8初期集計**：元receipt・操作順・ID対応・方式境界を確定し、部分履歴はcoverage/unknownを保存。初期集計完了まで旧読取を使う。全履歴の同期再生を起動時に当然としない。
3. **checkpoint・保存／復元**：native保存revision、transaction cursor、schema/policy version、coverage、ID対応、実選出台詞を一組で検証する。checkpoint＋tailが同じ確定状態を表すこと、途中失敗・競合・readbackで新旧が混ざらないことを先にテスト。今回のv8・IndexedDB変更はない。
4. **関係policy**：policy version、到達段階・到達月・当時根拠、休止／現在の活発さ、世代継承を別フィールドにする。供給量と顧客浸透を別に保ち、unknown売上を0実売と同一視しない。旧セーブの過去到達を新policyで再計算して既存歴史を書き換えない。
5. **記憶C**：全発売の短い識別・外観を維持し、重要酒の詳細選定根拠を確定。過去会話・回想の参照中IDは保護し、特性IDへ置換しない。正式帳面が必要とする値とCにない値の一覧を先に固定。
6. **町・回想**：receipt/cursor/packetと因果正本、問い合わせから契約までの段階、確定回想と次世代候補の境界は維持。将来の比較にも不足情報を捏造しない。

検証結果・exact head・CI・配信ブラウザーの観測範囲はPRに記録する。iPhone実機と作者の体験評価は未確認。

## 回帰の基準

実装前の関連suiteは222件中217成功、5失敗。内訳はformal-copyの文面2件・cache query 1件、market-rules-uiのcache query 1件、shop-dialogue-s2の既存VM harnessにm0がない1件。基準main `1ceafc3c` の独立worktreeでも対象22件中17成功・同じ5失敗を確認した。期待値と既存テストは変更しない。第4段階後の最終件数はPRのexact head記録を優先する。

## Stagingでの確認方法

新規の隔離ブラウザープロファイルで本編に `?debug=1&shadow=1&read-remarks=1` を付けて開始する。既存の個人セーブを削除・reset・importして試験しない。店舗短文だけが有効になる。別機能は `read-release-ledger=1`、`read-store-ledger=1`、`read-old-wine=1` をそれぞれ明示する。

`window.amberShadow.reads()` は機能ごとのcompact/fallback件数、直近32件の原因、読取時間を返す。`report()` は従来どおり全診断状態をコピーするため描画では使わない。既存表示への実採用は、対象の空でない表示を開きcompact件数の増加と画面の一致を併せて確認する。空帳面・null会話の一致だけを実データ移行の証拠としない。

再読込みするとShadowは初期化されず、読取時にinactiveの理由で旧経路を使う。フラグを外せば各機能の比較も停止する。通常URLは診断モジュールをimportしない。

追加の非空発売帳テストでは実ゲーム関数から瓶詰めした5本の商品を使用。正式nearbyComparisonFactsのcoverageがある場合のみ新集計を採用し、coverage不足によるnullと0の差はread-result-mismatchとして旧帳面を保持した。過去replayの中間状態は正式保存済み状態ではなく、nearbyComparisonFactsの入力検証を通せないため、この実証とは区別する。

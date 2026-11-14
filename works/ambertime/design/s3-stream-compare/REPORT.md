# B表現の逐次独立照合 — 限定研究結果

## 最新判定：固定容量バッファによる一巡の改善

**改善成立（研究用の独立照合に限定）。** B0を不変の比較基準として残し、B1では全game・全6 sidecar・双方の末尾・構造/参照/独立根拠・直接内容比較・拒否条件を維持した。照合単体の時間とpeak RSSが低下し、準備手順の限定変更によって準備込みの同一プロセス経路のpeak RSSも低下した。準備そのものの高速化は示していない。

これは正式復元全体の高速化でも、保存容量の削減でもない。正常100年v8、正式保存契約、D1全条件、S3完了、Safari適合は未成立/未確認のまま。#864/#856はDraft・未マージ、#856と本編は変更していない。

### 続行範囲・不変基準・対象SHA

- 比較基準: `1f04d38eae13dec58ff4c0455c8acec4d417a8da`。既存B0 `compare.mjs`、`measure.mjs`、D1-R `codec.mjs`はbyte-exactで不変。コード/入力のSHA一覧は[identity-final.json](evidence/buffer/identity-final.json)。
- 作業開始時main: `b57ce881b5f5f68bc12ff1f15634178118496958`。終了前fetchでは`8f50ecac82066fcb02958f7514d64e79d19696f5`へ進んでいた（#865/#866、あとだま公開関連のみ、AmberTime変更なし）。本研究ブランチを巻き戻し/rebaseせず、基準を保持した。既存r0 lockとdigestは変更なし。独立技術レビューで、上限16384 UTF-16 unitsの観測比較・準備会計・回帰・反復計測は既存WORK/Standardのscope内と確認した。HQ承認ではない。
- 続行理由・予算・停止条件を新実装より先に保存したコミット: `ec24cec9e19c9dfb046ca19d0df6b5f375a50df7`。[先行記録](evidence/buffer-continuation-scope.md)。lockを追加せず、元の拒否と是正履歴も下記に保持した。
- B1/runnerの初回コード反映: `44ee2932293397de7c16a38e89312fc418ac1ec5`。監督用runnerの最終コードコミット: **`32e6ce9a3fa8f1266be6a85d1c25daad6d949ce7`**。最終計測とレビューはこのコードに対応する。以後の証拠・文書コミットによる測定対象コードの変更はない。
- B1 SHA-256: `de13fea88904586b7d2d627640517e32529fb2d79f57986162cb5849e8efda04`。runner: `95398905c8fdcd28241e4882b819294fab7dfb85658f02dccafa8915afd95083`。

### 確認した負荷と変更内容

B0は100年全入力を**2,329,289出力片**で渡し、出力hashも同じ単位で更新していた。instrumented CPU profileではwalk、crypto hash update、比較、row view、文字escape/診断pathが主要なサンプルを占めた。[profile.json](evidence/buffer/profile.json)は観測用であり最終性能値には使用しない。

独立モジュール`compare-buffered.mjs`では、小片を実際に最大16,384 UTF-16 unitsのbufferへ集約する。固定深さの位置状態とcallback traversalを使い、schemaは現在の2表分だけlayoutを再利用。正常時には全pathを作らず、差分時だけ再走査して最初のUTF-16位置とB0同等のpathを報告する。arrivalは元events行を参照し、全配列を複製しない。小片を全件保持する配列や全出力joinはない。

4,096/16,384 unitsの2候補だけを単回pilotし、前者2,601集約片、後者652片を確認して後者を採用。pilotは最終3反復値と混在させない。最終B1は同じ2,329,289小片を**652 output hash updates、599 game hash updates、833直接比較、183 read calls**へ集約。最大output bufferは16,384 unitsであり、上限を宣言しただけの改善ではない。

準備改善は別の関数で行った。raw参照のSHA確認/parseのscopeを閉じ、独立game hash計算用の文字列を一時使用後に保持せず、encode後の元入力参照を解放し、今回の全入力経路では不要なgame-only参照ファイルを作らない。元rawとgameそれぞれの独立アンカーは従来どおり確認する。candidate自体から期待値を作ってはいない。**candidate bytes/SHA・アンカー・照合対象は完全に同じ**。codec内clone/stringifyや入力全parseは削除していない。測定中に強制GCはしない。

### 同じ環境での最終比較

Node v24.22.1、Linux x64、AMD EPYC 9V74。全条件`--expose-gc --max-old-space-size=512`。6条件×3回=18の新規workerを逐次、順序を回転して実行。重い試験の並列実行なし。値は中央値（最小–最大）、MiBは2^20 bytes。計測開始はmodule import後、peak RSSはworkerプロセスの高水位なのでstartup/importも含む。filesystem cacheは制御しておらず、**正式cold replayではない**。

|条件|時間ms|peak RSS MiB|
|---|---:|---:|
|A 完全展開＋照合|705.8（687.4–705.8）|220.42（220.14–220.47）|
|B0 確定済み逐次|2,530.2（2,410.7–2,562.4）|162.87（162.33–164.09）|
|B1 固定容量集約|683.4（651.9–717.6）|130.66（130.48–131.46）|
|従来準備＋B0|2,836.8（2,824.9–2,853.2）|341.27（341.01–341.27）|
|従来準備＋B1|1,172.0（1,094.5–1,175.3）|341.02（340.96–341.59）|
|改善準備＋B1|1,171.2（1,128.8–1,195.3）|288.56（288.49–289.72）|

B0→B1の照合worker時間は約73.0%、peak RSSは約19.8%低下。**bufferだけでは準備込みRSSは約341MiBのまま**。準備改善を加えると約289MiBへ15.4%低下したが、従来準備＋B1との時間差はほぼなく範囲も重なる。従来準備＋B0からの全経路時間低下は約58.7%。AとB1の時間範囲は重なり、Aには復元状態を返す追加責務があるので、Aを超える正式復元の高速化とは判定しない。

|測定内訳（中央値ms）|B0|B1|注意|
|---|---:|---:|---|
|準備済candidate読込/parse|50.1|48.5|比較単体にも含む|
|不変validatorの構造・参照・integrity/アンカー|232.5|228.8|codec変更なし|
|全件直接比較＋逐次出力/読取/hash|2,237.5|391.5|検査範囲同一|

準備工程の中央値は従来+B0で509.9ms、従来+B1で533.1ms、改善+B1で535.7ms。準備の速度改善の根拠にはしない。

Aのvalidator/hydrate/アンカーはcodec内で合算されており、個別費用は未分離。段階の中央値を足して全体時間とみなさない。生の18実行、実行順、各substep、heap観測点、最大出力、supervisionは[final-measurements.json](evidence/buffer/final-measurements.json)、集計は[summary.json](evidence/buffer/summary.json)。最終値とpilot/途中版ログを区別する。

A/B0/B1は同じ候補検査、全events/attempts/arrivals、型/順序/プロパティ、game＋全6 sidecar、独立アンカーを扱う。B0/B1は同じ事前raw確認・照合中raw hash・直接比較・両EOF・出力/game hashを実施。Aはhydrate済状態を返す。B0/B1は一致結果だけであり、プレイ可能なgameを生成しない。100年正式replayは今回も未実施、過去のreplay時間を足し引きしない。

### メモリ会計と限界

output最大16,384 UTF-16 units、escape scratch最大capacity+5、2つの文字列hashが各最大1 high-surrogate、raw参照buffer65,536 bytes＋現在のdecoded blockを保持する。直接比較sliceは最大capacity。schema cacheは2スロット、正常時の保持diagnostic spanは0。schema幅、object key配列、深さ/差分pathに依存する領域まで定数サイズとは主張しない。

不変validator内部の候補/body完全stringify、ID Map、arrival位置等は残る。candidate全parseと、準備時の元入力・clone・一時JSONも残る。比較単体heapAfter中央値はB0 26.66MiB、B1 33.46MiBとRSSと異なる動きをする。GCタイミングの違いを含み、単独領域の差とは解釈しない。最後の強制GC後は約7.2MiBだが、比較関数とcandidateのscopeを終了した後の観測であり、candidate保持量を示さない。工程別peakを足し引きして帰属量を推定しない。

準備＋比較は同じworkerで実測した。監督parentの小さい管理領域はworker RSSに含まれないが、重い準備を外部へ移した経路ではない。parentは50msごとにworker RSSを観測し768MiB超/120秒/出力上限で停止、終了後のworker高水位も検査する。短いpeakを防ぐOS上限ではなくサンプリング監督。全18実行の最大高水位341.59MiB、実測時間2,853.2ms以下。設定値は研究用予算であり、iPhone安全メモリ値ではない。

保存容量は変更なし。candidateは6,018,719 UTF-8 bytes/5,310,769 UTF-16 units。元game/全入力の容量・SHAは下記の既存入力表と同じ。不要game-only参照10,994,786 bytesを今回の準備出力から省いたが、ゲーム保存表現を圧縮したわけではない。

### 正常・異常・独立レビュー・原本保護

最終コードに対し基準側155/155、B1側138/138、**計293テスト実行PASS**。新規138は76 B1回帰＋既存独立反例31のB1実行＋新独立レビュー31。全て追加の独立テストという意味ではない。容量直前/一致/直後、極小容量、Unicode/escape/surrogate、整数キー、数値/null/欠落、双方EOF/短read/不正UTF-8、全6 sidecar、先頭/中間/末尾/全offset、再hash済不正候補を含む。構造・参照・candidateアンカー・content・output-anchorの拒否を区別し、比較器単独の試験も維持。[baseline155](evidence/buffer/final-baseline155.tap)、[B1-138](evidence/buffer/final-b1-138.tap)。

修正前の失敗を保持した。
1. 最初のB1のfatal UTF-8 decoderは既存のoutput-anchor拒否より早く型なし例外となった。基準と同じdecoder挙動に戻し、raw/output検出と期待値を維持した。[初期ログ](evidence/buffer/initial-utf8-stage-failure.txt)。
2. 独立レビューが、JSON化は同じでもactive内object aliasがsidecarへ共有される候補で、identityに基づくtown特別扱いによる誤拒否を発見。構造上の固定位置で判別する限定修正を行い4回帰を追加。[実際の反例](evidence/buffer/independent-review-original-alias-reproduction.txt)。
3. reviewer試験のread監視が自身のwrite-openも数えた1失敗は、読取だけ数えるprobe訂正。元TAPを保持し、製品期待値を緩めていない。
4. 計測runnerの終了後だけの資源上限確認に、実行中監督を追加。実際の過大割当/timeout殺処分を誘発した試験は未実施と記録。

[独立レビュー報告](evidence/buffer/independent-review-report.md)は対象SHA、実行した小入力試験、修正前後、18計測の読取監査を区別する。最終artifact監査でも新しいblockerなし。自己点検を独立レビューとは呼ばず、技術レビューをHQ承認へ読み替えない。

100年研究fixtureと、前回新規作成した24か月正式v8の実体を再確認し、再生成せず再利用した。元v8 SHAは`48751764f194f0e9909abd1186db79fa9d50b832ecbb14a776b5b8eb94198693`で前後不変。B1正常照合、10不正候補の拒否、原本の正式reader復元、原本なしSAFE_STOPを実行。[final-v8-protection.json](evidence/buffer/final-v8-protection.json)。このreaderは同一プロセス内の再利用でcoldではない。中断は途中JSONの模擬で、実ファイル電断/ブラウザーquota/origin消失の保証ではない。

### 再現と次の最小判断

```sh
node --test works/ambertime/tests/s3-d1-codec.test.mjs works/ambertime/tests/s3-d1-r-structure.test.mjs works/ambertime/tests/s3-stream-compare.test.mjs works/ambertime/design/s3-stream-compare/evidence/reviewer-adversarial.test.mjs
node --test works/ambertime/tests/s3-stream-buffered.test.mjs works/ambertime/design/s3-stream-compare/evidence/buffer/independent-review-boundaries.test.mjs
# 既存reviewer31件をB1へ差し替えて実行する再現コマンドはindependent-review-report.mdを参照。
node works/ambertime/design/s3-stream-compare/measure-buffered.mjs run /workspace/shared/ambertime-night-fixtures/ambertime-s3-r0/wide-1200.research.json /workspace/shared/ambertime-stream-inputs 16384
node --max-old-space-size=512 works/ambertime/design/s3-stream-compare/protect-v8-buffered.mjs /workspace/shared/ambertime-stream-new-v8 reuse
```

B1のbounded aggregation、diagnostic再走査、独立内容比較、不要な同時保持の解消は研究部品として再利用できる。既知の独立入力があり、同じ候補validator/アンカー/検査範囲を使うことが条件。今回の一巡はここで終了する。

|残件|解決と判断するための確認|
|---|---|
|準備込み約289MiB、入力全parse/codec clone/stringify|正式要件を決めた別検討で保持実体を減らし、同じ保証の全経路を実測。今回codec最適化へ拡大しない|
|独立元入力がない通常保存の来歴|正式モデル/replayと各成分の検証根拠を明示して別途承認。自己hash/自己期待値では代替しない|
|完全ゲームが正式上限超過|正式validatorのどの契約を変更するかを別設計判断。B1を本編へimportしない|
|永続的な世代/原本保護|保存先を決めた後、候補読戻し・確定・競合・容量不足・中断を実ブラウザーで検証|
|D1多方針/世代条件とSafari|元の未確認条件を残し、必要なfixture/実機試験を別判断。今回で合格にしない|

最終ローカル検査とGitHub exact-SHAは最終PRコメントに対象head付きで記録する。先行lockのCI成功を最終実装のCI成功にしない。

---

## 前回の限定試作（以下は不変基準の履歴）

以下の判定・数値は基準版の時点の記録であり、今回の最終結果と混ぜない。


## 判定

**照合は成立、資源上の効果は実用化の判断には不足。** 全記録とsidecarを元入力へ厳密に照合し、旧形式の履歴・arrivals配列・完全出力JSONの追加生成を避けられた。比較工程のメモリ削減は観測したが、時間は増加し、候補・参照を準備する工程のピークが残る。正式保存を変更する根拠にはしない。

D1全条件の合格、正式100年保存、S3完了、iPhone適合とは別の結果。地元・広域・混合×3境界など未確認の条件はそのまま残す。#856を変更・マージせず、新しいDraft #864へ研究を分離した。

## 1. 手続きの是正と経緯

- main: `b57ce881b5f5f68bc12ff1f15634178118496958`。
- 参照する#856: `715a6b9fa88cd19a8054e59ba7035c7f3cc499f1`。旧計画・lock・失敗ログ・コミット順序を保持。
- 旧PRのローカルScope PASSとRisk/Impact STOPは、plan.jsonのunknown-code分類によるFull/SYSTEM/HQ等の不足。GitHubのplan-risk-gate/trusted-mechanical-evidence失敗は、より前段の「変更lockが4件」であり、同じ原因ではない。[監査記録](https://github.com/SukimaStock/yumaniwa-town-staging/pull/856#issuecomment-6718237469)。
- 別研究PRの作成許可を受け、実際の独立技術レビューを実施した。しかし最初のFull計画は、その技術レビューをHQ承認として記載していた。ローカルlockコミット`e654f4c8d564973c5d62945a95c6868e9d369e0a`はGitHub未反映で保持。書込み審査が承認根拠の不適切な記載を拒否したため、研究実装を止めた。
- 読取専用の独立再監査で、今回の不変codec＋観測用比較器はWORK/Standardと確認。根拠は`tools/change-risk-policy.cjs:89–96,162–175`、`CHANGE-PLAN.md:358,444`、`CHANGE-OPERATIONS.md:255–268`。新保存方式や正式受理条件を導入する場合はこの判定を使えない。
- 作者が「承認記載を訂正し、同じ書込み審査へ一度提出、受理後のみ再開」を明示。WORK/Standard、authority=Standard、hqDecisions=[]へ訂正した。技術評価の実施と、未実施の実装レビュー・試験を区別した。分類器、CI、権限、書込み審査経路は変更しない。
- 訂正したlockが同じ審査で受理された。先行コミットは **`c722a4b892310d5b613a504bbda0a306d08aaa04`**、親は上記main、変更は`.change-plans/ambertime-s3-stream-compare/r0.lock.json`の1件だけ。GitHubのSHA・ファイル・blob`7617d0356e80a71e30e77bbd149f3f2e8786a3a3`を読戻した後に実装開始。
- digest: `25ea6fc218a998e9dc13f6cbcd0507be49115092784afef65af15c5b2797dd75`。旧拒否が当初から適合していたとは扱わない。過去のlockは削除・移動・書換えしていない。
- 上記先行SHAではローカルScope/Risk/Impact PASS、GitHubのvalidate、plan-risk-gate、trusted-mechanical-evidenceも成功。これは先行計画の結果であり、後続コードのexact-SHAチェックとは区別する。

## 2. 再利用と入力

研究コードコミット: `0fe93830045c98e4d9adf46deba8fe1b7f0420c1`。`codec.mjs`と既存2テストは#856の対象SHAからbyte-exactでコピー。codec SHA-256は`f3e0748284b7e6f3e4dbed1bd7df94b37cf1e73934e33ac276800ace0ea124dd`、Git blobは`9dc63806c745e5513d4c50a7b895413cbc001982`。codecの変更なし。本編から研究へのimportなし。

実在を確認した100年入力:
`/workspace/shared/ambertime-night-fixtures/ambertime-s3-r0/wide-1200.research.json`

|対象|UTF-16 units|UTF-8 bytes|SHA-256|
|---|---:|---:|---|
|game|9,808,696|10,994,786|b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55|
|game＋全sidecarの元ファイル|10,645,147|11,873,989|ee2849503b2b9113b388a2c8049a1c8b650afc64821719ad7c42703fa9f14cf4|
|B candidate|5,310,769|6,018,719|77aa72bca3dccf01766a8ffede1f7be2743870c3101010a8428f4a2736d92dc3|

events 10,333、attempts 26,221、arrivals 8,153。元ファイルはnative JSON.stringifyと同じcompact表現であった。100年シミュレーションの再生成はしていない。前の/tmpの不存在と、共有領域の実在を区別する。

sidecarの範囲はuserPaused、elapsed、caskSlots、recentLedger、historyRecord、recallRecord。100年の主試験は全sidecarを含む。game-only試験は別結果。研究snapshotは正式v8ではない。

候補、独立アンカー、game-only参照の準備先は`/workspace/shared/ambertime-stream-inputs/`。存在と内容を確認した。巨大fixtureやcandidateをGitへ追加していない。別環境へ移す場合は実体とSHAを再確認する。

## 3. 実装と保証の範囲

`compare.mjs`は変更していないD1-RのvalidateCandidateで構造・参照・integrity・独立candidateアンカーを先に検査する。その後、active状態とschema行のviewからJSON順に出力し、arrivalsはeventsの対応ordinalを参照する。全履歴のhydrate、到達オブジェクト配列の複製、全出力のjoinは行わない。

文字列とキーは引用符・制御文字・サロゲートを逐次escapeする。数値はnative JSON.stringifyの表現。整数形式キーはJavaScriptの列挙順に従う。最大出力16,384 UTF-16 units、参照読取64KiB。100年入力で観測した最大出力片は1,358 units。実装は同期実行でcandidateを書き換えない。

参照はcandidateから作った期待値ではなく、既知SHAの元ファイル。読取前と照合中のraw SHA、全UTF-16単位の直接比較、双方EOF、gameおよび全入力のSHAを確認。小入力はnative JSON.stringifyを直接比較基準にした。最初の差分はUTF-16 offsetと論理pathで示す。長いキーの診断pathは80unitsで明示的に短縮するため一意な完全キー名とは限らないが、offsetは正確。出力するキー自体は短縮しない。

|保証|今回の根拠|限界|
|---|---|---|
|候補構造・参照|不変D1-R validatorと異常試験|既存validatorの保証範囲を超えない|
|元内容との一致|独立raw参照へ全件・直接照合|その既知入力との一致であり任意状態の来歴ではない|
|正式計算の来歴|24か月新v8は既存writer/readerで確認|100年正式readerの独立replayは未実施|
|保存保護|新24か月v8の隔離ファイルを保持|ブラウザー原子性・電断・quota・origin消失は未検証|

既存validator内部にはcandidate/bodyの完全JSON.stringify、event ID Map、arrival位置配列が残る。candidate全体の読込・parseも残る。追加の旧形式展開を避けたのであって、全体が定数メモリ、全入力をstream parse、ゲーム中の全履歴保持解消という主張ではない。

## 4. 試験と独立レビュー

- 既存codec回帰80件: PASS、期待値変更なし。
- 新比較器44件: PASS。Unicode、日本語、絵文字、制御文字、paired/lone surrogate、数値、null/欠落、空配列/オブジェクト、整数キー、順序、tiny chunk、両EOF、巨大文字列/キー、短いUTF-8読取、独立アンカー、差分位置を含む。
- 独立実装レビュー31件: PASS。うち1件は64種類の決定的JSON差分比較。固定入力・参照の変化・invalid UTF-8等も確認。
- 合計155テストの最終再実行: PASS。以前の140件ログも保持。
- 既存正式save/recall/s3回帰23件: PASS。
- 100年の全入力直接照合: PASS。全個別記録・順序・townキー順・game・全sidecarが元JSONと一致。game SHAも指定値。

独立レビューで2件の新比較器の問題を発見した。
1. 診断path生成が長いキーを一括stringifyしていた。診断だけを短縮・明示し、実出力は完全保持する限定修正。
2. UTF-8の短いreadでdecoderがまだ文字を返さない状態をEOFと誤認。実際のbyte EOFまで読み足す限定修正。

修正前42PASS/2FAILと独立反例を保存。旧codec・正式モデルを変更せず、同じ期待値で修正後PASS。レビュー後の比較器SHAは`f3c994374c6ed5b31587b8f7e053a695d238ae63ba77049dca58cf9da0bf93cb`。レビューは技術的証拠でありHQ/Owner承認ではない。詳細は`evidence/reviewer-review.md`。

不正候補を独立アンカーで止めた場合と、構造・参照で止めた場合、原内容との直接不一致で止めた場合をstage別に扱う。 独立レビューでは追加15件により、先頭・中間・末尾の文字と履歴行、行欠落・余分・並替え、6sidecarそれぞれの途中切断を、検証を通過する候補と試験専用参照hashで比較器自体へ到達させた。chunk=1/7/16,384でcontent段階の拒否と正確な最初のUTF-16位置を確認した。sidecarだけの値変更も既存44件のelapsed反例でcontent拒否を再確認。これは構造検査やcandidateアンカーで止まった試験とは別である。試験内でcandidateShaを意図的に差し替えるケースは後段の比較器を単独検査するためで、通常利用のアンカー差替えを許可するものではない。

## 5. v8原本の保護

記録された旧24か月wireの実体は発見できず、その原本を再利用した試験は未実施。代わりに現行公開操作で24か月だけ進め、現行正式writerで**新規入力**を作成した。100年を再生成したわけではない。

`/workspace/shared/ambertime-stream-new-v8/new-original-v8.json`
SHA `48751764f194f0e9909abd1186db79fa9d50b832ecbb14a776b5b8eb94198693`、209,412 bytes。過去報告のSHAと同じだが、今回生成したファイルであり旧原本を発見したという意味ではない。

正常候補の全入力一致、events/attempts欠落、schema破損、integrity、参照、version、世代情報、elapsed・途中切断・候補作成中断の10ケースを検査。不正は拒否、原本bytes不変、既存正式readerで同じ全入力へ戻り、原本がない場合はSAFE_STOP。正式readerの時間は初回がwriter後、reuse試験が先行reader後の同一プロセスでありcoldではない。保存中断ケースは途中までのJSON文字列を渡す模擬試験で、実ファイル書込みの中断を起こしたものではない。v8-protection-final.jsonの初回用readerTiming文言は履歴として残し、runnerの報告文言を訂正した。訂正後のexact runnerで同じ原本を再度読取り、10ケース成功と原本SHA不変をv8-protection-exact.jsonへ保存した。プレイヤー保存キーへの書込みなし。初回runnerのgenerationという試験名は実際にはelapsed改変だったため、そのログとsourceを残したまま名称を訂正し、recallRecord.generationを実際に改変する別ケースを追加した。同じ新規原本を読取専用で再利用し、再シミュレーションや上書きはしていない。

## 6. 容量・時間・メモリ

環境: Node v24.22.1、Linux x64、AMD EPYC 9V74。重い比較は逐次、workerはold-space512MiB・120秒、768MiB超で停止する研究予算。Safariの安全上限ではない。

同一入力・全sidecar・不変validatorで、A=従来decode/hydrate＋完全JSON直接比較、B=逐次直接比較を独立Nodeプロセス3組で測定。filesystem cacheは制御していない。正式cold復元ではない。

|最終版の比較工程|時間中央値（範囲）|process peak RSS中央値（範囲）|
|---|---:|---:|
|A 完全展開|734.6ms（687.1–875.2）|218.85MiB（218.50–219.18）|
|B 逐次|2,462.3ms（2,428.8–2,509.6）|160.02MiB（159.00–160.74）|

最終比較器`f3c994374c6ed5b31587b8f7e053a695d238ae63ba77049dca58cf9da0bf93cb`、計測runner`71bc9714dc5f54d0f566c5e8663089815e5744ddf86ec2f6014498069d2dd9ee`を用いた。コードcommitは`0fe93830045c98e4d9adf46deba8fe1b7f0420c1`。A/B/A/B/A/Bの順、各回新規Nodeプロセス、`--max-old-space-size=512`。同一のcandidate・独立原本・全sidecarを比較し、各回で一致を確認した。最終測定は`evidence/final-comparison.json`。旧`comparison.json`の修正前3組、途中の単回回帰は削除せず、最終値とは分けている。別entrypointの単回値は今回の効果判断に使わない。

**AとBの出力は同じではない。** Aは不変decodeでhydrate後のgameと全sidecarを返し、さらに全JSONを直接比較する。Bは同じ内容の一致結果を返すだけで、プレイ可能なgameを生成しない。以下の同一検査範囲に対する「照合の追加展開コスト」の比較であり、同じ復元処理の高速化や正式cold再開の比較ではない。

|検査・出力|A|B|
|---|---|---|
|構造・型・schema・ID・source・arrivals・townKeys|同じ不変validateCandidate|同じ不変validateCandidate|
|個別events/attempts/arrivals、順序・型、game＋全6sidecarの内容|hydrate後native全JSONを元raw入力と直接一致比較|schema行viewの逐次JSONを元raw入力と直接一致比較|
|独立candidate/input/gameアンカー|同じ値を検査|同じ値を検査|
|将来計算・正式replay|この計測では実施しない|この計測では実施しない|
|保持する戻り値|完全旧状態とsidecar|一致・件数・hash・時間等の結果のみ|

観測された比較工程のメモリ減少は約58.8MiB（26.9%）、時間は約3.35倍。この範囲では省メモリ効果があるが、通常の復元状態を得る費用とは異なり、準備工程を含むピークも残るため、実用化には不足と判定する。

|最終版の工程|A 中央値ms（範囲）|B 中央値ms（範囲）|
|---|---:|---:|
|candidate読込・parse|48.7（43.5–60.6）|46.1（44.4–46.9）|
|独立原本prehash|9.6（9.3–9.7）|9.3（8.8–9.8）|
|直接内容比較|94.4（93.0–122.1）|2191.5（2164.0–2218.9）|
|構造・参照・integrity・candidateアンカー検査|hydrate・game/inputアンカーと合算 560.0（516.4–660.6）|216.2（208.0–234.0）|

Aのdecode内部の構造検査、hydrate、アンカーを独立に分離した時間は未計測。不変codecを変更して計測境界を作ってはいない。Bはhydrateを行わず、内容比較時間に出力/game hash計算と読取が含まれる。全体時間には上記以外の計測・最終hash処理も含むため、列を単純に足した値とは異なる。Bで観測した最大出力片は1,358 UTF-16 units、参照bufferは64KiB。実装上の上限は16,384 unitsだが、validatorの巨大文字列・ID Map・索引・入力全保持までこのbuffer上限に含まれるわけではない。

入力読込後heap観測点の中央値はA 31.97MiB、B 31.95MiB。比較後heap観測点の中央値はA 86.45MiB、B 26.65MiB。 GC後保持量でもphase別最大でもなく、V8のGCタイミングに左右される。全ての観測点と範囲は機械可読ログに保持した。

準備工程は別プロセスで約655ms、peak RSS249.49MiB。読込・parse約153ms、game-only参照生成約89ms、encode約327ms、candidate文字列・アンカー約36ms。ここには元入力全体、clone、完全JSON生成が残る。比較だけ改善しても準備を含む全体ピークを解消していない。正式replayの費用を隠して比較時間に含めたとは扱わない。100年の正式replayは未実施。

candidate6,018,719 bytesは正式session完成容量ではない。内訳はactive1,710,116、events2,487,029、attempts1,780,999、arrivals索引40,245、townKeys182、その他148bytes。schemaはevents785/attempts132bytesで親内訳に含まれる。二世代候補の単純和12,037,438、三世代18,056,157bytes。元研究参照11,873,989bytesと任意game-only参照10,994,786bytesは別の準備領域。物理的な保存使用量、IndexedDB・localStorage容量は未測定。

## 7. 再現

```sh
node --test works/ambertime/tests/s3-d1-codec.test.mjs works/ambertime/tests/s3-d1-r-structure.test.mjs works/ambertime/tests/s3-stream-compare.test.mjs works/ambertime/design/s3-stream-compare/evidence/reviewer-adversarial.test.mjs
node --max-old-space-size=512 works/ambertime/design/s3-stream-compare/measure.mjs prepare /path/to/verified/wide-1200.research.json /separate/prepared-dir
node works/ambertime/design/s3-stream-compare/measure.mjs run /path/to/verified/wide-1200.research.json /separate/prepared-dir
node --max-old-space-size=512 works/ambertime/design/s3-stream-compare/measure.mjs game /path/to/verified/wide-1200.research.json /separate/prepared-dir
node --max-old-space-size=512 works/ambertime/design/s3-stream-compare/protect-v8.mjs /new/empty/isolated-directory
node --test works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/s3-save.test.mjs works/ambertime/tests/recall-save.test.mjs
```

prepareは既知SHA/長さ/件数を照合し、既存出力があれば同内容だけ認める。v8 runnerは既存原本を上書きしない。raw元入力から独立アンカーを準備する費用を測定外として隠さない。

## 8. 次に必要な最小確認

|未解決|解決と判断するための確認|
|---|---|
|比較が遅い|最終版3回比較でも約3.35倍。将来buffer集約を試すなら最大保持量を固定し、同じ拒否・内容反例と同条件反復で効果を確認|
|準備工程と入力parseがピークを支配|元入力保持、candidate生成、独立根拠準備を含む全体工程でpeakを測定し、負荷を他工程へ移しただけでないことを確認|
|独立既知入力がない通常保存|正式計算/replayへどの成分をどう照合するかを別途設計・承認。hashやcandidate自身の期待値で代替しない|
|完全状態は上限超過のまま|game9,808,696unitsに対する正式検証契約の変更を別判断。今回の比較器をformal validatorへ接続しない|
|原本保護・永続性|旧正常世代、候補、確定切替、容量不足、中断、破損、競合を実保存領域で別検証|
|D1残存条件|元の3方針×3境界、他seed等を条件別に確認。広域seed42の4種類を単純な4/9にしない|
|Safari|作者の実機で容量、プロセス終了後再開、メモリ、次月継続を測定。Node値に一律安全閾値を置かない|

本研究はここで区切る。マージ、Draft解除、Pages公開、D2正式実装をしない。最終のローカルScope/Risk/ImpactとGitHub exact-SHA結果はPRに対象SHA付きで記録し、上記内容試験や正式保存の保証と混同しない。

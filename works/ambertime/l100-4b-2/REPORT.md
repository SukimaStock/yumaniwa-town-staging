# AmberTime L100-4B-2 初回保存と検証済み状態の継承

## 総合判定：追加研究

安全に確認できたのは、正式再生で得た検証情報を同じプロセス内で引き継ぎ、新しい操作だけを検証して保存する範囲です。cold再開時に100年分の再生を省き、かつ既存の検証保証をそのまま維持する方法は、今回の自己hash付きcheckpointだけでは成立しませんでした。

最初の保存だけを見ると短くできますが、その前の正式admissionに全再生の費用が残ります。起動から初回保存までの実用的な高速化成功とは判定しません。安全性のgateを越えていないため、新しい12か月増分checkpoint更新へは進まず、ここで研究を区切りました。

Draft PR: https://github.com/SukimaStock/yumaniwa-town-staging/pull/839
正式導入・マージなし。Production、本編reader/validator、保存形式、上限、計算、乱数、歴史、回想、Canvas/UI、IndexedDB、プレイヤーデータの変更なし。

## 1 初回保存が遅い理由

正式モデルのcacheはmodule-privateです。正式readerまたはserializerが全操作を再生し、最終状態のJSON完全一致を確認した後に作ります。B1のcheckpoint復元はこのcacheへ検証情報を渡していません。このため、復元直後の最初のserializeで全再生が戻ります。その保存の読戻しと次の保存ではcacheを使い、新tailだけを再生できます。

cacheはseed、origin、操作prefixの完全なJSONと長さに結び付きます。stateとcontextをhashで認証するのではなく、外から書き込めないことと、正式再生によってだけ生成されることに安全性を依存しています。外部checkpointのraw cache setterを追加するだけでは、この保証を失います。

正式保存はgame検証、厳密なUTF-16上限、slots/ledger/history/recall検証、v8生成、正式readerによる読戻し、全体一致まで行います。今回これらは省略していません。

## 2 A〜Dの比較

|方式|信頼条件|全再生と費用|判断|
|---|---|---|---|
|A 現行正式保存|内部の正式再生cache。なければ元操作から再生|cold初回は全操作。次回はtail|基準として維持|
|B checkpointからcacheへ引継ぎ|作成時検証の来歴とstate/contextの結合が必要|証明できれば短縮候補|自己hashだけの取込は拒否。unsafe setterは作らない|
|C 検証済みprefix＋新tail|同じmanagerのprivate capability|最初に全再生。その後は今回の月次でtail1操作ずつ|live-processで成立。cold問題は未解決|
|D 独立した全操作再生|checkpointに頼らず元v8を正式再生|全再生費用が必要|強い照合基準だが高速化にはならない|

研究用managerは、固定SHAの正式model sourceに読取専用cache snapshotとapply回数計測だけを追加した独立moduleです。計算・validator・serializerの条件は変えていません。正式reader成功後にだけWeakMapのtokenを作り、state/contextはprivateなコピーとして保持します。JSON化・複製・別manager・自己申告receiptではtokenを復元できません。

このmanagerは既存のwarm cacheを包んだ研究用の保証確認器で、正式本編への新しい高速化提案ではありません。snapshotやコピーの追加費用もあります。初期admissionが終わった同じmanagerなら再admissionもcacheを使う場合があり、毎回独立full replayと称していません。cold測定は新しいNode processとmanagerで行いました。

## 3 実測

各欄は2回の平均（最小–最大）。

|方針|B1 cold復元|その後の初回正式保存|安全なfull admission|その後の初回保存|その後の2回目保存|
|---|---:|---:|---:|---:|---:|
|地元密着|1.119 (1.104–1.134)|50.383 (49.781–50.984)|49.085 (48.244–49.926)|0.746 (0.704–0.788)|0.742 (0.734–0.749)|
|混合|1.492 (1.372–1.612)|76.607 (75.165–78.049)|75.633 (74.579–76.687)|1.018 (0.996–1.040)|0.918 (0.910–0.927)|
|広域展開|1.869 (1.752–1.987)|102.634 (102.453–102.815)|101.943 (99.143–104.743)|1.053 (1.051–1.055)|1.151 (1.081–1.222)|

初回の月次操作も含めた内部区間合計：
- 地元密着: B1経路 51.581 (50.989–52.174)秒 / 安全admission経路 49.997 (49.110–50.885)秒。
- 混合: B1経路 78.199 (76.626–79.773)秒 / 安全admission経路 76.841 (75.804–77.878)秒。
- 広域展開: B1経路 104.599 (104.542–104.655)秒 / 安全admission経路 103.196 (100.386–106.006)秒。

安全経路のapply回数は、fresh admissionが各方針でそれぞれ 1544 / 1521 / 1551 回、その後の1回目・2回目の保存は各1回です。clone累積時間・回数と各月次、再読込の全数値はresults.jsonに記録。admission時のapplyには正式validation以外のcontext取得等が含まれ得るため、元操作数と同一視しません。

単位は秒、Node v24.22.1 / Linux。3方針×2方式×2回、計12の独立processを逐次実行しました。プロセス内で測った各区間であり、Node起動、静的module import、入力file IO、safe manager構築は含めません。OS file cacheは制御していません。初期の小規模回帰・独立レビューは共有host上で一部重なり、その他の外部負荷も排除していません。clone時間は処理区間に含まれるため加算しません。coldの正式readerとsame-processの再読込を区別しました。

初回保存時間の短縮だけで合格にしません。表のadmission費用を含めると全再生は残ります。checkpointの作成費用はB1の正式再生・context照合を再利用しており、今回のB1-fast起動値には含まれません。これを運用費用から消したとは扱いません。

## 4 正式状態とcontextの一致

3方針×2回の6組すべてで、元入力・初期session・初期context・1回目の正式v8・2回目の正式v8が一致しました。各組5比較、計30のdigest比較です。

各safe保存は正式serializer、正式reader、session完全一致を通っています。別processのB1復元から得た初期session/contextのdigest、および月次後の1回目・2回目の正式v8 bytesを比較しました。game/RNG/town/操作履歴/帳面/歩み/回想/世代情報を含む完全なsessionの比較です。入力のSHAと元bytesの保持も確認しています。

再読込は同じprocess内の正式readerです。この再読込値を独立cold再読込の時間と呼びません。新しいcheckpointを翌月用に永続更新する機構は実装していません。更新時間・容量は未測定であり、0秒・0byteではありません。

## 5 不正な信頼情報と失敗

研究用21テスト、独立レビュー8ケース、独立コピーにおける依存fingerprint変更後の4経路拒否を確認しました。既存formal-save/recall-save/codecの23回帰も成功しました。

- fake、clone、JSON化、Proxy、prototype経由、別managerのtokenを拒否。
- 自己hashを付けたreceipt、改変context、別fingerprint、別storage-generationを指定したreceiptをtokenとして拒否。
- 操作prefix改変、tail欠落・重複・順序変更、RNG・世代・sidecar・elapsed改変を拒否。
- gameの検証後にledger/history/recall/slotsで失敗しても新tokenを発行せず、次の不正cashを拒否し、正常retryは成功。
- 返したsessionやcontextのMap相当表現を変更してもprivateな状態は変わらない。
- 壊れたv8、旧v5、全候補不正は正常tokenを生成しない。正常な元v8なら正式readerで再admissionできる。
- 依存コード変更後にread/next/save/admitを拒否。

receiptを拒否した試験は、contextの全意味をhashから証明した試験ではありません。信頼情報を取り込む入口自体を閉じています。B1で受理された整合hash再計算済みcontext3件の旧証拠を、今回の「意味検証で検出」にすり替えていません。

古い正常tokenで別の正常branchを作ることはできます。これはstorage headやrevisionの競合防止ではありません。2タブ・永続保存・電源断・IndexedDBの原子性は今回未検証です。

## 6 contextの信頼条件

manualFills/manualBottlesは経験導入時の値や解放へ、manualSourcesは担当者・製法の由来と順序へ、nearbyCasksは予約する製法の停止点や樽種へ、nearbyProductsは近隣比較や販売factsへ影響します。今の終端sessionで使われない値もあります。

そのため、終端sessionが一致するだけではcontextの来歴は証明できません。checkpoint作成時の正式再生、読込時の構造・hash・結合確認、独立した全操作再生の保証を分ける必要があります。B1のようなself-hashed bundleは偶発破損に有効でも、hashを整合させた改変の作成者を認証しません。

また、正式cache.stateは操作境界であり、途中蒸留・試飲を反映した最終gameをそのまま代入できません。現行のpartial条件は維持しました。研究試作にcache setterはありません。

## 7 拡張しなかった試験と再利用した証拠

新方式による12か月増分checkpoint更新と9世代交代の再検証は実施していません。cold初回保存の安全な高速化gateを通っておらず、正式計算やcheckpoint経路の新たな採用もないためです。未実施を成功として数えません。

#837では12基準保存、9世代の交代と翌月、3方針×12か月の比較が成功しています。これを正式モデルの既存証拠として再利用しましたが、B2の永続cache継承や増分checkpoint更新の証拠ではありません。先行Draftは未マージのままです。

## 8 容量とメモリ

|方針|元v8 bytes|既存B1 checkpoint compact bytes|2か月後の正式UTF-16単位|B1後GC heap MiB|safe後GC heap MiB|
|---|---:|---:|---:|---:|---:|
|地元密着|3,467,349|4,256,776|3,812,791|115.75|193.08|
|混合|4,535,936|5,490,479|4,946,635|144.71|229.64|
|広域展開|5,282,030|6,499,321|5,848,547|167.21|256.23|

正式ゲーム状態上限は6,016,384 UTF-16コード単位未満のままです。v8ファイルbytes、研究checkpoint bytes、GC後heapは別に測りました。checkpointは元v8の代替ではなく、保持すれば容量を追加します。旧正常保存も別途必要です。町の記録が増え続ける問題や上限接近は解決していません。

safe測定のheapにはprivate tokenのsessionコピー等も含まれます。これはsnapshotを含む研究ハーネス全体の保持量であり、ゲーム単体のメモリ削減値ではありません。maxRSSはprocess全体の高水位で、JS heap peakの正確な値ではありません。ブラウザーquota、iPhone Safari、物理的永続性は測っていません。

## 9 4Cへの共通契約とfallback

元v8と独立した旧正常v8を保持すること。prefix長/digest、state、全context、RNG、collector位置、code/model fingerprint、checkpoint/tail、元v8識別を同じ来歴へ結び付けること。storage generation ID、単調なstorage revision、ゲーム世代、操作prefix長を混同しないこと。

候補の読戻しと正式検証が終わるまで旧正常世代を捨てず、head/revisionの比較と確定を原子的に行う必要があります。checkpointが不正なら候補全体を破棄して正常な元v8へ戻り、元v8も不正なら独立した旧正常v8を全体として検証します。全候補不正ならbytesを保護して停止し、新規ゲームを勝手に保存しません。正常な古いgameと新しいcollectorを混ぜません。

全origin保存消失を同じorigin内部の記録だけで初回起動と区別できるとは限りません。復旧元がなければ復旧不能です。4C-2の実ブラウザー保留は解除していません。

## 10 次段階への推奨

正式本編へ今回のwrapperやraw cache取込を導入しないことを推奨します。現在のprivate cacheはwarm保存をすでに短縮しています。

次に必要なのは、アプリ自身が正式検証して作ったcheckpointを、どの保存経路・改変モデルの下で次回も信頼するかという契約です。外部取込は必ず正式全再生へ戻す、code更新では失効する、保存世代と来歴を一緒に確定する等の条件が要ります。これは毎回独立再生する保証とは異なるため、正式導入前に保証差を明示して判断する必要があります。

checkpoint一般が不可能だという結論ではありません。今回の境界では、coldで検証来歴を安全に再構成する根拠が不足しています。速さのために保証を黙って下げず、この課題を残して研究を区切ります。

iPhone Safariは本研究の受入対象にできる正式実装がないため、現時点で人間に長時間の試験を依頼する必要はありません。将来正式候補ができた時、検証用コピーで「cold再開→1か月→自動保存→再起動→同一状態・履歴確認」と、隔離した保存失敗から旧正常保存へ戻る最小手順を行う必要があります。現行未導入の研究を実機成功として扱いません。

## 11 再現と証拠

base main: 6a1707c106afb4bf0658a274edf404bbc541de64。
先行#837 head: d674cb58b14ad1c7f45819694cd2367dfd11ccc8。
対象PR: #839。exact headとCIは同梱exact-head-ci.jsonを参照。

provenance.jsonに元入力SHA、source SHA、Node環境。results.jsonに全測定と比較。README.mdに実行コマンド。AUDIT.md/CONTRACT.mdに境界。REVIEW.mdとreview-results.jsonに独立レビュー。研究外の正式ファイルdiffはありません。

Plan Lock → Scope → Risk → Impactを確認。研究初期にコピー元のallowedPathが残ったローカル計画がScope Guardで拒否されたため、未公開branchを保管し、mainから正しい範囲のPlan Lockを先に作って研究ファイルを載せ直しました。最初の公開Draft #838ではlockと実装が同一commitだったためtrusted CIが拒否しました。正しいPlan-only→実装の新branchで #839へ置換し、#838を未マージで閉じました。force-pushも検査の弱体化も行っていません。

この報告の旧B1数値・12基準・9世代・12か月は再利用証拠、新しい計測・token拒否・正式保存比較は今回の証拠として区別しています。

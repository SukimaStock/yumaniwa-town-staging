判定：追加研究。正式導入・マージは行わない。
Draft PR: https://github.com/SukimaStock/yumaniwa-town-staging/pull/837
測定実装commit: 525594c75377dfbad42fbf145d4b57fb6ae62ea0

新規検証の集計
12基準＋9交代直前の21入力で、作成時の正式sessionと全再生contextが一致。12基準はディスク上checkpointから復元し、正式v8へ再保存したbytesが元入力と完全一致、その正式再読込も一致。9境界は交代と翌月の18比較・保存roundtripが一致。3方針×12か月＝36比較と保存roundtripが一致。いずれも入力不変。

3方針100年の独立cold測定（各2process、秒）
方針 | A正式reader 内部平均 | B12か月 内部平均 | A全process wall平均 | B全process wall平均

地元 | 52.764 | 1.196 | 53.145 | 1.614

混合 | 83.631 | 1.776 | 84.099 | 2.277

広域 | 108.880 | 2.122 | 109.348 | 2.618

内部時間はファイル読込・初期target展開・checkpoint読込/parseを除き、Bで再度実行する展開とfingerprint・tail・session検証を含む。全process wallはこれらと起動を含む。coldは新規Node/module cacheであり、OS file cacheを消去していない。表示・操作可能時刻やSafariの数値ではない。A/B各独立processのsession SHAが一致。Cは独立照合証拠であり、統合C経路の実測値ではない。

間隔別（秒・UTF-8 bytes。checkpoint envelopeはtail込み）
方針 | 間隔月 | tail操作数 | B内部平均秒 | compact checkpoint bytes | 元v8＋compact checkpoint bytes

地元 | 6 | 6 | 0.848 | 4266079 | 7733428

地元 | 12 | 13 | 1.196 | 4256776 | 7724125

地元 | 24 | 26 | 1.777 | 4226833 | 7694182

地元 | 60 | 69 | 6.955 | 4109136 | 7576485

混合 | 6 | 6 | 1.221 | 5516824 | 10052760

混合 | 12 | 12 | 1.776 | 5490479 | 10026415

混合 | 24 | 29 | 2.558 | 5424373 | 9960309

混合 | 60 | 73 | 14.708 | 5279481 | 9815417

広域 | 6 | 6 | 1.333 | 6532514 | 11814544

広域 | 12 | 17 | 2.122 | 6499321 | 11781351

広域 | 24 | 33 | 9.086 | 6462190 | 11744220

広域 | 60 | 69 | 12.156 | 6307675 | 11589705

上記容量は空白なしJSONの論理bytes。実際の研究ファイルは読みやすいindent付きで大きく、results.jsonのcheckpointFiles.bytesに実ファイル長を別記した。IndexedDBやブラウザー物理使用量ではない。tailはenvelope内に含むため総量へ二重加算しない。各間隔は目標月の6/12/24/60か月前に最初に到達する操作境界で捕捉した。100年ぴったりのzero-tailだけを計測していない。月間隔は操作数やclone量を厳密には制限しない。12か月を次段階の比較開始点とするが、正式の既定値にはしない。実運用で全checkpointを保持する設計は不採用。現在v8＋旧正常v8＋必要最小限の最新checkpointを保護し、候補作成中の追加容量も計上する。

作成費用（秒、並行作成ホストの診断値）
方針 | private-apply全再生 | 独立正式reader | 12か月checkpoint捕捉ms

地元 | 69.484 | 69.981 | 101.9

混合 | 110.560 | 104.674 | 111.7

広域 | 136.477 | 129.922 | 170.9

全再生中に複数間隔の候補を捕捉して作成費用を共有した。これらをcold時間から除外しており、100年間の全定期checkpoint更新コストを実測したわけではない。

clone・保持メモリ（各2試行の範囲、A/B12）
方針 | 方法 | clone回数 | clone時間秒 | GC後heap MiB | 生涯peakRSS MiB

地元 | A | [36046, 36046] | 41.82〜44.30 | 48.48〜48.49 | 397.93〜427.59

地元 | B12 | [1879, 1879] | 0.55〜0.55 | 49.96〜49.96 | 349.42〜350.55

混合 | A | [38494, 38494] | 67.86〜74.26 | 58.03〜58.03 | 489.30〜548.12

混合 | B12 | [2096, 2096] | 0.60〜0.97 | 61.37〜61.37 | 400.88〜405.66

広域 | A | [42236, 42236] | 89.78〜97.09 | 66.14〜66.15 | 588.18〜679.88

広域 | B12 | [2227, 2227] | 1.01〜1.09 | 69.96〜69.97 | 465.81〜473.01

clone時間はreplay内部の重複区間であり、総時間へ加算しない。JSONコピーはclone計測に含まない。peakRSSはJS heapの厳密ピークではない。GC後heapも入力v8・展開済みtarget・checkpoint・計測用参照を含むharness全体で、製品sessionだけの保持量ではない。詳細の工程別ms・ArrayBuffer等はresults.jsonとphasesのJSONに収録。

12基準データの確認
方針・年 | 全session/context一致 | disk checkpoint/正式wire/reload一致 | formal UTF-16 units

local 30 | 一致 | 一致 | 1663003

local 60 | 一致 | 一致 | 2631181

local 90 | 一致 | 一致 | 3500658

local 100 | 一致 | 一致 | 3806900

mixed 30 | 一致 | 一致 | 1830735

mixed 60 | 一致 | 一致 | 2917707

mixed 90 | 一致 | 一致 | 4425277

mixed 100 | 一致 | 一致 | 4938560

wide 30 | 一致 | 一致 | 2328417

wide 60 | 一致 | 一致 | 3737497

wide 90 | 一致 | 一致 | 5259993

wide 100 | 一致 | 一致 | 5838093

障害検証
通常破損・版/fingerprint/prefix/tail/世代/collector/revision不整合、旧正常のみ、全候補不正など16ケースをlocal30コピーで実施。拒否後は元sessionへ戻り、全不正は安全停止。最初のrngラベルはseed変更によるintegrity拒否で、実RNGとは区別する。別の独立semantic試験8ケース（実RNG含む）は5拒否・3未使用context受理であり、上記の保証制限を隠さない。
既存H1 checkpoint29件＋正式保存/codec/recall23件＝52件成功。これらは新規実行。先行H1の過去cold値は今回の測定値として転用していない。

再現・証拠
README.mdのcreate/cold/future/boundary/faultsを参照。元入力SHAはinputs.json、全checkpointファイルSHA/長さと全比較結果はresults.json、先行PR状態はpr-bases.json。追加consumerのroundtrip.mjs、phase計測、独立semantic/first-interaction probeを証拠ZIPへ同梱。生成済みcheckpointは研究用の副資料であり、正式保存ではない。元v8資料は変更しない。

AmberTime L100-4B-1：checkpoint検証保証・100年cold復元

対象
最新main 6a1707c106afb4bf0658a274edf404bbc541de64。
正式本編・保存形式・上限・乱数・履歴・Canvas・UIの変更なし。IndexedDBは実装・再試験せず。Draft PRのみ、マージ禁止。
実行環境：Linux / Node v24.22.1。iPhone Safari・実ブラウザーは今回の対象外・未検証。

今回の方式
元v8を完全保持し、gameの操作再生だけをcheckpoint＋tailで短縮した。帳面・歩み・回想・スロット等は同じ元v8の終端データを読み、既存readSessionの正式validatorで検証した。checkpoint単独からこれらを再構築したわけではない。元v8を失った場合、このcheckpointだけを復旧元として採用しない。

保証の区別
A：正式readerで全操作を独立再生する基準。
B：作成時の検証済みcheckpointを信頼し、読込時にSHA・版・モデル依存fingerprint・prefix・tail・世代・context・終端collector対応を照合する高速経路。
C：Bの候補と独立したAを別Nodeプロセスで比較。統合C起動経路の実装・直接計測ではなく、独立照合証拠。Bだけの時間でCも高速化したとはしない。
D：checkpoint不正時は元v8の正式再生へ戻り、それも不正なら独立した旧正常v8へ戻る。全候補不正なら停止。自動新規ゲーム・入力の修復・書換えなし。
Bの読込保証はA/Cの独立全再生保証と同じではない。SHAは偶発破損検出であり、全内容を一貫して改変できる攻撃者への認証ではない。

再利用した研究
H1-A2のpin固定private apply/emptyContext/initial/finalize、checkpoint・contextのencode/decodeを再利用。H1-A3の保守的依存fingerprintと、読込時のcreator trustを独立再生と区別する考え方を再利用した。現在のmainでモデルsource pinとcollector source pinsの一致を実確認。
H1-A2の最終状態依存projectionは作成時collectorの代替にしなかった。H1-A3のfuture-neutral online collectorは参照資料であり、今回のv8終端collectorを置き換えていない。
先行Draft #828/#831/#832/#833/#834/#835はすべてopen・未マージとして照合。研究ファイルのcherry-pickなし。正確なheadはpr-bases.jsonに収録。

容量と正式上限
正式ゲームは6,016,384 UTF-16コード単位未満のまま。checkpointによる高速化は、町のevents/arrivals/attemptsの成長や正式上限を解決しない。
元v8、checkpointとtail、複数世代分は別々の容量。保持するcheckpointを増やすほど容量が増える。索引再生成でevents欠落を復旧したとはしない。

4Cへの引継ぎ
原v8 bytesを保護し、保存generation ID・revision・v8 SHA・model fingerprint・prefix digest・checkpoint/tail hashを同一世代へ結び付ける。候補の読戻し・正式検証完了後だけheadを切り替え、独立した旧正常世代を残す。GC時はreaderと復旧元を保護する。容量不足なら新保存を安全に失敗させ、唯一の復旧元を先に削除しない。
保存世代が完全であることとcheckpointの状態が正しいことは別の保証。今回のrevisionは操作prefix長であり、将来の永続storage CAS revisionではない。
全同一origin保存消失は同じ領域だけで初回起動と区別できず、復旧元なしは復旧不能。IndexedDBのtransaction成功や物理電源断耐久を実証したとの主張はしない。

正式導入前の条件
creator trustの許容範囲、外部取込・コード更新時のinvalidate、正式モデルfingerprint、世代確定とGC、fallback時の表示を別段階で設計する。保守的な研究fingerprintをそのまま長期保存契約へ固定しない。原v8を省略するならprefix collectorからの継続保証を別途必要とする。
実機Safariの最小受入：コピーした100年v8で正常再開と翌月・保存・再読込を1巡、checkpoint破損時の元v8 fallback、復旧元も不正の場合の停止、メモリ圧迫下の応答性。これらは今回未検証で、人間の実機成功に読み替えない。

重要な追加発見
内外hashを一貫して再計算したcontext改変8件の独立試験では、実core RNG・trade RNG・必須map欠落・世代・月の5件を拒否し、正しい元sessionへfallbackできた。一方、manualFills、manualBottles、使われないnearbyProducts項目の3件は終端sessionが変わらず受理され、返されるcontextだけ変わった。これはBのcreator trustの限界である。全sessionのdigest比較だけではcontextの正当性は証明できず、Cには独立したcontext比較も必要。正常入力の作成時には全context照合を実施した。

また、元の正式保存・validate経路へcheckpointのcacheを接続していないため、最初の保存で全操作再生が復活する。地元100年の別プロセスで、研究復元1.529秒、翌月127msに対し、初回保存60.196秒、2回目保存653ms。初回保存は37,549回のclone、clone部分48.649秒（他の作成計測と並行した参考診断値）。地元30年でも同じ傾向を確認した。
したがって、起動経路の短縮を「保存・再開が通常と同じ軽さになった」とは評価できない。今回は追加研究で区切り、正式cacheやvalidatorの変更に無断拡張しない。

運用上まだ証明していない点
今回のcheckpointは完成した対象v8を再生し、過去の境界でstate/contextを捕捉した上で、その対象v8へ厳密に結び付ける方式。実際の100年間に定期checkpointを維持した計測ではない。翌月に元v8が変われば旧envelopeは拒否される。毎回全検証をし直さずprefix receiptと新tailを安全に更新する経路は今回実装していない。
12か月継続は復元後の正式ゲーム進行・正式保存roundtripの一致であり、12回の高速checkpoint更新を保証しない。次段階では正式保存に戻る負荷とともに、この更新契約を分離して検討する。

複数checkpointの容量
比較用に6/12/24/60か月の4候補を同時保持すると、元v8込みのcompact JSON論理量は地元20,326,173 bytes、混合26,247,093 bytes、広域31,083,730 bytes。これは比較用保持で、全履歴checkpointを保存する運用推奨ではない。保存候補・旧正常v8を加える場合はさらに増える。

今回新規の工程別診断（秒、独立した各1process）
方針 | session全体 | 正式replay apply | clone累積 | 展開ms | 履歴ms | 回想ms | 操作数
local | 51.436 | 51.204 | 42.040 | 65.1 | 3.1 | 11.2 | 1521
mixed | 78.720 | 78.456 | 66.878 | 52.2 | 4.4 | 20.5 | 1498
wide | 105.820 | 105.425 | 90.599 | 85.3 | 4.9 | 31.7 | 1528
上記は工程切り分け用の追加診断。clone・apply・restoreは包含する区間で、合算しない。全体を支配するのは正式操作再生と状態cloneで、parse/展開・帳面/歩み/回想の検証ではない。H1-C1の既に除去されたcask-serial lookup処理を現在の原因としていない。

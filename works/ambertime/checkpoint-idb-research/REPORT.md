# H1-A4 IndexedDB保存・復旧・保持の研究

正式本編・reader・保存形式・ユーザーの保存DB/key・ゲーム計算・C-3/D1.1/D1.2/H2-5・Productionは変更していない。研究用DB名を`ambertime-h1-a4-research-`に限定し、新しいローカルHTTP originと専用ブラウザprofileで実行した。研究用HTMLは自動実行しない内部テストfixtureであり、独立した作品や本編への保存導線は追加しない。

## 成立した研究契約

| 対象 | 実装・確認方法 |
|---|---|
| A | checkpoint/context/tail/collector/history/manifestを単一readwrite transactionで確定 |
| B | 不可視候補を準備した後、CAS付きtransactionでmanifestを切替。公開transactionでも全immutable部品を再配置 |
| C | Bと同じ原子公開に加え、旧正常commitへのprevious参照を保持 |
| 複数タブ | head IDと単調revisionを同一transactionで比較。rollbackでもrevisionを戻さずABAを拒否 |
| 読込 | headと参照部品を同一readonly transactionでsnapshot取得し、transaction外でhash検証 |
| 復旧 | latest→previous→known-good→保持された公開済commit順を検証。使えなければ元正式保存の全再生を要求 |
| rollback | 事前検証後、meta/commits/parts/historyをlockするtransaction内で全recordの同一性を再確認してCAS更新 |
| 歴史 | 分岐と歴史IDに結び付くhash indexを同じ公開transactionで確定。同じ分岐の同じ歴史IDの書換を拒否 |
| GC | 新commit確定後、同一transactionでrootと部品を照合し未参照の研究部品・古い日常commitを整理。中断はabort |

B/Cの候補準備と公開の間にGCが動いても、公開時の再配置で欠落した部品を再建する。rollback前にGCが対象を削除した場合は、旧対象を公開せず拒否する。この費用を省くためのpin方式は将来の比較対象であり、今回の安全確認を省略しない。

writerは保存成功時に得たID/revisionの組を一つのtokenとして保持する。診断用の`currentHead()`と`currentRevision()`を別々に読んで古い意図のrevisionだけを更新してはいけない。既存保存の実移行は行わない。

## 正常系・障害系

実Chromium 153で、A/B/C正常保存、書込前・checkpoint/context・manifest前の失敗、transaction abort、注入QuotaExceededError、旧commitの保持、孤立候補、GC中断、複数タブ競合、古いwriter、DB version更新のblocked/versionchange、再読込、別ブラウザプロセスからの再読込を検証した。

破損したlatest/previous、tail欠落、model不一致、異なるsource、境界不一致を拒否し、旧正常commitまたは元正式保存へ戻る。短い正式生成保存はブラウザ上でも本来の正式readerで全再生し、保存JSONが一致した。元backupまで無ければ停止し、初期化や新規ゲーム開始で隠さない。

H1-A3の3運営方針の実checkpoint/context/collector/tailと9回の全候補資料を使用した。元保存SHA、即時境界materialDigest、既存の全再生一致証拠をfixture作成時に照合し、IndexedDB往復とGC後の内容を完全比較する。候補・根拠・参照チェーン・境界・ordinal/replayOrdinal・seed・採用順・文章を含む全資料を保持し、採用21〜23場面だけに縮めない。ここで100年全再生を再度ブラウザで実行したとは主張しない。

## 保持数・容量

| 方針 | 5回保存後の保持commit | GC後の論理JSON容量（前P2修正測定） |
|---|---:|---:|
| A 最新のみ | 1 | 約6.96MB |
| B 最新2件 | 2 | 約13.18MB |
| C 最新2件＋世代記憶 | 2 | 約13.18MB |
| D 最新3件＋別known-good | 4 | 約25.62MB |

すべての案で3件の歴史資料とbackup markerが残った。B/Cの実容量が等しいのは、今回の研究ではA/Bでも歴史の削除を許可せず保守的に全歴史を保持するためである。DのN=3は比較用設定であり採用値ではない。未参照の歴史recordも今回のGCでは削除しないため、長期的なbounded容量を実装したことにはならない。

この表は物理IndexedDB使用量ではなく、`inspect()`したrecordをJSON化した論理容量である。100年の完全な元保存約4.26MB（地元）等は別途保持し、表のbackupは小さい試験markerである。元保存・移行前backup・新候補の同時保持、一時clone、IDB内部の書込増幅も必要で、表を正式保存の総容量と扱わない。

## 作成頻度と累積負荷

既存の世代/年次/64操作/128操作/推定64MiBの回数・tail・cold復元はH1-A3の記録を入力SHA付きで再利用した。年次または64操作のhybrid案は設計上のboundとして整理し、未実行の時刻を推定していない。操作数は内部distillStepの負荷を保証せず、容量proxyもCPU実測ではない。

実Chromiumで100回の作成・保存・読込・GCを行った。これは検証済み100年末の同じ大きさのpayloadに研究用cycle receiptを付けて反復する**合成IO負荷**であり、100年のゲームを逐年実行したものではない。

| phase | 100回の累積実測（前P2修正・fingerprint別） |
|---|---:|
| makeCommit/hash/clone | 15.938秒 |
| IndexedDB保存 | 27.721秒 |
| 読込・局所hash照合 | 9.303秒 |
| GC | 1.118秒 |

測定コードfingerprintは`476b8134f10c6ce0bdb4ef7865d29a5269cfd2ae8b9b10d99540171c2cbbf10d`。その後のP2で読込を単一readonly snapshotに変更し、保持commitの探索を増やした。上の値は修正前の測定としてそのまま保持し、現在版の値に再ラベルしない。修正後のprotocolと実資料往復は別fingerprintのブラウザ検証で確認する。100回の再計測は行わない。

sampleされたJS heap peakは約588MBだった。これはChromiumの`performance.memory`による観測で、process RSSやiPhoneの必要メモリではない。GC後の論理容量peakは13,177,588 bytes。candidate準備中やhash/clone中の瞬間peak、物理累積書込bytesは未計測。`navigator.storage.estimate()`も試験origin全体の概算であり、DB単体の物理容量ではない。

checkpointごとの独立完全再生を100回実行した費用は測っていない。H1-A3の独立全再生が約数十秒〜数分を要するため、それを全triggerに要求する設計は重い。作成経路を信頼する継続と、モデル変更・移行・異常・明示確認・実験的間隔での独立監査を分けて比較する。固定間隔は採用しない。

## 失敗・未検証の環境

- 128MiBのV8 heap上限では小条件が成功した一方、約26MBの実fixtureを渡すpipelineでrendererが実際にcrashした。通常heapの新プロセスで以前のcommitを読み出せた。入力転送・解析を含むどのphaseで落ちたかは確定せず、IDB transaction途中のcrash耐久性の証明とはしない。iPhoneのRAM上限の再現とも扱わない。
- Chromium CDPで別originのquota上限64KiBを表示させても、2MiBの非圧縮payload書込を拒否しなかった。**native quota超過は未検証**。注入QuotaExceededErrorの成功と分ける。
- 以前の試行では同じoriginでquota実験を行った後に正常headの消失を観測した。quota干渉は仮説であり原因を確定しない。quota実験を別originへ隔離した前P2最終測定では、100回維持後の再読込・別process復元が成功した。旧失敗結果は保持し最終成功へ混ぜない。
- WebKitはbinaryを取得したがhost依存library不足で実行できなかった。通常install-depsも失敗した。iPhone Safari実機、実ディスク枯渇、OS kill、物理電断、長期間のevictionは未確認。

DB名が別でもoriginのevictionは共有し得る。同じorigin内のbackupだけではorigin全体の消失から復旧できない。正式設計には元保存の外部backupと旧readerを必要とする。

## 信頼・再監査・正式導入

`trust.mjs`は局所破損、prefix対応、model/collector/creator依存の一致、移行/異常/明示確認、実験的監査budgetを別に判定する。保存した「全再生一致」flagやknown-good markerを読むだけで正当性を保証しない。自己hashを書き直せる主体に対する認証は無い。毎回の独立prefix全再生と同等の高速保証は未成立である。

正式導入には、新形式versionと旧reader維持、移行前の完全backup、同じ操作境界へのstate/context/tail/collector/history確定、commit検証状態、依存変更時の失効、独立再監査、fallbackとrollback、保持数とGC、安全な容量不足対応を要する。既存originを格納欄に転用せず、全操作prefixを削除しない。transactionの原子性と、transaction完了後の物理durabilityは別である。

H1-A5ではまず、大きいpayloadのclone/hash/転送を抑える構造とworker/分割処理を、iPhone Safari実機または利用可能なWebKit環境で検証する。単にworkerへ移すだけでprocess全体のメモリが減るとはしない。次にorigin lossを含む外部backup・再監査・正式導入契約を詰める。町の評判events/arrivalsの共有、attempts集約、live評判と歴史の分離は、ID・参照閉包・seen/pending・受領保存則・販売/評判/RNG同値を守る**独立研究**として扱う。checkpointだけで保存容量が減ったとはしない。

## 最終の現在版確認

P2修正後の現在版は実Chromium 153で42件すべて成功した。3実bundle/9境界を含む40既存protocolと、20回のread/publish/GC競合、A/B保持commit復旧を再検証した。現在版fingerprintは`cc4533ea5053651bae4075ec72023202831838054653cb5a20ce57efe65f8927`。100cycle性能・128MiB試験・quota観測は上記の前P2測定としてのみ保持する。Node研究31件成功、既存関連回帰108/109成功（既存R5固定hash1失敗）、最新baseでも同じ失敗を再現した。詳細と別provenanceの全値はresults.json。

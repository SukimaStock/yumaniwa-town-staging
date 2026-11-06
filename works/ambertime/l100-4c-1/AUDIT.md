# L100-4C-1 独立安全性監査

## 判定

隔離研究とDraft PRの公開を妨げる未解決の指摘はない。正式採用の承認ではなく、判定は「追加研究」が妥当。実装担当とは別のレビューで2件の欠陥を指摘し、修正を確認した。修正後のモデル試験を独立実行し53/53成功。実ブラウザー・物理永続性はこのレビューでも検証していない。

## 指摘と修正確認

1. **確定結果に他writerのtokenを混ぜる競合**。以前のsave/recoverはtransaction後に現在tokenを再取得していた。他writerが間に確定すると、古い状態と新しいrevisionが組み合わされ、後続保存が新しい進行を上書きできる。`generation-store.mjs:38–40,47–48`は成功transaction内で自分のhead/revisionを捕捉して返す形へ修正された。save/recover双方の返却前競合試験が成功し、返された古いtokenによる次保存は拒否された。
2. **全bundle取り違えの未検出**。以前はpublishedキーとmanifest.generationの対応が未検証だった。g1の保存欄へ正常g0 bundle全体を置くと、hashは正しくてもg1として採用され得た。`:27–28,37,46`で期待generation IDと一致確認する形へ修正。独立した同置換probeでg1をgeneration key mismatchとして拒否し、g0へfallbackすることを確認した。

上記3件の回帰追加後、`node --test works/ambertime/l100-4c-1/generation-store.test.mjs`は53成功、失敗0。テストのtransaction後競合はモデル上の注入であり、実IDBの別タブ試験ではない。

## 現行正式v8の保護と不足

- `development-save.mjs:14–38`は形式、正式復元、帳面・歩み・回想などを検証し、書込み前にも復元一致を確認する。
- `:41–46`は期待文字列確認、setItem、文字列読戻し。単一setItemと一連のget/check/set/readの原子性は別。後者を複数タブ間の原子CASとは評価しない。
- `shop-app.mjs:537–550`は保存失敗時にメモリ上の確定状態へ戻して進行停止。これは独立した永続旧保存の保証ではない。
- `:1426–1433`は破損した現保存を読めなければ停止。一方、現在キーと2旧キーが全部ない場合は新規開始して保存する。全消失と初回は区別できない。

## 試作の保証範囲

非公開候補、全byte読戻し、正式validator呼出し、候補の不変性再確認とhead/revision CAS、publishedだけからの復旧、単調revisionによるABA拒否を確認した。候補・公開・復旧途中の例外は旧recordsを削除しない。自動GCがないため「新候補失敗のため旧正常を削除」という経路はないが、容量は無制限に増える。このまま長期運用へ採用できない。

MemoryDriverのatomicは直列化とthrow時rollbackを定義したモデル。実IDBへの写像、transactionのライフサイクル、quota、ディスクへの永続化を証明するものではない。published順序やrevisionの検査は構造と安全整数の検査であり、整合したmetadata全体の置換・履歴並べ替えに対する認証ではない。hashも同様に認証ではない。次段階のdriverでは読み取ったmetadata・payloadのsnapshot一貫性を保持しなければならない。

`measure.mjs`のvalidator cacheは実際の正式readSessionを通過した完全一致文字列だけをprocess内で再利用する。永続フラグの信頼とは異なる。復旧byte一致を確認した後の公式reader再実行と翌月比較は、warm module cacheを含む。cold高速化や毎障害の独立全再生として報告していない点は適切。

## H1-A4からの引継ぎ

`checkpoint-idb-research/store.mjs:47–63`の同一transactionによるhead/revision更新、`:74–77`のhead＋参照部品のsnapshot読込、`:86–98`の復旧前検証後のtransaction内同一性再確認、`:100–118`のGCとwriter直列化を設計根拠として再利用できる。

既存REPORT.md:82のChromium42/42は過去の別source fingerprintの証拠であり、本試作の新規browser成功ではない。旧100cycle性能は修正前測定と明示されている。native quota、Safari、物理電断、長期eviction未確認を引き継ぐ。`trust.mjs:2–8`が区別する局所完全性と独立prefix全再生の保証を混同しない。

## 次段階の条件

- Cの実IDB driverを別段階で作り、読み取りsnapshot、CAS、確定応答token、版変更、実再起動、2接続競合を確認する。
- 旧正常＋現在＋新候補の一時3世代容量を見込む。空きを作るため最後の復旧元を消さない。
- GCには独立検証済み正常世代の保持を導入。単に直前を保持するだけでは直前が既に破損した場合に不足する。
- checkpointは保存世代の完全性とは別に、prefix/tail、model依存、正式状態・RNG・collectorの正当性を検証する。events欠落を派生arrivals索引の再生成で補えたとしない。
- 同一origin全消失では内部markerも失われる。復旧元なしなら復旧不能。独立バックアップは別段階の設計・許可で扱う。

監査範囲は読取、モデル試験、上記AUDIT文書のみ。正式コード・既存プレイヤー保存の変更なし。対象基準SHAと入力SHAはinputs.json、最終成果SHAはPRの検証記録を参照する。

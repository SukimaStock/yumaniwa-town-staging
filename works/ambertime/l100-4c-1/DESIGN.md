# L100-4C-1 保存世代・復旧契約

## 比較と選定

|方式|確定点・競合|旧正常保存|容量・複雑さ|判断|
|---|---|---|---|---|
|A 現行単一localStorage|setItem一回の原子性と、get/check/set/readの全体原子性は別。後者はCASでない|書込前失敗では残る。成功後破損は独立コピーなし|最小容量。同期I/O・正式replay費用は残る|基準。今回の復旧目的を満たさない|
|B localStorage二世代|複数キー更新にtransactionなし。manifest最終setだけでは競合防止にならない|正常G1/G2を残したG3候補には通常3世代一時領域が必要|容量不足時に旧保存を消して空きを作らない。Web Locks等の全writer協調が別途必要|100年データには非推奨。二世代が入るという証拠なし|
|C IDB世代管理|同一readwrite transactionでhead＋revisionを比較し更新。complete後さらにreadback/正式検証|候補を非公開で書き、readback＋正式検証後にhead確定。旧published保持|v8 bytesをそのまま1世代として保持。最も単純な移行候補|第一候補だが実ブラウザー未試験のため追加研究|
|D manifest＋分割|同じIDB内でimmutable parts＋manifest＋CAS。別媒体間の原子性は保証しない|全fragment/長さ/hash/世代を検証するまで旧保存維持|部分共有/GC/整合性が複雑。今回は単純UTF-16分割で重複削減なし|4B依存を整理。現段階はCを先行|

C/D試作はMemoryDriverによるtransaction契約モデル。**IndexedDB実装そのものの検証ではない。** H1-A4の既存IDB実装を設計根拠として読み、無変更で参照する。安全なブラウザー起動ができなかったため、新しい未検証IDB実装を追加して成果を水増ししない。

## 七段階

1. ゲーム側の正式v8 serializer/readerで候補を検証。新方式は保証を省略しない。
2. 候補IDは一意で再使用禁止。候補に入力時のhead/revisionを固定。
3. immutable候補を準備領域に書く。この時点では起動候補にしない。
4. 保存領域のsnapshotから読戻し、元bytesと完全一致を確認。
5. hash/構造/版/世代/長さだけでなく正式readerの保証を満たす。非同期検証中の競合を許容しても古い候補を採用しない。
6. transaction内で元head/revisionと候補bytes不変を再確認し、published追加・head更新・revision加算を原子的に確定。
7. 旧正常保存の整理は別設計。今回試作は自動GCなし。長期実用では無制限保持不可であり正式導入の未完了条件。

API成功、transaction complete、読戻し成功、正式検証成功、端末電源断後の物理永続性は別。commit後に例外/通信中断が起きれば結果は不確実。head/revisionを観測し、同じ保存を盲目的に再実行しない。

## 世代・完全性契約

- commit/generation ID: immutable候補のUUID。研究は同一IDを使用。正式設計ではゲームの世代交代番号と混同しない。
- revision: 保存・復旧head切替ごと単調増加する安全整数。rollbackでも戻さずABAを拒否。上限では停止。
- saveVersion=8、game model=20。model20は粗い識別子にすぎない。正式導入では依存source fingerprint＋reader versionを加え、同version下のコード差を検知する。
- 元v8文字列を変更せず保存。UTF-16 code units、UTF-8 bytes、hashを別項目にする。JSONエンベロープのescapingにより実装物の容量はraw bytesより増える。
- Dの各partはgeneration/index/長さ/hashを持つ。順序と個数もmanifestで固定。UTF-16分割境界にサロゲートが跨る場合、part hashは個別UTF-8変換だが全体source hash/unitsと正式byte完全一致も必須。UTF-8ストリームを連結した保存方式ではない。
- metadataの形状と安全整数は検証するが、publishedの時系列の認証ではない。整合した全metadataの悪意ある置換/並べ替えは検出保証の対象外。
- hashは偶発破損・取り違え検出。改ざん者がhashを再計算できるため認証ではない。正式readerによる全操作再生/collector検証を代替しない。
- RNG、正式状態、帳面、歩み、回想、町の記録は原v8に含む。独立のメタデータ値を正本にしない。入力SHAと復旧byte一致＋正式readerで守る。
- prepared orphanはpublishedが無ければ採用しない。head欠落でもpublishedが残れば検証し直して復旧。metadata自体の不整合は安全停止し、独断修復しない。
- 復旧はsnapshotで候補を検証し、head/revision/候補bytesをtransaction内で再確認。並行更新時は止めて再読込。元の破損データは変更せず診断材料として保持。

## 全消失

同一originのlocalStorage・IDB・markerが全部消えれば、同じorigin内だけで初回と履歴消失を区別することはできない。別storeのmarkerは部分消失の手掛かりにしかならず、全消失の証明ではない。復旧元のないデータは復旧不能。外部ファイル/別端末/サービスの独立バックアップは別許可・別設計。研究は空storeでsafe-stopし、新規ゲームの自動保存はしない。正式UIで「明示的新規開始」と「既存復旧」を分ける案は今回実装しない。

## 4Bとの接続

checkpoint作成時: 正式readerで操作prefixを再生し、正式状態・RNG・context・collector・世代境界を一致確認。元v8 bytesを保持する。作成レシートは認証ではない。
読込時: commit完全性、version/model fingerprint、source hash、prefix長/digest、tail start/end、collectorのnextIndex、RNG/世代を再確認する。読込時に局所整合性しか見ない高速経路の保証は全再生と同じではない。
モデル変更時: checkpointを黙って採用せず旧v8正式復元へfallback。checkpointが壊れても同世代の元v8が正式readerを通れば復旧可能。元v8/eventsまで壊れれば旧正常世代へ。
arrivals索引: events正本、全到達eventの順序・ID・添字から再生成。索引破損だけなら再生成可能。events欠落を索引から補って復旧扱いにしない。
checkpoint/tailの境界不一致は拒否。今回はcheckpointを試作に実装していないため、境界注入の新規実行証拠はない。H1-A4既存試験と区別する。
GC: 新headの読戻し/正式検証完了だけで古い全保存を消さない。少なくとも直前の独立検証済み完全世代を残し、読者snapshot・rollback・候補準備と直列化。容量不足では新保存失敗として停止し旧正常保存を守る。定期的な独立外部バックアップは別段階。

## 正式導入前の最小計画

1. Cのv8 bytesを保持するIDB adapterを別段階で実装。公式reader/writerは変更せず移行境界に接続。
2. 新隔離originで実Chromium/WebKitのquota・中断・2接続同時保存・再起動・読戻し・GC保護を行う。端末障害は別試験。
3. localStorage v8を読み取り、原bytesをIDBへ候補保存→正式検証→確定。旧localStorageを移行成功直後に削除しない。2系統を無条件にdual-writeしない。
4. bounded GCと旧正常世代pinningを設計・試験。3世代準備peakと実容量制限を測る。保存拒否時は旧正常維持。
5. iPhone Safariで保存/終了/再開/容量失敗/2タブ/旧正常復旧の最小受入。その結果まで正式導入しない。
6. DとcheckpointはCの復旧契約が成立してから。形式・上限・計算を変える案は独立判断。

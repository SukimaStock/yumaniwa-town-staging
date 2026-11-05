# H1-B1 events / arrivals 依存監査

基準 `fcc14b249733b6cccd598bcd2e567e64848bcd7f`。本編コードの変更はない。現行town-main外部接続モデルと、旧Lab/履歴研究を区別した。

## 重複ができる理由

`experiments/town-simulation/v01/model.mjs:36` の `event()` は全イベントを `events` に追加し、IDを `e+(events.length+1)` で採番する。`:130–139` の `arrive()` は、その返り値と同じオブジェクトを `arrivals` にも追加する。実行中は一つのイベント実体を用途別の二配列から参照するが、JSONは参照共有を表せないため同じpayloadが二度出力される。全時系列と到達専用一覧を使い分ける構造はコードから確認できる。過去の作者の意図までは断定しない。

現行モデルにはarrivalを追加する別経路、arrivalsの削除・並べ替えはない。したがって現行生成の標準形は `events.filter(e=>e.type==='arrival')` と同じ内容・順序。ただし旧保存や不正データまで同じと仮定せず、全変換入力で厳密一致を確認し、例外を拒否する。

## 利用先

| 利用先 | 根拠 | 保護条件 |
|---|---|---|
| 到達生成 | town model130–139 | seenによる二重到達抑止、nodes更新、event追加、react、packet生成の順序を維持 |
| ID | town model36 | eventsの件数・順序・全実体を変えない。arrivals省略をevents削除へ拡張しない |
| 将来評判 | town model141–176,178–191 | reactionは到達したeとnodes/release、pending/packets/seenを使う。既存arrivals一覧から将来抽選はしない |
| 数値正規化 | town model275–277 | nodes/events/arrivals等を再帰走査。展開前のID配列を本来モデルへ渡してはいけない |
| 月次/発送の接続 | partner-orders170–179、town-connection14–29 | 実瓶詰め・実納品・自家販売の受領を既存APIで反映。receipt重複はno-op |
| 地図 | world-map-view9–23 | arrivalオブジェクトのto/channelが必要。direct到達は地図段階に使わないが、保存から削除する理由にはならない |
| 海外初到達/旧Lab出力 | town model194–213 | arrivalsのfind順と全到達件数、events全件の出力を維持 |
| 一般ニュース | player-news34–35、town model newsEvents | 主にeventsを参照。sourceIdの先行参照を保護 |
| 旧H0の履歴 | history-lab/analysis55–65,143 | arrivalsの差分slice・件数・順序を使用。復元後の完全配列が必要 |
| H2-5 raw回想 | memory-lab/connections59–85、chronicle-lab/facts-generate24–27,89–97 | eventsの追加差分から全raw事実とtownOrdinal、sourceChainを生成。候補だけ残す方式ではない |
| C-3/境界回想 | chronicle-lab/recall-boundary、facts-compact、edition-d | raw境界で切り、sourceChainとordinal/replayOrdinalを保護。到達実体をeventsから参照可能にする |
| 正式validation/reader | partner-orders1302–1333 | 全操作の再生後JSON文字列一致。compact状態を直接渡すと不一致。先に完全な正式状態へ展開する |

旧評判v04/v05のarrivalsは独自モデルの別形式（receipt等を持つ）。今回のtown-main変換対象へ含めない。旧shop-expansion v01/v02も到達first/findやexportでarrivalsを参照するが、正式mainの計算を変更しない本研究のwire変換を展開すれば従来通り読める。

## A / B / C の安全境界

Aは完全二重JSON。Bはイベント本体をeventsに残し、到達ID一覧を保存する。順序を明示保持できるが、重複ID・欠落ID・arrival以外のIDを拒否し、mapを一度作って復元する必要がある。Cは到達一覧をwireから省き、読込時にeventsを一度filterする。標準形の到達一覧が完全に派生する入力だけを受け付ける。各利用先で毎回全走査させず、読込時に従来配列へ戻すのが最小の比較案。

復元したarrivalsは各eventのJSON相当の複製にする。これにより元JSONをparseした時の独立オブジェクト構造と一致させる。参照共有自体を新しいruntime契約として持ち込まない。eventsの全項目・順序、sourceId、pending、packets、seen、attemptsは無変更。

## 正式導入の最小案と互換性

研究codecは正式保存形式でも正式readerでもない。採用判断後の別依頼では、保存envelopeのversionを明示し、読込時に完全状態へ展開して既存正式readerを呼ぶ。既存完全保存も従来経路で読む。新compact文字列を旧readerへ渡せないため、版識別・変換前backup・変換後の完全再展開一致・失敗時に元保存を残す契約が必要。現在の本編keyを研究で上書きしない。

Cが標準形全件で安全かつ十分な余裕を与える場合、attemptsの集約やDB移行を追加研究の前提にする必要はない。100年の容量余裕・実機・origin全体の使用量・旧版互換性を別々に判定する。

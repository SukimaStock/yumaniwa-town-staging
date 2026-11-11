# 第3段階 地図選択の販売室反映（部分実装）

基準main: `ebc507df0ece98dadab0673e9d27e39a69424467`。
Plan Lock: `.change-plans/ambertime-night-stage3-map-privacy-20261111/r0.lock.json`。
Staging専用。第1・2段階との統合前の独立Draft候補。Production対象外。

## 実装

- 地図で店舗を選んでも、同じ地図レイヤーの他の取引可能店舗を販売室から隠さない。
- 選択店舗の既存「店情報」操作を枠・背景と `aria-current` で強調する。
- 選択だけを変更しても描画を更新する。手元の瓶の選択・店舗順・予約と取消・確定納品の操作は維持する。
- 店舗がない広域レイヤーの既存の最寄り取引範囲への補完は維持。専用企画のデパートを通常棚へ増やさない。
- 正式モデル、保存形式、操作opcode、現金・在庫・売上・関係・申し出は変更していない。
- `shop-app.mjs` と `index.html` はキャッシュ参照更新だけ。診断には固定値 `mapSelection=night-stage3` のみを許可し、任意の値は引き続き除外する。
- 初回scopeでキャッシュURLの診断識別が不足すると分かったため、そのbranchは未統合のまま残し、mainから診断moduleを含めた新しいr0 lockを実装前に固定し直した。

## 検証

既存基準の監査（shop-flow、stockists、regional-partners、map-partners、map-partner-ui）: 67/67 PASS。
変更後のmap-partners、map-partner-ui、market-ui-main: 42/42 PASS（約11.2秒）。診断の固定URLと任意値除外のprivacy回帰を加えた最終4ファイル: 55/55 PASS（約13.8秒）。選択店舗の切替、自家販売の選択、町の概要レイヤー、他店舗保持、cold保存同値性、納品保存失敗を含む。
`formal-copy`・`market-rules-ui`を含む要求された関連5ファイル: 55件、51成功、4失敗。4件は基準mainでも再現する既存のソース文字列期待値差。期待値の弱化はしていない。
Scope → Risk → Impact: PASS。変更した実行moduleの `node --check`: PASS。

ブラウザーを実行したがChromium起動時に `socket() failed: Operation not permitted`（process_singleton_posix.cc）で停止し、ページへ到達していない。
実ブラウザーの表示・タッチ・スクロール・iPhone SafariはUNVERIFIED。
100年保存・復元と性能計測は今回の部分UI変更では未実施。過去結果で合格扱いしない。

## 未実装：町の酒屋の「申し出あり」を押せない原因

`shop.offer` と `shop.pendingOffers` は既存の単一の応答順を持つ。店舗ごとに未回答は最大1件だが、`stockistOffer()`は現在の先頭しか操作対象として認めない。店舗画面は待機中の申し出を無効にし、「先の申し出を確認」と表示する。地域窓口の申し出は別の独立した仕組み。

既存で成立している条件:

- 普通の店舗の生成は店舗ごとの既存申し出を検出し、重複を作らない。
- 普通の店舗の辞退は対象店・銘柄の12か月の再申し出間隔を設定し、評判や他店舗の関係を下げない。
- 世界窓口は各窓口の未回答・cursorを独立して保持し、保留が他窓口を妨げない。

次の最小設計案（本PRでは実装しない）:

1. 正確な `shopId` と `offerId` で待機中の申し出を選び、先頭と入れ替える新しい明示的操作opcodeを追加する。
2. 以前の先頭は消さず待機列へ残す。選択操作だけでは在庫・現金・関係・notifiedを変えない。
3. 選択後に既存のnotice/accept/declineを使う。旧opcodeの意味は変えず、旧v8の厳密な操作再生を保つ。
4. UIは店舗ごとに操作可能にする。自動表示は後続が連続して飛び出さないよう、表示した事実と新しい自動表示機会をUI側で制御する。未表示の申し出を黙ってnotifiedにしない。
5. 旧セーブの先頭・待機中・notified混在、選択→保留→他店舗応答、古いボタン、保存失敗、cold復元、改ざん拒否を検証する。

店舗メッセージからの地図レイヤー選択は第1段階の通知導線との統合で確認する。この部分Draftには重複実装しない。

## 前段階後の統合と作者確認への引継ぎ

作者の「私が確認しますのでマージしてください」により、ブラウザー/iPhone確認を作者へ引き継いでStaging統合する。未確認をPASSとしない。

baseはStage1/2統合済み637ac0bc09521aef3dab15382fc51856e34b1e33。fresh Plan `.change-plans/ambertime-night-stage3-integration-20261111/r0.lock.json` を実装適用前に固定。旧PR922は旧base候補として保持する。

index/appのcache競合はnight=stage1とassignment=night-stage2-v01を保持しmapSelectionを追加。market-ui/CSSではStage1の数量右側deltaを残して同レイヤー表示と選択強調を追加。正式モデルの変更なし。

統合回帰77/77成功。Scope→Risk→Impact、syntax/diff-check成功。申し出キューの操作制約・連続通知は今回も未修正であり、第3段階全体の完了とはしない。Production対象外。

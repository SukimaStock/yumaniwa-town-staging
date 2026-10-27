# AmberTime — 14項目の表示修正と既存条件監査

基準 main `9912a48c755174fe309eb2b17194609e1bc17c77`（PR #645）。14項目の症状を基準に局所修正した。共有実機画像はこの実行環境では直接参照できなかったため、依頼で許可された症状と同じ場面を、同じ正規モデル状態で基準checkoutと変更後に表示した。Production・旧版・既存Labは変更しない。

## 14項目の状態

| No. | 状態 | 内容 |
|---|---|---|
| 1 | 修正 | たる詰めボタンだけを既存蒸留ボタンと同じ実glyph上下境界で中央へ。枠・サイズ・hitboxは不変。 |
| 2 | 監査のみ | 82/99・87/99は停止進行位置。現在の開始〜終了範囲と旧製法の正規化は異なる。採取範囲の保存・再現・帳面・比較は変更しない。 |
| 3 | 修正 | 初回ブランド確認後の「設定を直す」を「やり直す」へ。操作は不変。 |
| 4 | 修正 | 価格を閉じた状態でも現設定価格を一行表示。低め・ふつう・高めは既存details内、既存価格操作の再描画で即更新。 |
| 5 | 条件不適合・保留 | firstSaleは実売・店舗納品を保証するが「町に届いた」とは断定できないため、指定の町到達文へは変更しない。到達判定・地図解放は不変。 |
| 6 | 修正 | 数量だけ右へ4 CSS px。論理座標は4/scale、実描画でも3幅すべて4.0px。瓶と棚の座標・sizeは不変。 |
| 7 | 修正 | 空貯蔵庫の「蒸留室」をNo.1と同じ実glyph中央へ。 |
| 8 | 修正 | countdownの前景位置・size・タイミングは不変。既存Misakiの物理整数1dot分だけ右下へ影を描く。ぼかし・新時計なし。 |
| 9 | 修正 | 完全なnative発売列が確認できる場合、ブランド内の発売順で「AmberTime 第3回 完売」形式へ。内部発売IDを回数に使わない。欠落した旧記録は実IDfallback、同名別ブランドはブランドIDも保持。保存本文は変更しない。 |
| 10 | 修正 | 旧inline物体用の `.objects::after` 地面線が、overlayのstatic物体からhero下端へアンカーして「▼ 前回」に重なっていた。現roomでこの不要pseudoだけを除去。風味バー・前回marker・数値・区切り罫線は維持。 |
| 11 | 修正 | 確定結果を「これで決める／戻る」の下へ。結果文のsize・成功保存境界・aria-live・240ms反応は不変。確定ボタンにあったfocusはpreventScrollで戻す。 |
| 12 | 監査＋表示修正 | 「熟成［入力］か月以上になったら／ビン詰め［入力］本」。在庫連動は実際の計算に合わせ「販売登録済みのビンが［入力］本以下になったら」。自家販売枠だけの数ではない。「ふつうの価格で販売開始」は誤説明なので「ふつうの価格でビン詰め。行き先はあとで配分」へ。保存後の短い共通設定概要も同じ語義に揃えた。条件・予約snapshot・価格・自動処理は不変。 |
| 13 | 監査のみ | スーパーは最低10本・月上限20本・熟成12か月以上。条件を満たすブランドの需要・商品lotから、確保・自家販売分を除いた手元から自動発送。初回手動への統合は別の保存・月需要・二重発送設計が必要。配送は変更しない。 |
| 14 | 修正・入口例外あり | 未配分の初期状態は分け直す無効、仮置きで有効、取消で初期へ戻る／分け直し直後は無効。既存retailがある初期状態は、手元0でも回収できる唯一の入口なので有効を維持する。 |

No.2・5・12・13の経路・条件・問題がなかった点・今後の設計論点は [監査](SEMANTICS.md) に記録した。No.5で「町に」を足すには、どの実績を町への到達として表示するか別途決める必要がある。今回は宛先を捏造していない。

## 同じ場面の比較

390px、deviceScaleFactor3、基準と変更後で同じ正規操作による状態を使用した。

| 場面 | 変更前 | 変更後 |
|---|---|---|
| たる詰め | [画像](before/fill-ready-390.png) | [画像](after/fill-ready-390.png) |
| 空貯蔵庫 | [画像](before/empty-cellar-390.png) | [画像](after/empty-cellar-390.png) |
| countdown | [画像](before/countdown-390.png) | [画像](after/countdown-390.png) |
| ブランド確認 | [画像](before/brand-confirmed-390.png) | [画像](after/brand-confirmed-390.png) |
| 販売棚 | [画像](before/shelf-390.png) | [画像](after/shelf-390.png) |
| 価格を閉じた状態 | [画像](before/price-closed-390.png) | [画像](after/price-closed-390.png) |
| 配分確定 | [画像](before/allocation-saved-390.png) | [画像](after/allocation-saved-390.png) |
| 前回試飲 | [画像](before/tasting-previous-390.png) | [画像](after/tasting-previous-390.png) |
| 在庫連動 | [画像](before/bottling-stock-390.png) | [画像](after/bottling-stock-390.png) |
| 時期指定 | [画像](before/bottling-age-390.png) | [画像](after/bottling-age-390.png) |

[配分360px](after/allocation-saved-360.png)・[375px](after/allocation-saved-375.png)でも結果をfooter内に表示し、画面外・横はみ出し・button文字あふれなし。結果表示のためのscrollは行わない。閉じる操作・入力・配分を妨げない。priceの現値もdetailsの外で読める。

## 関連確認と保護境界

関連unit **60/60成功**。完売のブランド内順・同名ブランド・疎な旧発売IDfallback、分け直しの無効化と既存retail例外、既存配分model/save/draft、source/price/accessibility、変更helperのcache参照を確認した。既存cache固定テストは実際に変えた参照先だけ更新し、保存・計算の保証は維持した。

限定browserは変更後360/375/390pxの30場面、基準も同じ30場面を測定。JS例外0、画面外・横overflow・button文字overflowなし。Canvas64物理pxとDOM64/3 CSS pxの単一Misakiを保持。数量の移動を実fillText座標で3幅とも4.0 CSS pxと測定し、瓶bounds完全一致を確認した。[pixel比較](pixel-comparison.json)、[変更後結果](after/browser-results.json)、[基準結果](before/browser-results.json)。画像のNo.10細線消失・罫線と前回バー維持、No.11下配置、No.12入力の読み順を目視した。

価格変更・仮置き・ひとつ戻す・全部分け直す・取消相当の初期復帰・既存retail全数から手元への回収入口・保存成功・quota失敗時のgame/保存不変と成功文なしを確認した。確定後のfocusはconfirmに維持し、結果がボタンより下かつ844px内に収まることを確認した。包括E2Eは行っていない。

再現: `node works/ambertime/design/visual-14/browser.cjs`。基準比較は `BASELINE=1 SOURCE_ROOT=<9912a48c checkout>`、公開版は `BASE_URL=https://sukimastock.github.io/yumaniwa-town-staging/`。`WIDTHS=390` で公開基本確認を限定できる。

配分・retail月次・手動納品・店条件・スーパー／デパート・風味・熟成・ビン詰めの計算、正式save・旧save・操作履歴・時計・Canvas layout/hitbox・単一fontの計算は未変更。表現監査6点を確認し、保存済み文章・客や店の台詞・新規popup・新機能・対象外の装飾を足していない。

## 店ごとの役割

| 店 | 現在の役割 | 今回の扱い |
|---|---|---|
| 町の酒店 | 本人が発売回と数量を選んで届ける。配分の仮置きと実納品は別。 | 手動納品を維持。 |
| スーパー | ブランド関係・月需要・熟成・最低lotを満たす商品を、手元から継続自動発送する。 | 初回だけ手動にする案は未実装。初回済みの保存、月上限、後続の別発売回への切替を先に設計する必要がある。 |
| デパート | 企画の選定と承認に基づく5本の納品。承認分は先に確保し、翌月納品の条件を維持する。 | 配分UIへ無条件に統合せず、既存の企画・確保・承認経路を維持。 |

単一の「店へ置く」操作に揃えるだけでは、店舗ごとの最低lot・月需要・確保・承認を満たせない。今回の表示修正から切り離した設計課題として残す。

## CI・公開と未確認

Scope→Risk→Impactはlocal実装commitで成功。独立reviewは重大な指摘なし。remoteには事前Lockのみを登録した。実装blobの登録中、shop-app.mjsの全file内容に対する自動承認レビューが「core appの保存・状態・操作ロジックを含む大きな置換で表示限定範囲を越える危険」として拒否したため、実装の外部登録・PR・CI・Staging公開は完了していない。拒否されたactionを別APIで迂回せず停止し、local差分と比較証拠を保持した。必須CI・公開版確認は未実施。Change Verificationの正式状態は契約どおりUNVERIFIED。実機Safari・VoiceOver・実指での手触りは未確認。CIやChromium結果を実機確認やProduction公開の証明として扱わない。

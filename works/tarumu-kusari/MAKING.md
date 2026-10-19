# たるむ鎖 — 2026-10-19

選択B（19:28 UTC）。狙いは、端の遊びが順に消えて、先の重りへ力が届く境目。七つの輪を独自SVGで描画し、一本指・マウスで下に引く。上へ戻せば重りはその場に残り、鎖がたるむ。↺で最初の位置へ戻る。

できたこと：各輪の遊び14×7を順に使い、全98を消費した超過分だけ重りが動く。指に即時追従し、静止時に自動で動かない。面白さの仮説は、途中まで空振りだった操作が重りの移動へ切り替わること。作者の実指評価はまだない。

想定との差：厳密な剛体鎖ではなく一次元の遊びを輪の重なり・傾きに写すモデル。横には引けず、重りの移動距離は62 viewBox単位まで。何度も引くと端に達するため↺で戻す。次に試すなら張った直後のわずかな抵抗差。ただし今回は追加せず、触感の採否を待つ。

表現監査6点：画面は物体、LAB戻り、リセットのみ。題名はdocument title、説明はmetaと支援技術用ラベル。詩的コピー・副題・スコア・音・説明カードなし。キーボード矢印、PageUp/Down、Home/End、フォーカス表示を維持。

検証：Chromium 390×844（touch emulation）/1100×760。手前からの遊び消費、張力閾値、重り静止、逆戻し、画面外解放、初期化、一指CDP touch/cancel、keyboard、blur、resize/reload、reduced-motion、横あふれなし、pageerrorなし。Lifecycle checkと関連24 tests成功。tests/browser.cjsはローカルサーバー8765で再現でき、TARUMU_URLで入口を指定可能。全作品・大量サイズ検査は行っていない。

実機Safari/iPhone/iPad、作者の触感判断、公開URLは未確認。formal verificationStateはUNVERIFIED。Production・共有Engine・既存作品・町の画面/登録・保存は無変更。LAB Prototype Benchは既存generatorで接続。

再開：既存branch/PRのheadとCIを照合し、制作をやり直さない。GitHub CLIはREST/GraphQLともForbidden。接続ツールで履歴照合は成功。最初のbranch名衝突でwork branchに空Lock commit 5654ed4ができたが未push・未使用。新しいbranchをbaseから作り、正式Lockを単独初回commitしてから実装した。

独立レビュー：実装blockerなし。stop時の接触halo解除をイベント任せにせず明示化。別作品のmain更新を検知し、対象・共有依存に変更がないことを確認。fresh r0 Lockの新branchへレビュー済み実装を移送（旧Lockの書換えなし）。

# 一滴を落とす

- 狙い：頭を押す量と水滴のふくらみを結び、つながった水がぷつんと離れる瞬間を触る。
- 出来たこと：押し込み・途中戻し・くびれ・一滴の落下・皿の波紋。緩めて繰り返し。Pointer Eventsと矢印キー/Space/Enter/Home/End。無音・保存なし。
- 想定との差：流体計算はせず、滴の形と短い応答遅れを組み合わせた。切離し寸前は緩めても慣性で離れることがある。一押しで一滴とし、押しっぱなしで流れ続けない。
- 面白さ：押している途中の量と、最後の一瞬で形がほどける速さの違い。
- 次の可能性：実指で押し幅と切離しの時間を評価し、滴の重さが伝わるか調整する。現時点で追加仕様は採用しない。

## 計画と範囲

2026-11-02本人選択A、親thread 01a18d9e-0287-7023-9c10-b7a4d0cc600fの制作委任。
Base bbdd8865d65918602ee16186f5f759363c5c71b1。事前Lock-only commit 7f1257b5、digest 65f3aee00b64782183431bf5548770bb3b19923d516d846b915708cdaa51dbfb。
独立works/one-drop、active台帳1項目、既存Prototype Bench生成カード、Plan Lockのみ。町登録・既存作品・Engine・Production・保存・外部権限は不変。
.agents/skillsは対象workspaceに存在しなかった。最新mainのAGENTS/OPERATIONS/Change OS/表現監査を適用。

## 検証

モデル5件、Lifecycle 24件と--check、Scope→Risk→Impact成功。
独立read-onlyレビューで重大指摘なし。390×844の画面を実際に確認。
ブラウザー検証の初回はblur後のaria更新を次frameまで待たないテストで失敗。内部targetは同期解除されており、表示を待つテストへ修正。実装の解除方式は変更していない。タッチ検証でSVGのg要素だけではブラウザーのスクロール判定を抑えきれずpointercancelになる問題を発見し、SVG全体へtouch-action:noneを指定（仮説→修正→同じCDP検証）。
表現監査6点：必要な操作案内一行、操作部のaccessible labelとSEO情報のみ。副題・感情・教訓・説明カード・スコアなし。
iPhone/iPad実機・Safari・作者の触感採否は未確認。verificationState=UNVERIFIED。
キーボード切替前の検査は、頭が戻って再充填される250msを待つよう修正。LAB経由は研究所全体→Prototype Bench→作品→ブラウザー戻るの実際の経路で確認する。
CI/Pages・公開URLの確認はPRのexact SHA結果を別記する。

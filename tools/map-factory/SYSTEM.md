# Yumaniwa Map Factory System

Map Factory は「良い画像」ではなく「良い画像を再現できる作り方」を保存する。

## 4 layers
- Master: 世界観・媒体・密度・構図の骨格
- Strategy: 生成方法。Alley Shop の標準は Double Variation
- Category Recipe: 店種ごとの差分
- Result / Evaluation: Draft / Good / Reference と成功理由

## Alley Shop rule
- 初手は Double Variation
- 同カテゴリを2案並べる
- 完全コピーにせず、小さな差だけ許す
- 最初の再現性テストでは参考画像を使わない
- 構造は固定し、Shop type / Main color / Sign / Lighting / Props / Manual Adjustmentだけ差し替える
- 1カテゴリだけの問題ではMasterを変えない
- 複数カテゴリで同じズレが出た時だけMasterを改訂する

## Validation
2026-09-22:
- Craft Cola: Reference
- Kissaten: Reference
- Curry: Good / third successful category

3カテゴリで成立したため Alley Shop / Double Variation v1 を標準Strategyとして扱う。

## Evaluation
- 統一感
- 灯串らしさ
- ドット絵感
- 情報量
- 比較しやすさ
- 次回も残す点
- 次回直す点

## Extension
新しい店種は playbook.js の categoryPresets に追加する。
Masterは共通、StrategyはDouble Variationを基本とし、店種差はCategory Recipeに閉じ込める。

次の候補は EXHIBIT_OBJECT。SteamClock / DotWeather / CoffeeFactory / Diorama Calendar を町の物理的な展示物に翻訳し、Double Variationが転用できるか検証する。

## Repository
Map Factory の変更はまず yumaniwa-town-staging で検証する。
Production への反映は明示的な確認後に行う。

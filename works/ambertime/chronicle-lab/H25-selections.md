# H2-5 9境界の選出差分

候補全IDは再実行の比較JSONに含まれる。ここでは選出順と根拠IDを記録する。

## 地元密着・第1回交代

現行

bottling:1 → shop-start:town-liquor:1 → delivery:1 → sale:retail:63:26 → bottling:9 → bottling:11 → arrival:e768 → inquiry:e783 → visit:e980 → delivery:29 → arrival:e1114 → inquiry:e1164 → handover:1

保持順のみ修正・旧シード

bottling:1 → shop-start:town-liquor:1 → delivery:1 → sale:retail:63:26 → bottling:9 → bottling:11 → arrival:e768 → inquiry:e783 → visit:e980 → delivery:29 → arrival:e1114 → inquiry:e1164 → handover:1

時点先行・統一シード

bottling:1 → shop-start:town-liquor:1 → delivery:1 → sale:retail:63:26 → bottling:9 → bottling:11 → arrival:e768 → inquiry:e783 → visit:e980 → delivery:29 → arrival:e1114 → inquiry:e1164 → handover:1

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『石蔵』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| shop-start:town-liquor:1 | 1 | 2027年6月、町の酒店と取引を始めた。 | 評価に基づく抽選 | town-liquor:1 |
| delivery:1 | 1 | 2027年12月、町の酒店に『石蔵』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| sale:retail:63:26 | 1 | 2031年4月、自家販売で『石蔵』が5本売れた。 | 評価に基づく抽選 | retail:63:26 |
| bottling:9 | 1 | 2031年10月、3年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 9 |
| bottling:11 | 1 | 2033年3月、4年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 11 |
| arrival:e768 | 1 | 2033年12月、海外の飲食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e768 |
| inquiry:e783 | 1 | 2034年1月、周辺の食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e783 |
| visit:e980 | 1 | 2035年10月、海外の飲食文化圏で銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e980 |
| delivery:29 | 1 | 2038年7月、町の酒店に『石蔵』を1本納品した。 | 評価に基づく抽選 | 29 |
| arrival:e1114 | 1 | 2039年5月、海外の飲食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e1114 |
| inquiry:e1164 | 1 | 2040年4月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e1164 |
| handover:1 | 1 | 2052年10月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |

## 地元密着・第2回交代

現行

bottling:1 → shop-start:town-liquor:1 → delivery:1 → arrival:e604 → inquiry:e783 → arrival:e1114 → inquiry:e1164 → handover:1 → bottling:14 → bottling:15 → sale:retail:381:45 → visit:e1850 → delivery:103 → bottling:16 → sale:retail:528:48 → arrival:e2434 → delivery:131 → handover:2

保持順のみ修正・旧シード

bottling:1 → shop-start:town-liquor:1 → delivery:1 → arrival:e604 → distillation:264 → arrival:e1114 → inquiry:e1164 → handover:1 → bottling:14 → bottling:15 → sale:retail:381:45 → visit:e1850 → delivery:102 → bottling:16 → sale:retail:528:48 → inquiry:e2420 → delivery:131 → handover:2

時点先行・統一シード

bottling:1 → shop-start:town-liquor:1 → visit:e51 → delivery:1 → arrival:e429 → bottling:9 → sale:retail:96:35 → sale:retail:169:39 → inquiry:e1164 → handover:1 → bottling:14 → bottling:15 → visit:e1832 → delivery:99 → bottling:16 → arrival:e2395 → delivery:131 → handover:2

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『石蔵』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| shop-start:town-liquor:1 | 1 | 2027年6月、町の酒店と取引を始めた。 | 評価に基づく抽選 | town-liquor:1 |
| visit:e51 | 1 | 2027年7月、町の酒店で銘柄を知った人が蒸留所を訪れた。 | 後年の出来事に対応する起点 | e51 |
| delivery:1 | 1 | 2027年12月、町の酒店に『石蔵』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| arrival:e429 | 1 | 2030年10月、周辺の食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e429 |
| bottling:9 | 1 | 2031年10月、3年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 9 |
| sale:retail:96:35 | 1 | 2034年1月、自家販売で『石蔵』が2本売れた。 | 評価に基づく抽選 | retail:96:35 |
| sale:retail:169:39 | 1 | 2040年2月、自家販売で『石蔵』が5本売れた。 | 評価に基づく抽選 | retail:169:39 |
| inquiry:e1164 | 1 | 2040年4月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e1164 |
| handover:1 | 1 | 2052年10月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |
| bottling:14 | 2 | 2054年1月、4年熟成の『石蔵』を42本瓶詰めした。 | 評価に基づく抽選 | 14 |
| bottling:15 | 2 | 2057年8月、3年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 15 |
| visit:e1832 | 2 | 2058年6月、町の酒店で銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e1832 |
| delivery:99 | 2 | 2066年7月、町の酒店に『石蔵』を1本納品した。 | 評価に基づく抽選 | 99 |
| bottling:16 | 2 | 2069年7月、3年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 16 |
| arrival:e2395 | 2 | 2077年2月、周辺の食文化圏に口コミが届いた。 | 評価に基づく抽選 | e2395 |
| delivery:131 | 2 | 2079年1月、町の酒店に『石蔵』を1本納品した。 | 評価に基づく抽選 | 131 |
| handover:2 | 2 | 2079年1月、蒸留所を第3世代へ引き継いだ。 | 世代交代の節目 | 2 |

## 地元密着・第3回交代

現行

bottling:1 → delivery:1 → arrival:e429 → arrival:e604 → delivery:21 → arrival:e1114 → inquiry:e1164 → handover:1 → bottling:14 → sale:retail:381:45 → visit:e1850 → bottling:16 → delivery:109 → handover:2 → bottling:17 → visit:e2828 → delivery:164 → bottling:20 → handover:3

保持順のみ修正・旧シード

bottling:1 → delivery:1 → arrival:e429 → arrival:e604 → delivery:21 → arrival:e1114 → inquiry:e1164 → handover:1 → bottling:14 → sale:retail:381:45 → visit:e1850 → bottling:16 → delivery:109 → handover:2 → bottling:17 → visit:e2828 → delivery:164 → bottling:20 → handover:3

時点先行・統一シード

bottling:1 → arrival:e36 → delivery:1 → sale:retail:64:26 → fill:38 → arrival:e1114 → inquiry:e1164 → handover:1 → bottling:14 → delivery:71 → visit:e1850 → bottling:16 → delivery:114 → handover:2 → inquiry:e2477 → bottling:19 → inquiry:e2898 → delivery:178 → bottling:20 → handover:3

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『石蔵』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| arrival:e36 | 1 | 2027年5月、全国の飲食のつながりに口コミが届いた。 | 後年の出来事に対応する起点 | e36 |
| delivery:1 | 1 | 2027年12月、町の酒店に『石蔵』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| sale:retail:64:26 | 1 | 2031年5月、自家販売で『石蔵』が1本売れた。 | 評価に基づく抽選 | retail:64:26 |
| fill:38 | 1 | 2037年1月、原酒を樽に詰めた。 | 評価に基づく抽選 | 38 |
| arrival:e1114 | 1 | 2039年5月、海外の飲食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e1114 |
| inquiry:e1164 | 1 | 2040年4月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e1164 |
| handover:1 | 1 | 2052年10月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |
| bottling:14 | 2 | 2054年1月、4年熟成の『石蔵』を42本瓶詰めした。 | 評価に基づく抽選 | 14 |
| delivery:71 | 2 | 2055年5月、町の酒店に『石蔵』を1本納品した。 | 評価に基づく抽選 | 71 |
| visit:e1850 | 2 | 2058年10月、海外の飲食文化圏で銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e1850 |
| bottling:16 | 2 | 2069年7月、3年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 16 |
| delivery:114 | 2 | 2072年6月、町の酒店に『石蔵』を1本納品した。 | 評価に基づく抽選 | 114 |
| handover:2 | 2 | 2079年1月、蒸留所を第3世代へ引き継いだ。 | 世代交代の節目 | 2 |
| inquiry:e2477 | 3 | 2080年3月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e2477 |
| bottling:19 | 3 | 2084年12月、3年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 19 |
| inquiry:e2898 | 3 | 2089年5月、全国の飲食のつながりから問い合わせが届いた。 | 評価に基づく抽選 | e2898 |
| delivery:178 | 3 | 2098年9月、町の酒店に『石蔵』を1本納品した。 | 評価に基づく抽選 | 178 |
| bottling:20 | 3 | 2099年2月、3年熟成の『石蔵』を43本瓶詰めした。 | 評価に基づく抽選 | 20 |
| handover:3 | 3 | 2105年8月、蒸留所を第4世代へ引き継いだ。 | 世代交代の節目 | 3 |

## 広域展開・第1回交代

現行

bottling:1 → arrival:e25 → shop-start:town-liquor:1 → delivery:1 → shop-start:supermarket:1 → arrival:e719 → arrival:e1187 → inquiry:e1391 → visit:e1470 → sale:retail:152:39 → delivery:49 → inquiry:e2000 → handover:1

保持順のみ修正・旧シード

distillation:29 → bottling:1 → shop-start:town-liquor:1 → delivery:1 → shop-start:supermarket:1 → arrival:e714 → arrival:e1187 → inquiry:e1391 → visit:e1470 → sale:retail:151:39 → delivery:49 → inquiry:e2000 → handover:1

時点先行・統一シード

distillation:29 → bottling:1 → shop-start:town-liquor:1 → delivery:1 → shop-start:supermarket:1 → arrival:e714 → arrival:e1187 → inquiry:e1391 → visit:e1470 → sale:retail:151:39 → delivery:49 → inquiry:e2000 → handover:1

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| distillation:29 | 1 | 2026年1月、原酒を採り終えた。 | 評価に基づく抽選 | 29 |
| bottling:1 | 1 | 2026年7月、6か月熟成の『川霧』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| shop-start:town-liquor:1 | 1 | 2027年6月、町の酒店と取引を始めた。 | 評価に基づく抽選 | town-liquor:1 |
| delivery:1 | 1 | 2027年12月、町の酒店に『川霧』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| shop-start:supermarket:1 | 1 | 2029年11月、町のスーパーと取引を始めた。 | 評価に基づく抽選 | supermarket:1 |
| arrival:e714 | 1 | 2031年12月、周辺の食文化圏に口コミが届いた。 | 評価に基づく抽選 | e714 |
| arrival:e1187 | 1 | 2033年7月、全国の飲食のつながりに口コミが届いた。 | 後年の出来事に対応する起点 | e1187 |
| inquiry:e1391 | 1 | 2034年11月、全国の飲食のつながりから問い合わせが届いた。 | 評価に基づく抽選 | e1391 |
| visit:e1470 | 1 | 2035年10月、海外の飲食文化圏で銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e1470 |
| sale:retail:151:39 | 1 | 2038年8月、自家販売で『川霧』が5本売れた。 | 評価に基づく抽選 | retail:151:39 |
| delivery:49 | 1 | 2042年6月、町の酒店に『川霧』を1本納品した。 | 評価に基づく抽選 | 49 |
| inquiry:e2000 | 1 | 2045年7月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e2000 |
| handover:1 | 1 | 2052年3月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |

## 広域展開・第2回交代

現行

bottling:1 → arrival:e25 → delivery:1 → delivery:8 → visit:e1470 → sale:retail:153:39 → arrival:e1967 → inquiry:e2000 → handover:1 → arrival:e2250 → visit:e2452 → inquiry:e2646 → delivery:120 → delivery:135 → distillation:741 → bottling:20 → delivery:152 → handover:2

保持順のみ修正・旧シード

bottling:1 → arrival:e25 → delivery:1 → delivery:8 → delivery:18 → visit:e1470 → sale:retail:153:39 → arrival:e1967 → handover:1 → arrival:e2255 → visit:e2452 → inquiry:e2519 → inquiry:e2646 → delivery:119 → delivery:135 → distillation:741 → bottling:20 → delivery:153 → handover:2

時点先行・統一シード

bottling:1 → delivery:1 → delivery:8 → arrival:e787 → visit:e1470 → reaction:customer:retail:153:39 → inquiry:e2000 → handover:1 → arrival:e2274 → bottling:15 → reaction:customer:retail:349:45 → inquiry:e2646 → delivery:120 → inquiry:e3080 → distillation:730 → bottling:20 → delivery:152 → delivery:153 → delivery:166 → handover:2

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『川霧』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| delivery:1 | 1 | 2027年12月、町の酒店に『川霧』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| delivery:8 | 1 | 2030年4月、町のスーパーに『川霧』を初めて9本納品した。 | 後年の出来事に対応する起点 | 8 |
| arrival:e787 | 1 | 2032年3月、海外の飲食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e787 |
| visit:e1470 | 1 | 2035年10月、海外の飲食文化圏で銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e1470 |
| reaction:customer:retail:153:39 | 1 | 2038年10月、自家販売で『川霧』に「こういう果実の香り、好きです。」という反応があった。 | 評価に基づく抽選 | customer:retail:153:39 |
| inquiry:e2000 | 1 | 2045年7月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e2000 |
| handover:1 | 1 | 2052年3月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |
| arrival:e2274 | 2 | 2052年11月、海外の飲食文化圏に口コミが届いた。 | 評価に基づく抽選 | e2274 |
| bottling:15 | 2 | 2054年10月、18か月熟成の『川霧』を45本瓶詰めした。 | 評価に基づく抽選 | 15 |
| reaction:customer:retail:349:45 | 2 | 2055年2月、自家販売で『川霧』に「果実の香りがよく出ていますね。」という反応があった。 | 評価に基づく抽選 | customer:retail:349:45 |
| inquiry:e2646 | 2 | 2061年7月、周辺の食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e2646 |
| delivery:120 | 2 | 2065年4月、町のスーパーに『川霧』を2本納品した。 | 評価に基づく抽選 | 120 |
| inquiry:e3080 | 2 | 2069年3月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e3080 |
| distillation:730 | 2 | 2071年6月、原酒を採り終えた。 | 評価に基づく抽選 | 730 |
| bottling:20 | 2 | 2074年1月、2年熟成の『川霧』を44本瓶詰めした。 | 評価に基づく抽選 | 20 |
| delivery:152 | 2 | 2074年3月、町のデパートに『川霧』を5本納品した。 | 評価に基づく抽選 | 152 |
| delivery:153 | 2 | 2074年3月、町のスーパーに『川霧』を2本納品した。 | 評価に基づく抽選 | 153 |
| delivery:166 | 2 | 2078年6月、町の酒店に『川霧』を1本納品した。 | 評価に基づく抽選 | 166 |
| handover:2 | 2 | 2078年7月、蒸留所を第3世代へ引き継いだ。 | 世代交代の節目 | 2 |

## 広域展開・第3回交代

現行

bottling:1 → delivery:1 → arrival:e109 → delivery:8 → arrival:e1395 → reaction:customer:retail:153:39 → inquiry:e2000 → handover:1 → inquiry:e2519 → delivery:107 → sale:retail:470:50 → delivery:132 → bottling:19 → bottling:20 → handover:2 → arrival:e3736 → reaction:customer:retail:760:71 → delivery:207 → arrival:e4379 → bottling:25 → bottling:26 → delivery:248 → handover:3

保持順のみ修正・旧シード

bottling:1 → delivery:1 → shop-start:supermarket:1 → arrival:e787 → delivery:18 → arrival:e1434 → sale:retail:153:39 → inquiry:e2000 → handover:1 → visit:e2339 → inquiry:e2646 → fill:47 → delivery:131 → reaction:customer:retail:568:59 → bottling:20 → handover:2 → arrival:e3901 → bottling:23 → delivery:207 → bottling:25 → delivery:239 → handover:3

時点先行・統一シード

bottling:1 → arrival:e25 → visit:e51 → delivery:1 → delivery:8 → visit:e1470 → reaction:customer:retail:153:39 → inquiry:e2000 → handover:1 → inquiry:e2519 → delivery:105 → fill:47 → sale:retail:503:54 → bottling:19 → bottling:20 → handover:2 → inquiry:e3849 → bottling:23 → delivery:208 → inquiry:e4543 → delivery:235 → bottling:26 → handover:3

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『川霧』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| arrival:e25 | 1 | 2027年3月、食堂に口コミが届いた。 | 後年の出来事に対応する起点 | e25 |
| visit:e51 | 1 | 2027年7月、町の酒店で銘柄を知った人が蒸留所を訪れた。 | 後年の出来事に対応する起点 | e51 |
| delivery:1 | 1 | 2027年12月、町の酒店に『川霧』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| delivery:8 | 1 | 2030年4月、町のスーパーに『川霧』を初めて9本納品した。 | 後年の出来事に対応する起点 | 8 |
| visit:e1470 | 1 | 2035年10月、海外の飲食文化圏で銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e1470 |
| reaction:customer:retail:153:39 | 1 | 2038年10月、自家販売で『川霧』に「こういう果実の香り、好きです。」という反応があった。 | 評価に基づく抽選 | customer:retail:153:39 |
| inquiry:e2000 | 1 | 2045年7月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e2000 |
| handover:1 | 1 | 2052年3月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |
| inquiry:e2519 | 2 | 2057年9月、全国の飲食のつながりから問い合わせが届いた。 | 評価に基づく抽選 | e2519 |
| delivery:105 | 2 | 2060年8月、町の酒店に『川霧』を1本納品した。 | 評価に基づく抽選 | 105 |
| fill:47 | 2 | 2063年2月、原酒を樽に詰めた。 | 評価に基づく抽選 | 47 |
| sale:retail:503:54 | 2 | 2067年12月、自家販売で『川霧』が5本売れた。 | 評価に基づく抽選 | retail:503:54 |
| bottling:19 | 2 | 2072年12月、18か月熟成の『川霧』を45本瓶詰めした。 | 評価に基づく抽選 | 19 |
| bottling:20 | 2 | 2074年1月、2年熟成の『川霧』を44本瓶詰めした。 | 評価に基づく抽選 | 20 |
| handover:2 | 2 | 2078年7月、蒸留所を第3世代へ引き継いだ。 | 世代交代の節目 | 2 |
| inquiry:e3849 | 3 | 2083年10月、食堂から問い合わせが届いた。 | 評価に基づく抽選 | e3849 |
| bottling:23 | 3 | 2089年3月、18か月熟成の『川霧』を45本瓶詰めした。 | 評価に基づく抽選 | 23 |
| delivery:208 | 3 | 2090年11月、町のスーパーに『川霧』を2本納品した。 | 評価に基づく抽選 | 208 |
| inquiry:e4543 | 3 | 2097年5月、町の酒店から問い合わせが届いた。 | 評価に基づく抽選 | e4543 |
| delivery:235 | 3 | 2099年4月、町の酒店に『川霧』を1本納品した。 | 評価に基づく抽選 | 235 |
| bottling:26 | 3 | 2101年12月、1年熟成の『川霧』を45本瓶詰めした。 | 評価に基づく抽選 | 26 |
| handover:3 | 3 | 2103年7月、蒸留所を第4世代へ引き継いだ。 | 世代交代の節目 | 3 |

## 混合・第1回交代

現行

bottling:1 → arrival:e36 → shop-start:town-liquor:1 → reaction:customer:retail:47:31 → delivery:13 → bottling:11 → bottling:12 → arrival:e1064 → inquiry:e1135 → shop-start:supermarket:1 → arrival:e1478 → inquiry:e1535 → handover:1

保持順のみ修正・旧シード

bottling:1 → arrival:e36 → shop-start:town-liquor:1 → reaction:customer:retail:47:31 → delivery:13 → bottling:11 → bottling:12 → arrival:e1064 → inquiry:e1135 → shop-start:supermarket:1 → arrival:e1478 → inquiry:e1535 → handover:1

時点先行・統一シード

bottling:1 → arrival:e36 → shop-start:town-liquor:1 → reaction:customer:retail:47:31 → delivery:13 → bottling:11 → bottling:12 → arrival:e1064 → inquiry:e1135 → shop-start:supermarket:1 → arrival:e1478 → inquiry:e1535 → handover:1

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『朝霞』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| arrival:e36 | 1 | 2027年5月、全国の飲食のつながりに口コミが届いた。 | 後年の出来事に対応する起点 | e36 |
| shop-start:town-liquor:1 | 1 | 2027年6月、町の酒店と取引を始めた。 | 評価に基づく抽選 | town-liquor:1 |
| reaction:customer:retail:47:31 | 1 | 2029年12月、自家販売で『朝霞』に「こういう果実の香り、好きです。」という反応があった。 | 評価に基づく抽選 | customer:retail:47:31 |
| delivery:13 | 1 | 2032年3月、町の酒店に『朝霞』を1本納品した。 | 評価に基づく抽選 | 13 |
| bottling:11 | 1 | 2032年3月、3年熟成の『朝霞』を43本瓶詰めした。 | 評価に基づく抽選 | 11 |
| bottling:12 | 1 | 2034年2月、4年熟成の『朝霞』を42本瓶詰めした。 | 評価に基づく抽選 | 12 |
| arrival:e1064 | 1 | 2035年1月、全国の飲食のつながりに口コミが届いた。 | 評価に基づく抽選 | e1064 |
| inquiry:e1135 | 1 | 2035年12月、全国の飲食のつながりから問い合わせが届いた。 | 評価に基づく抽選 | e1135 |
| shop-start:supermarket:1 | 1 | 2041年11月、町のスーパーと取引を始めた。 | 評価に基づく抽選 | supermarket:1 |
| arrival:e1478 | 1 | 2043年4月、海外の飲食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e1478 |
| inquiry:e1535 | 1 | 2044年11月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e1535 |
| handover:1 | 1 | 2051年7月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |

## 混合・第2回交代

現行

bottling:1 → arrival:e26 → delivery:1 → sale:retail:61:31 → arrival:e1064 → inquiry:e1135 → shop-start:supermarket:1 → inquiry:e1535 → handover:1 → arrival:e1732 → bottling:14 → delivery:73 → bottling:15 → inquiry:e2065 → delivery:100 → fill:47 → bottling:16 → delivery:141 → handover:2

保持順のみ修正・旧シード

bottling:1 → arrival:e26 → delivery:1 → sale:retail:61:31 → arrival:e1064 → inquiry:e1135 → shop-start:supermarket:1 → inquiry:e1535 → handover:1 → arrival:e1732 → bottling:14 → delivery:73 → bottling:15 → visit:e2064 → delivery:99 → delivery:118 → fill:47 → bottling:16 → handover:2

時点先行・統一シード

bottling:1 → delivery:1 → sale:retail:53:31 → arrival:e752 → bottling:12 → shop-start:supermarket:1 → arrival:e1478 → inquiry:e1535 → handover:1 → bottling:14 → delivery:73 → inquiry:e1871 → visit:e2064 → delivery:100 → distillation:697 → bottling:16 → delivery:141 → handover:2

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『朝霞』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| delivery:1 | 1 | 2027年12月、町の酒店に『朝霞』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| sale:retail:53:31 | 1 | 2030年6月、自家販売で『朝霞』が1本売れた。 | 評価に基づく抽選 | retail:53:31 |
| arrival:e752 | 1 | 2032年5月、海外の飲食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e752 |
| bottling:12 | 1 | 2034年2月、4年熟成の『朝霞』を42本瓶詰めした。 | 評価に基づく抽選 | 12 |
| shop-start:supermarket:1 | 1 | 2041年11月、町のスーパーと取引を始めた。 | 後年の出来事に対応する起点 | supermarket:1 |
| arrival:e1478 | 1 | 2043年4月、海外の飲食文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e1478 |
| inquiry:e1535 | 1 | 2044年11月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e1535 |
| handover:1 | 1 | 2051年7月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |
| bottling:14 | 2 | 2054年7月、3年熟成の『朝霞』を43本瓶詰めした。 | 評価に基づく抽選 | 14 |
| delivery:73 | 2 | 2054年8月、町のスーパーに『朝霞』を初めて5本納品した。 | 評価に基づく抽選 | 73 |
| inquiry:e1871 | 2 | 2055年7月、周辺の食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e1871 |
| visit:e2064 | 2 | 2058年6月、海外の飲食文化圏で銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e2064 |
| delivery:100 | 2 | 2062年11月、町の酒店に『朝霞』を1本納品した。 | 評価に基づく抽選 | 100 |
| distillation:697 | 2 | 2070年3月、原酒を採り終えた。 | 評価に基づく抽選 | 697 |
| bottling:16 | 2 | 2074年3月、4年熟成の『朝霞』を42本瓶詰めした。 | 評価に基づく抽選 | 16 |
| delivery:141 | 2 | 2076年11月、町の酒店に『朝霞』を1本納品した。 | 評価に基づく抽選 | 141 |
| handover:2 | 2 | 2076年11月、蒸留所を第3世代へ引き継いだ。 | 世代交代の節目 | 2 |

## 混合・第3回交代

現行

bottling:1 → arrival:e25 → arrival:e36 → delivery:1 → sale:retail:53:20 → bottling:12 → shop-start:supermarket:1 → inquiry:e1535 → handover:1 → delivery:74 → visit:e2064 → delivery:108 → bottling:16 → handover:2 → inquiry:e2906 → arrival:e2978 → inquiry:e3143 → delivery:182 → delivery:190 → bottling:20 → bottling:21 → arrival:e3880 → handover:3

保持順のみ修正・旧シード

bottling:1 → delivery:1 → arrival:e450 → bottling:11 → arrival:e752 → bottling:12 → shop-start:supermarket:1 → inquiry:e1535 → handover:1 → delivery:73 → visit:e2064 → delivery:110 → bottling:16 → handover:2 → inquiry:e2728 → inquiry:e2906 → delivery:164 → sale:retail:766:57 → delivery:189 → bottling:21 → delivery:205 → arrival:e3880 → handover:3

時点先行・統一シード

bottling:1 → arrival:e36 → visit:e51 → delivery:1 → sale:retail:62:31 → bottling:12 → delivery:33 → inquiry:e1535 → handover:1 → delivery:73 → bottling:15 → inquiry:e2065 → arrival:e2546 → handover:2 → inquiry:e2906 → visit:e3070 → delivery:176 → bottling:19 → bottling:20 → delivery:205 → arrival:e3880 → handover:3

| 元イベントID | 世代 | 回想文 | 選出理由 | 根拠ID |
| --- | --- | --- | --- | --- |
| bottling:1 | 1 | 2026年7月、6か月熟成の『朝霞』を46本瓶詰めした。 | 記録上の最初の瓶詰め | 1 |
| arrival:e36 | 1 | 2027年5月、全国の飲食のつながりに口コミが届いた。 | 後年の出来事に対応する起点 | e36 |
| visit:e51 | 1 | 2027年7月、町の酒店で銘柄を知った人が蒸留所を訪れた。 | 後年の出来事に対応する起点 | e51 |
| delivery:1 | 1 | 2027年12月、町の酒店に『朝霞』を初めて1本納品した。 | 後年の出来事に対応する起点 | 1 |
| sale:retail:62:31 | 1 | 2031年3月、自家販売で『朝霞』が2本売れた。 | 評価に基づく抽選 | retail:62:31 |
| bottling:12 | 1 | 2034年2月、4年熟成の『朝霞』を42本瓶詰めした。 | 評価に基づく抽選 | 12 |
| delivery:33 | 1 | 2040年1月、町の酒店に『朝霞』を1本納品した。 | 評価に基づく抽選 | 33 |
| inquiry:e1535 | 1 | 2044年11月、海外の飲食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e1535 |
| handover:1 | 1 | 2051年7月、蒸留所を第2世代へ引き継いだ。 | 世代交代の節目 | 1 |
| delivery:73 | 2 | 2054年8月、町のスーパーに『朝霞』を初めて5本納品した。 | 後年の出来事に対応する起点 | 73 |
| bottling:15 | 2 | 2056年11月、1年熟成の『朝霞』を45本瓶詰めした。 | 評価に基づく抽選 | 15 |
| inquiry:e2065 | 2 | 2058年6月、町の酒店から問い合わせが届いた。 | 評価に基づく抽選 | e2065 |
| arrival:e2546 | 2 | 2073年10月、海外の熟成酒文化圏に口コミが届いた。 | 後年の出来事に対応する起点 | e2546 |
| handover:2 | 2 | 2076年11月、蒸留所を第3世代へ引き継いだ。 | 世代交代の節目 | 2 |
| inquiry:e2906 | 3 | 2080年4月、周辺の食文化圏から問い合わせが届いた。 | 評価に基づく抽選 | e2906 |
| visit:e3070 | 3 | 2085年7月、全国の飲食のつながりで銘柄を知った人が蒸留所を訪れた。 | 評価に基づく抽選 | e3070 |
| delivery:176 | 3 | 2088年12月、町の酒店に『朝霞』を1本納品した。 | 評価に基づく抽選 | 176 |
| bottling:19 | 3 | 2089年10月、3年熟成の『朝霞』を43本瓶詰めした。 | 評価に基づく抽選 | 19 |
| bottling:20 | 3 | 2095年12月、4年熟成の『朝霞』を42本瓶詰めした。 | 評価に基づく抽選 | 20 |
| delivery:205 | 3 | 2096年8月、町のスーパーに『朝霞』を1本納品した。 | 評価に基づく抽選 | 205 |
| arrival:e3880 | 3 | 2101年8月、海外の熟成酒文化圏に口コミが届いた。 | 評価に基づく抽選 | e3880 |
| handover:3 | 3 | 2102年7月、蒸留所を第4世代へ引き継いだ。 | 世代交代の節目 | 3 |

# 観光協会0.5 — 検索向け構造の確認

確認日：2026-10-13。対象：Stagingのみ。検索登録・Production変更は行っていない。

| 項目 | 確認・対応 |
| --- | --- |
| title | 湯間庭町 観光協会｜町の案内・町内案内図 |
| description | 駅前広場・灯串横丁・湯窓レジャーセンター、案内図、お知らせ、町への導線を具体的に記載 |
| 見出し | H1は観光協会の1件。H2は町の案内・町内案内図・お知らせの3件 |
| 内部リンク | 通常のa hrefで、既存の ?place=station_plaza / tomogushi_alley_map / leisure_center_map へ。日付付きお知らせのworkリンクは維持 |
| canonical | この未公開作品には指定しない。本番の正式URLが確定するまでProduction URLをcanonicalとして創作しない。町トップの既存canonicalは変更しない |
| robots meta | 欠けていたnoindex,nofollowを追加。Staging町トップ・生成された作品紹介ページと同じ方針 |
| robots.txt | repository内にない。公開originの /robots.txt と /yumaniwa-town-staging/robots.txt はHTTP 404を確認。今回新設・変更しない |
| sitemap | 現行sitemap.xmlは公開済みProductionの町とw/en/w作品紹介URLを列挙。観光協会・Staging URLは含まれていない。生成正本はtools/generate-work-search-pages.cjs。直接編集しない |
| mobile / a11y | viewportに拡大禁止なし。lang=ja、見出し・nav・sectionラベル、画像alt、44px以上のリンク領域、focus-visible、reduced-motion設定を維持。canvasは100svhのまま |
| 町トップの既存UI | index.htmlのwork-search-linksは通常1pxで非表示、keyboard focus時のみ表示される既存のアクセシビリティ導線。新しい常時表示の作品一覧や固定オーバーレイは追加しない。root HTML/CSS/JSは無変更 |

観光協会は町の情報と行き先を案内する。町トップは歩いて施設へ入る既存体験を維持する。各作品の内容・共有・検索向け情報は既存w/<id>/紹介ページが担当し、観光協会には大量転載しない。今回、路地裏マサラとCoffeeFactoryの個別ピックアップを外したが、施設内の作品台帳や導線は変更していない。

Google Search Centralのnoindex・canonical・sitemapの公式文書を参照。noindexはページを取得できるクローラーに対する指示であり、robots.txtによる取得禁止とは別。現在の検索インデックス状態や実際の削除・採用は確認していない。

- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/crawling-indexing/canonicalization
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

## Production公開時の別対応

1. 作者の公開判断と既存のlifecycle / promotion手順に従い、正式公開URLと移送範囲を確定する。
2. Production版のみnoindexを解除し、正式な観光協会URLへ自己canonicalを設定する。町トップへcanonicalを寄せない。Stagingはnoindexを維持する。
3. sitemapの生成正本で公開対象を扱う方法を確認し、承認されたProduction URLだけを追加・再生成する。現行generatorは登録作品のw/en/w紹介ページが中心であり、観光協会の直接URLを対象にする変更は今回行わない。
4. 内部リンクがProduction側を指し、施設・作品に進めることを確認する。既存の個別作品紹介ページを活用する。
5. 公開後に検索側の取得結果を確認する。Search Console/Bingの設定変更・登録は、必要なら別途指示に基づいて行う。町トップを観光協会へリダイレクトしたり、トップcanonicalを変更したりしない。

実機iPhone/iPad・PCブラウザでの表示と触感は未確認。Sitesのcontrol-browserがこの環境で利用できないため、HTML/CSS・入力fixture・camera/picking・既存routeの機械確認に限る。

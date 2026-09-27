# Release regression inputs

HTML and sitemap are unmodified production files at
`SukimaStock/yumaniwa-town@cc387496dbadbd5ddd1f937e15100c4c9bd82b83`.
They intentionally retain the known SEO failures. Do not repair these inputs to make tests green.

Tests construct disposable candidates from DotWeather's existing page, install/analytics
contracts and assets. Corrected sitemap/discovery inputs exist only in temporary test
directories. No live work page, sitemap or production file is rewritten.

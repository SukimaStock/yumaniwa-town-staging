// このファイルは作品の台帳メモです。町側の data/works.js が公開設定を持ちます。
var WORK_META = {
  id: "new-work-id",
  title: "新しい触れるらくがき",
  engine: "rakugaki-engine.v1",
  orientation: "portrait"
};

// 作品側から共通プレイヤーを閉じたい場合だけ使います。
// 通常は親画面左上の「レジャーセンターへ戻る」を使えば十分です。
window.YumaniwaWork = {
  close: function() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "yumaniwa:close-work" }, "*");
    }
  }
};

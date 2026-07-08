var WORK_META = {
  id: "rainy-window",
  title: "雨の日の窓",
  engine: "rakugaki-engine.v1",
  orientation: "portrait"
};

window.YumaniwaWork = {
  close: function() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "yumaniwa:close-work" }, "*");
    }
  }
};

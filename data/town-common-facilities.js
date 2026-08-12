(function () {
  'use strict';

  var maps = window.TOWN_SCENE_MAPS || {};

  function removePlaceholderDecor(def, x, y, w, h) {
    if (!def || !Array.isArray(def.decor)) return;
    def.decor = def.decor.filter(function (item) {
      return !(item && item.x === x && item.y === y && item.w === w && item.h === h);
    });
  }

  function replaceProp(def, prop) {
    if (!def) return;
    def.props = Array.isArray(def.props) ? def.props : [];
    def.props = def.props.filter(function (item) {
      return !item || item.id !== prop.id;
    });
    def.props.push(prop);
  }

  function attachBase64Png(prop, sourceUrl, expectedLength) {
    if (!prop || !sourceUrl) return;

    fetch(sourceUrl, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('asset fetch failed: ' + response.status);
        return response.text();
      })
      .then(function (text) {
        var compact = String(text || '').replace(/\s+/g, '');
        if (expectedLength && compact.length >= expectedLength) {
          compact = compact.slice(0, expectedLength);
        }
        if (!compact) throw new Error('asset payload is empty');
        prop.src = 'data:image/png;base64,' + compact;
      })
      .catch(function (error) {
        console.warn('[Yumaniwa] common facility asset load failed', error);
      });
  }

  var leisure = maps.leisure_center_map;
  if (leisure) {
    var terminalProp = {
      id: 'leisure_catalog_terminal',
      src: '',
      x: 9.5,
      y: 13.0,
      w: 5.0,
      h: 5.0,
      footY: 18.0,
      enabled: true,
      collision: {
        enabled: true,
        x: 0.18,
        y: 0.72,
        w: 0.64,
        h: 0.24
      },
      interaction: {
        enabled: true,
        triggerId: 'leisure_catalog',
        x: 0.05,
        y: 0.56,
        w: 0.90,
        h: 0.42
      }
    };

    replaceProp(leisure, terminalProp);
    removePlaceholderDecor(leisure, 9, 16, 6, 2);

    attachBase64Png(
      terminalProp,
      'assets/maps/props/leisure-center/leisure-catalog-terminal.png.base64.txt?v=20260812-1',
      9252
    );
  }
})();

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

  var leisure = maps.leisure_center_map;
  if (leisure) {
    replaceProp(leisure, {
      id: 'leisure_catalog_terminal',
      src: 'assets/maps/props/leisure-center/leisure-catalog-terminal.png?v=20260812-1',
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
    });

    removePlaceholderDecor(leisure, 9, 16, 6, 2);
  }
})();

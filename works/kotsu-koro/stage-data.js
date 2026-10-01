(function(root){
  'use strict';
  const data = {
  "version": 1,
  "start": {
    "x": 180,
    "y": 250
  },
  "end": {
    "left": 1790,
    "right": 2030
  },
  "surfaces": [
    {
      "id": "surface-a",
      "material": "flesh",
      "points": [
        {
          "id": "point-0-0",
          "x": -50,
          "y": 350
        },
        {
          "id": "point-0-1",
          "x": 0,
          "y": 350
        },
        {
          "id": "point-0-2",
          "x": 310,
          "y": 350
        },
        {
          "id": "point-0-3",
          "x": 420,
          "y": 326
        },
        {
          "id": "point-0-4",
          "x": 455,
          "y": 324
        }
      ]
    },
    {
      "id": "surface-b",
      "material": "flesh",
      "points": [
        {
          "id": "point-1-0",
          "x": 503,
          "y": 345
        },
        {
          "id": "point-1-1",
          "x": 615,
          "y": 372
        },
        {
          "id": "point-1-2",
          "x": 700,
          "y": 354
        },
        {
          "id": "point-1-3",
          "x": 810,
          "y": 391
        },
        {
          "id": "point-1-4",
          "x": 935,
          "y": 365
        },
        {
          "id": "point-1-5",
          "x": 1030,
          "y": 342
        },
        {
          "id": "point-1-6",
          "x": 1110,
          "y": 356,
          "tangent": 0,
          "round": true
        },
        {
          "id": "point-1-7",
          "x": 1200,
          "y": 406,
          "tangent": 0.85,
          "round": true
        },
        {
          "id": "point-1-8",
          "x": 1270,
          "y": 475,
          "tangent": 0.7,
          "round": true
        },
        {
          "id": "point-1-9",
          "x": 1350,
          "y": 500,
          "tangent": 0,
          "round": true
        },
        {
          "id": "point-1-10",
          "x": 1430,
          "y": 468,
          "tangent": -0.8,
          "round": true
        },
        {
          "id": "point-1-11",
          "x": 1490,
          "y": 407,
          "tangent": -1.2,
          "round": true
        },
        {
          "id": "point-1-12",
          "x": 1545,
          "y": 338,
          "tangent": -1.25,
          "round": true
        }
      ]
    },
    {
      "id": "surface-c",
      "material": "flesh",
      "points": [
        {
          "id": "point-2-0",
          "x": 1640,
          "y": 360,
          "tangent": 0.45
        },
        {
          "id": "point-2-1",
          "x": 1715,
          "y": 422,
          "tangent": 0.35
        },
        {
          "id": "point-2-2",
          "x": 1775,
          "y": 413,
          "tangent": 0
        },
        {
          "id": "point-2-3",
          "x": 1840,
          "y": 475,
          "tangent": 0.45
        },
        {
          "id": "point-2-4",
          "x": 1890,
          "y": 487,
          "tangent": 0
        },
        {
          "id": "point-2-5",
          "x": 1995,
          "y": 465,
          "tangent": 0
        },
        {
          "id": "point-2-6",
          "x": 2070,
          "y": 420,
          "tangent": 0
        }
      ]
    }
  ],
  "materials": [
    {
      "id": "reunion-cushion",
      "left": 740,
      "right": 930,
      "material": "cushion",
      "includeLeft": false,
      "includeRight": false
    },
    {
      "id": "bowl-polished",
      "left": 1110,
      "right": 1545,
      "material": "polished",
      "includeLeft": true,
      "includeRight": true
    },
    {
      "id": "landing-cushion",
      "left": 1640,
      "right": 1775,
      "material": "cushion",
      "includeLeft": false,
      "includeRight": false
    },
    {
      "id": "release-polished",
      "left": 1775,
      "right": 1840,
      "material": "polished",
      "includeLeft": false,
      "includeRight": false
    }
  ],
  "features": []
};
  // Canonical terrain is pure JSON-compatible data, never a mutable draft.
  function freeze(o){Object.values(o).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(o);}
  root.PumpkinStageData=freeze(data);
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PumpkinStageData;
})(typeof window!=='undefined'?window:globalThis);

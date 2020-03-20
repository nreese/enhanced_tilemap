
// const L = require('leaflet');
// const _ = require('lodash');

// define(function () {
//   return function StoredMapLayersFactory(es) {

//     class StoredMapLayers {
//       constructor() {
//         this.es = es;
//       }

//       getStoredLayers() {
//         this.es.search({
//           index: '.map__*',
//           body: {
//             query: { 'match_all': {} },
//             aggs: {
//               2: {
//                 terms: {
//                   field: 'spatial_path',
//                   order: { _key: 'asc' }
//                 }
//               }
//             },
//             size: 0
//           }
//         })
//           .then(function (resp) {
//             console.log(resp);
//           });
//       }

//     }
//     return StoredMapLayers;
//   };
// });

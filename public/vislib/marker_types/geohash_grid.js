define(function (require) {
  return function GeohashGridMarkerFactory(Private) {
    const _ = require('lodash');
    const L = require('leaflet');

    const BaseMarker = Private(require('./base_marker'));

    /**
     * Map overlay: rectangles that show the geohash grid bounds
     *
     * @param leafletMap {Leaflet Object}
     * @param geoJson {geoJson Object}
     * @param params {Object}
     */
    _.class(GeohashGridMarker).inherits(BaseMarker);
    function GeohashGridMarker() {
      GeohashGridMarker.Super.apply(this, arguments);

      this._createMarkerGroup({
        pointToLayer: function (feature) {
          const geohashRect = feature.properties.rectangle;
          // get bounds from northEast[3] and southWest[1]
          // corners in geohash rectangle
          const corners = [
            [geohashRect[3][0], geohashRect[3][1]],
            [geohashRect[1][0], geohashRect[1][1]]
          ];
          return L.rectangle(corners);
        }
      });
    }

    return GeohashGridMarker;
  };
});
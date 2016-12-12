define(function (require) {
  return function ScaledCircleMarkerFactory(Private) {
    let _ = require('lodash');
    let L = require('leaflet');

    let BaseMarker = Private(require('./base_marker'));

    /**
     * Map overlay: circle markers that are scaled to illustrate values
     *
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @param params {Object}
     */
    _.class(ScaledCircleMarker).inherits(BaseMarker);
    function ScaledCircleMarker(map, geoJson, params) {
      let self = this;
      ScaledCircleMarker.Super.apply(this, arguments);

      // multiplier to reduce size of all circles
      let scaleFactor = 0.8;

      this._createMarkerGroup({
        pointToLayer: function (feature, latlng) {
          let scaledRadius = self._geohashMinDistance(feature) * scaleFactor;
          return L.circle(latlng, scaledRadius);
        }
      });
    }

    /**
     * _geohashMinDistance returns a min distance in meters for sizing
     * circle markers to fit within geohash grid rectangle
     *
     * @method _geohashMinDistance
     * @param feature {Object}
     * @return {Number}
     */
    ScaledCircleMarker.prototype._geohashMinDistance = function (feature) {
      let centerPoint = _.get(feature, 'properties.center');
      let geohashRect = _.get(feature, 'properties.rectangle');

      // centerPoint is an array of [lat, lng]
      // geohashRect is the 4 corners of the geoHash rectangle
      //   an array that starts at the southwest corner and proceeds
      //   clockwise, each value being an array of [lat, lng]

      // center lat and southeast lng
      let east   = L.latLng([centerPoint[0], geohashRect[2][1]]);
      // southwest lat and center lng
      let north  = L.latLng([geohashRect[3][0], centerPoint[1]]);

      // get latLng of geohash center point
      let center = L.latLng([centerPoint[0], centerPoint[1]]);

      // get smallest radius at center of geohash grid rectangle
      let eastRadius  = Math.floor(center.distanceTo(east));
      let northRadius = Math.floor(center.distanceTo(north));
      let radius = _.min([eastRadius, northRadius]);

      let orgMin = this.geoJson.properties.allmin;
      let orgMax = this.geoJson.properties.allmax;
      // Don't let the circle size get any smaller than one-third the max size
      let min = orgMax / 3;
      let max = orgMax;
      let value = this._scaleValueBetween(feature.properties.value, min, max, orgMin, orgMax);
      return radius * (value / orgMax);
    };

    /**
     * _scaleValueBewteen returns the given value between the new min and max based
     * on the original scale
     *
     * @method _scaleValueBetween
     * @param value {Number} - The value to scale
     * @param min {Number} - The new minimum
     * @param max {Number} - The new maximum
     * @param orgMin {Number} - The original minimum
     * @param feature {Number} - The original maximum
     * @return {Number}
     */
    ScaledCircleMarker.prototype._scaleValueBetween = function(value, min, max, orgMin, orgMax) {
      return ((max-min)*(value-orgMin))/(orgMax-orgMin) + min;
    }

    return ScaledCircleMarker;
  };
});

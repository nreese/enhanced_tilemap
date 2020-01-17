define(function (require) {
  return function ScaledCircleMarkerFactory(Private) {
    const _ = require('lodash');
    const L = require('leaflet');

    const BaseMarker = Private(require('./base_marker'));

    /**
     * Map overlay: circle markers that are scaled to illustrate values
     *
     * @param leafletMap {Leaflet Object}
     * @param mapData {geoJson Object}
     * @param params {Object}
     */
    _.class(ScaledCircleMarker).inherits(BaseMarker);
    function ScaledCircleMarker(leafletMap) {
      const self = this;
      ScaledCircleMarker.Super.apply(this, arguments);

      // Earth circumference in meters
      const earthCircumference = 40075017;
      const mapZoom = leafletMap.getZoom();
      const latitudeRadians = leafletMap.getCenter().lat * (Math.PI / 180);
      this._metersPerPixel = earthCircumference * Math.cos(latitudeRadians) / Math.pow(2, mapZoom + 8);

      this._createMarkerGroup({
        pointToLayer: function (feature, latlng) {
          const scaledRadius = self._radiusScale(feature);
          return L.circleMarker(latlng).setRadius(scaledRadius);
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
      const centerPoint = _.get(feature, 'properties.center');
      const geohashRect = _.get(feature, 'properties.rectangle');

      // centerPoint is an array of [lat, lng]
      // geohashRect is the 4 corners of the geoHash rectangle
      //   an array that starts at the southwest corner and proceeds
      //   clockwise, each value being an array of [lat, lng]

      // center lat and southeast lng
      const east   = L.latLng([centerPoint[0], geohashRect[2][1]]);
      // southwest lat and center lng
      const north  = L.latLng([geohashRect[3][0], centerPoint[1]]);

      // get latLng of geohash center point
      const center = L.latLng([centerPoint[0], centerPoint[1]]);

      // get smallest radius at center of geohash grid rectangle
      const eastRadius  = Math.floor(center.distanceTo(east));
      const northRadius = Math.floor(center.distanceTo(north));
      return _.min([eastRadius, northRadius]);
    };

    /**
     * _radiusScale returns the radius (in pixels) of the feature based on its
     * value.  The radius fits within the geohash bounds of the feature to
     * avoid overlapping.
     *
     * @method _scaleValueBetween
     * @param feature {Object} - The feature
     * @return {Number}
     */
    ScaledCircleMarker.prototype._radiusScale = function (feature) {
      const radius = this._geohashMinDistance(feature);
      const orgMin = this.geoJson.properties.allmin;
      const orgMax = this.geoJson.properties.allmax;
      // Don't let the circle size get any smaller than one-third the max size
      const min = orgMax / 3;
      const max = orgMax;
      const value = this._scaleValueBetween(feature.properties.value, min, max, orgMin, orgMax);
      return radius * (value / max) / this._metersPerPixel;
    };

    /**
     * _scaleValueBetween returns the given value between the new min and max based
     * on the original scale
     *
     * @method _scaleValueBetween
     * @param value {Number} - The value to scale
     * @param min {Number} - The new minimum
     * @param max {Number} - The new maximum
     * @param orgMin {Number} - The original minimum
     * @param orgMax {Number} - The original maximum
     * @return {Number}
     */
    ScaledCircleMarker.prototype._scaleValueBetween = function (value, min, max, orgMin, orgMax) {
      return (orgMin !== orgMax) ? ((max - min) * (value - orgMin)) / (orgMax - orgMin) + min : value;
    };

    return ScaledCircleMarker;
  };
});

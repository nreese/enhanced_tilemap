define(function (require) {
  const _ = require('lodash');

  return {
    getGeoExtents: function(visData) {
      return {
        min: visData.geoJson.properties.min,
        max: visData.geoJson.properties.max
      }
    },
    /* 
     * @param bounds {LatLngBounds}
     * @param scale {number}
     * @return {object}
     */
    scaleBounds: function(bounds, scale) {
      let safeScale = scale;
      if(safeScale < 1) scale = 1;
      if(safeScale > 5) scale = 5;
      safeScale = safeScale - 1;

      const topLeft = bounds.getNorthWest();
      const bottomRight = bounds.getSouthEast();
      let latDiff = _.round(Math.abs(topLeft.lat - bottomRight.lat), 5);
      let lonDiff = _.round(Math.abs(bottomRight.lng - topLeft.lng), 5);
      //map height can be zero when vis is first created
      if(latDiff === 0) latDiff = lonDiff;

      const latDelta = latDiff * safeScale;
      let topLeftLat = _.round(topLeft.lat, 5) + latDelta;
      if(topLeftLat > 90) topLeftLat = 90;
      let bottomRightLat = _.round(bottomRight.lat, 5) - latDelta;
      if(bottomRightLat < -90) bottomRightLat = -90;
      const lonDelta = lonDiff * safeScale;
      let topLeftLon = _.round(topLeft.lng, 5) - lonDelta;
      if(topLeftLon < -180) topLeftLon = -180;
      let bottomRightLon = _.round(bottomRight.lng, 5) + lonDelta;
      if(bottomRightLon > 180) bottomRightLon = 180;

      //console.log("scale:" + safeScale + ", latDelta: " + latDelta + ", lonDelta: " + lonDelta);
      //console.log("top left lat " + _.round(topLeft.lat, 5) + " -> " + topLeftLat);
      //console.log("bottom right lat " + _.round(bottomRight.lat, 5) + " -> " + bottomRightLat);
      //console.log("top left lon " + _.round(topLeft.lng, 5) + " -> " + topLeftLon);
      //console.log("bottom right lon " + _.round(bottomRight.lng, 5) + " -> " + bottomRightLon);
      
      return {
        "top_left": {lat: topLeftLat, lon: topLeftLon},
        "bottom_right": {lat: bottomRightLat, lon: bottomRightLon}
      };
    },
    contains: function(collar, bounds) {
      //test if bounds top_left is inside collar
      if(bounds.top_left.lat > collar.top_left.lat
        || bounds.top_left.lon < collar.top_left.lon) 
        return false;

      //test if bounds bottom_right is inside collar
      if(bounds.bottom_right.lat < collar.bottom_right.lat
        || bounds.bottom_right.lon > collar.bottom_right.lon)
        return false;

      //both corners are inside collar so collar contains 
      return true;
    },
    getAggConfig: function (aggs, aggName) {
      let aggConfig = null;
      index = _.findIndex(aggs, function (agg) {
        return agg.schema.name === aggName;
      });
      if (index !== -1) {
        aggConfig = aggs[index];
      }
      return aggConfig;
    },
    /* 
     * @param rect {Array of Array(lat, lon)} grid rectangle 
     * created from KIBANA_HOME/src/ui/public/agg_response/geo_json/rows_to_features.js
     * @return {object}
     */
    getRectBounds: function(rect) {
      const RECT_LAT_INDEX = 0;
      const RECT_LON_INDEX = 1;
      let latMin = 90;
      let latMax = -90;
      let lonMin = 180;
      let lonMax = -180;
      rect.forEach(function(vertex) {
        if (vertex[RECT_LAT_INDEX] < latMin) latMin = vertex[RECT_LAT_INDEX];
        if (vertex[RECT_LAT_INDEX] > latMax) latMax = vertex[RECT_LAT_INDEX];
        if (vertex[RECT_LON_INDEX] < lonMin) lonMin = vertex[RECT_LON_INDEX];
        if (vertex[RECT_LON_INDEX] > lonMax) lonMax = vertex[RECT_LON_INDEX];
      });
      return {
        top_left: {
          lat: latMax,
          lon: lonMin
        }, 
        bottom_right: {
          lat: latMin,
          lon: lonMax
        }
      };
    },
    getMapStateFromVis: function(vis) {
      const mapState = {
        center: [15, 5],
        zoom: 2
      }
      if (vis.hasUiState()) {
        const uiStateCenter = vis.uiStateVal('mapCenter');
        if(uiStateCenter) mapState.center = uiStateCenter;
        const uiStateZoom = vis.uiStateVal('mapZoom');
        if(uiStateZoom) mapState.zoom = uiStateZoom;
      }
      return mapState;
    }
  }
});
define(function (require) {
  const _ = require('lodash');

  /**
   * Get the number of geohash cells for a given precision
   *
   * @param {number} precision the geohash precision (1<=precision<=12).
   * @param {number} axis constant for the axis 0=lengthwise (ie. columns, along longitude), 1=heightwise (ie. rows, along latitude).
   * @returns {number} Number of geohash cells (rows or columns) at that precision
   */
  function geohashCells(precision, axis) {
    let cells = 1;
    for (let i = 1; i <= precision; i += 1) {
      //On odd precisions, rows divide by 4 and columns by 8. Vice-versa on even precisions.
      cells *= (i % 2 === axis) ? 4 : 8;
    }
    return cells;
  }

  /**
   * Get the number of geohash columns (world-wide) for a given precision
   * @param precision the geohash precision
   * @returns {number} the number of columns
   */
  function geohashColumns(precision) {
    return geohashCells(precision, 0);
  }

  function precisionScale(maxPrecision) { 
    let zoomPrecision = {};
    const minGeohashPixels = 16;
    for (let zoom = 0; zoom <= 21; zoom += 1) {
      const worldPixels = 256 * Math.pow(2, zoom);
      zoomPrecision[zoom] = 1;
      for (let precision = 2; precision <= maxPrecision; precision += 1) {
        const columns = geohashColumns(precision);
        if ((worldPixels / columns) >= minGeohashPixels) {
          zoomPrecision[zoom] = precision;
        } else {
          break;
        }
      }
    }
    return zoomPrecision;
  }

  return {
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
    getMapStateFromVis: function(vis) {
      const mapState = {
        center: [15, 5],
        zoom: 2
      }
      _.keys(vis.aggs).forEach(function(key) {
        if(key !== 'vis' && _.has(vis.aggs[key], "params.mapCenter")) {
          mapState.center = vis.aggs[key].params.mapCenter;
          mapState.zoom = vis.aggs[key].params.mapZoom;
        }
      });
      return mapState;
    },
    getPrecision: function(zoom, maxPrecision) {
      const scale = precisionScale(maxPrecision);
      return scale[zoom];
    }
  }
});
define(function (require) {
  const _ = require('lodash');
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

      const topLeft = bounds.getNorthEast();
      const bottomRight = bounds.getSouthWest();
      let latDiff = Math.abs(topLeft.lat - bottomRight.lat);
      let lonDiff = Math.abs(bottomRight.lng - topLeft.lng);
      //map height can be zero when vis is first created
      if(latDiff === 0) latDiff = lonDiff;

      let topLeftLat = topLeft.lat + (latDiff * safeScale);
      if(topLeftLat > 90) topLeftLat = 90;
      let bottomRightLat = bottomRight.lat - (latDiff * safeScale);
      if(bottomRightLat < -90) bottomRightLat = -90;
      let topLeftLon = topLeft.lng - (lonDiff * safeScale);
      if(topLeftLon < -180) topLeftLon = -180;
      let bottomRightLon = bottomRight.lng + (lonDiff * safeScale);
      if(bottomRightLon > 180) bottomRightLon = 180;

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
    isGeoFilter: function(filter, field) {
      if (filter.meta.key === field
        || _.has(filter, 'geo_bounding_box.' + field)
        || _.has(filter, 'geo_polygon.' + field)
        || _.has(filter, 'or[0].geo_bounding_box.' + field)
        || _.has(filter, 'or[0].geo_polygon.' + field)) {
        return true;
      } else {
        return false;
      }
    }
  }
});
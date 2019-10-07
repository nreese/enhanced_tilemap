const _ = require('lodash');

module.exports = {
  analyseMultiPolygon: function (polygons, field) {
    const polygonFilters = [];
    const donutExclusions = [];
    _.each(polygons, polygon => {

      //creation of donuts to exclude and polygons to include documents from
      //geoJson spec states that index 0 is exterior polygon and
      //any additional arrays are donuts in the exterior polygon
      for (let i = 0; i < polygon.length; i++) {
        const geoPolygon = {};
        const polygonLocation = {};
        const geoDonut = {};
        const donutLocation = {};
        if (i === 0) {
          polygonLocation[field] = { points: polygon[i] };
          geoPolygon.geo_polygon = polygonLocation;
          polygonFilters.push(geoPolygon);
        } else {
          donutLocation[field] = { points: polygon[i] };
          geoDonut.geo_polygon = donutLocation;
          donutExclusions.push(geoDonut);
        }
      }
    });
    return {
      polygonsToFilter: polygonFilters,
      donutsToExclude: donutExclusions
    };
  },

  analyseSimplePolygon: function (newFilter, field) {
    const polygonFilters = [];
    const donutExclusions = [];
    const geoPolygon = {};
    const polygonLocation = {};
    const geoDonut = {};
    const donutLocation = {};

    const polygons = newFilter.geo_polygon[field].polygons;

    for (let i = 0; i < polygons.length; i++) {
      if (i === 0) {
        polygonLocation[field] = { points: polygons[i] };
        geoPolygon.geo_polygon = polygonLocation;
        polygonFilters.push(geoPolygon);
      } else if (polygons.length > 1) {
        donutLocation[field] = { points: polygons[i] };
        geoDonut.geo_polygon = donutLocation;
        donutExclusions.push(geoDonut);
      };
    };
    return {
      polygonsToFilter: polygonFilters,
      donutsToExclude: donutExclusions
    };
  }

};
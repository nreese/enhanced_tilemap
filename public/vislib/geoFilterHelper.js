const _ = require('lodash');

function createFilters(polygons, field) {
  const polygonFilters = [];
  const donutExclusions = [];
  const geoPolygon = {};
  const polygonLocation = {};
  const geoDonut = {};
  const donutLocation = {};

  //creation of donuts to exclude and polygons to include documents from
  //geoJson spec states that index 0 is exterior polygon and
  //any additional arrays are donuts in the exterior polygon
  for (let i = 0; i < polygons.length; i++) {
    if (i === 0) {
      polygonLocation[field] = { points: polygons[i] };
      geoPolygon.geo_polygon = polygonLocation;
      polygonFilters.push(geoPolygon);
    } else {
      donutLocation[field] = { points: polygons[i] };
      geoDonut.geo_polygon = donutLocation;
      donutExclusions.push(geoDonut);
    }
  }
  return {
    polygonFilters,
    donutExclusions
  };
}

module.exports = {

  analyseMultiPolygon: function (polygons, field) {
    let polygonFilters = [];
    let donutExclusions = [];
    _.each(polygons, polygon => {


      const filters = createFilters(polygon, field);
      polygonFilters = polygonFilters.concat(filters.polygonFilters);
      donutExclusions = donutExclusions.concat(filters.donutExclusions);
    });
    return {
      polygonsToFilter: polygonFilters,
      donutsToExclude: donutExclusions
    };
  },

  analyseSimplePolygon: function (newFilter, field) {
    const polygons = newFilter.geo_polygon[field].polygons;
    const filters = createFilters(polygons, field);
    return {
      polygonsToFilter: filters.polygonFilters,
      donutsToExclude: filters.donutExclusions
    };
  },
  rectFilter: function (fieldname, geotype, topLeft, bottomRight, meta) {
    let geofilter = null;
    if ('geo_point' === geotype) {
      geofilter = { geo_bounding_box: {} };
      geofilter.geo_bounding_box[fieldname] = {
        top_left: topLeft,
        bottom_right: bottomRight
      };
    } else if ('geo_shape' === geotype) {
      geofilter = { geo_shape: {} };
      geofilter.geo_shape[fieldname] = {
        shape: {
          type: 'envelope',
          coordinates: [
            [topLeft.lon, topLeft.lat],
            [bottomRight.lon, bottomRight.lat]
          ]
        }
      };
    } else {
      console.warn('unexpected geotype: ' + geotype);
    }

    if (meta) {
      geofilter.meta = meta;
    }
    return geofilter;
  }
};
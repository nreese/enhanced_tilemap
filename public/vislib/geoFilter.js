define(function (require) {
  const LAT_INDEX = 1;
  const LON_INDEX = 0;

  return function GeoFilterFactory(Private) {
    const _ = require('lodash');
    const queryFilter = Private(require('ui/filter_bar/query_filter'));

    function filterAlias(field, numBoxes) {
      return field + ": " + numBoxes + " geo filters"
    }

    function addGeoFilter(newFilter, field, indexPatternName) {
      let existingFilter = null;
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (isGeoFilter(it, field)) {
          existingFilter = it;
        }
      });

      if (existingFilter) {
        let geoFilters = _.flatten([newFilter]);
        let type = '';
        if (_.has(existingFilter, 'bool.should')) {
          geoFilters = geoFilters.concat(existingFilter.bool.should);
          type = 'bool';
        } else if (_.has(existingFilter, 'geo_bounding_box')) {
          geoFilters.push({geo_bounding_box: existingFilter.geo_bounding_box});
          type = 'geo_bounding_box';
        } else if (_.has(existingFilter, 'geo_polygon')) {
          geoFilters.push({geo_polygon: existingFilter.geo_polygon});
          type = 'geo_polygon';
        } else if (_.has(existingFilter, 'geo_shape')) {
          geoFilters.push({geo_shape: existingFilter.geo_shape});
          type = 'geo_shape';
        }
        queryFilter.updateFilter({
          model: { 
            bool : { 
              should : geoFilters
            } 
          },
          source: existingFilter,
          type: type,
          alias: filterAlias(field, geoFilters.length)
        });
      } else {
        let numFilters = 1;
        if (_.isArray(newFilter)) {
          numFilters = newFilter.length;
          newFilter = { 
            bool: {
              should: newFilter
            }
          };
        }
        newFilter.meta = {
          alias: filterAlias(field, numFilters), 
          negate: false, 
          index: indexPatternName, 
          key: field 
        };
        queryFilter.addFilters(newFilter);
      }
    }

    /**
     * Convert elasticsearch geospatial filter to leaflet vectors
     *
     * @method toVector
     * @param filter {Object} elasticsearch geospatial filter
     * @param field {String} Index field name for geo_point or geo_shape field
     * @return {Array} Array of Leaftet Vector Layers constructed from filter geometries
     */
    function toVector(filter, field) {
      let features = [];
      if (_.has(filter, ['bool', 'should'])) {
        _.get(filter, ['bool', 'should'], []).forEach(function(it) {
          features = features.concat(toVector(it, field));
        });
      } else if (_.has(filter, ['geo_bounding_box',  field])) {
        const topLeft = _.get(filter, ['geo_bounding_box', field, 'top_left']);
        const bottomRight = _.get(filter, ['geo_bounding_box', field, 'bottom_right']);
        if(topLeft && bottomRight) {
          const bounds = L.latLngBounds(
            [topLeft.lat, topLeft.lon], 
            [bottomRight.lat, bottomRight.lon]);
          features.push(L.rectangle(bounds));
        }
      } else if (_.has(filter, ['geo_distance', field])) {
        let distance_str = _.get(filter, ['geo_distance', 'distance']);
        let distance = 1000;
        if (_.includes(distance_str, 'km')) {
          distance = parseFloat(distance_str.replace('km', '')) * 1000;
        }
        const center = _.get(filter, ['geo_distance', field]);
        if(center) {
          features.push(L.circle([center.lat, center.lon], distance));
        }
      } else if (_.has(filter, ['geo_polygon', field])) {
        const points = _.get(filter, ['geo_polygon', field, 'points'], []);
        const latLngs = [];
        points.forEach(function(point) {
          const lat = point[LAT_INDEX];
          const lon = point[LON_INDEX];
          latLngs.push(L.latLng(lat, lon));
        });
        if(latLngs.length > 0) 
          features.push(L.polygon(latLngs));
      } else if (_.has(filter, ['geo_shape', field])) {
        const type = _.get(filter, ['geo_shape', field, 'shape', 'type']);
        if (type.toLowerCase() === 'envelope') {
          const envelope = _.get(filter, ['geo_shape', field, 'shape', 'coordinates']);
          const tl = envelope[0]; //topleft
          const br = envelope[1]; //bottomright
          const bounds = L.latLngBounds(
            [tl[LAT_INDEX], tl[LON_INDEX]], 
            [br[LAT_INDEX], br[LON_INDEX]]);
          features.push(L.rectangle(bounds));
        } else if (type.toLowerCase() === 'polygon') {
          coords = _.get(filter, ['geo_shape', field, 'shape', 'coordinates'])[0];
          const latLngs = [];
          coords.forEach(function(point) {
            const lat = point[LAT_INDEX];
            const lon = point[LON_INDEX];
            latLngs.push(L.latLng(lat, lon));
          });
          features.push(L.polygon(latLngs));
        } else {
          console.log("Unexpected geo_shape type: " + type);
        }
      }
      return features;
    }

    function getGeoFilters(field) {
      let filters = [];
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (isGeoFilter(it, field) && !_.get(it, 'meta.disabled', false)) {
          const features = toVector(it, field);
          filters = filters.concat(features);
        }
      });
      return filters;
    }

    function isGeoFilter(filter, field) {
      if (filter.meta.key === field
        || _.has(filter, ['geo_bounding_box', field])
        || _.has(filter, ['geo_distance', field])
        || _.has(filter, ['geo_polygon', field])
        || _.has(filter, ['geo_shape', field])
        || _.has(filter, ['bool', 'should', 0, 'geo_bounding_box', field])
        || _.has(filter, ['bool', 'should', 0, 'geo_distance', field])
        || _.has(filter, ['bool', 'should', 0, 'geo_polygon', field])
        || _.has(filter, ['bool', 'should', 0, 'geo_shape', field])) {
        return true;
      } else {
        return false;
      }
    }

    /**
     * Create elasticsearch geospatial rectangle filter
     *
     * @method rectFilter
     * @param fieldname {String} name of geospatial field in IndexPattern
     * @param geotype {String} geospatial datatype of field, geo_point or geo_shape
     * @param top_left {Object} top left lat and lon (decimal degrees)
     * @param bottom_right {Object} bottom right at and lon (decimal degrees)
     * @return {Object} elasticsearch geospatial rectangle filter
     */
    function rectFilter(fieldname, geotype, top_left, bottom_right) {
      let geofilter = null;
      if ('geo_point' === geotype) {
        geofilter = {geo_bounding_box: {}};
        geofilter.geo_bounding_box[fieldname] = {
          top_left: top_left,
          bottom_right: bottom_right
        };
      } else if ('geo_shape' === geotype) {
        geofilter = {geo_shape: {}};
        geofilter.geo_shape[fieldname] = {
          shape: {
            type: 'envelope',
            coordinates: [
              [top_left.lon, top_left.lat],
              [bottom_right.lon, bottom_right.lat]
            ]
          }
        };
      } else {
        console.warn('unexpected geotype: ' + geotype);
      }
      return geofilter;
    }

    return {
      add: addGeoFilter,
      isGeoFilter: isGeoFilter,
      getGeoFilters: getGeoFilters,
      rectFilter: rectFilter
    }
  }
});
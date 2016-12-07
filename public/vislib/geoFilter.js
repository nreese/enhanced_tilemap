define(function (require) {
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
        let geoFilters = [newFilter];
        let type = '';
        if (_.has(existingFilter, 'or')) {
          geoFilters = geoFilters.concat(existingFilter.or);
          type = 'or';
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
          model: { or : geoFilters },
          source: existingFilter,
          type: type,
          alias: filterAlias(field, geoFilters.length)
        });
      } else {
        newFilter.meta = { 
          negate: false, index: indexPatternName, key: field 
        };
        queryFilter.addFilters(newFilter);
      }
    }

    function filterToGeoJson(filter, field) {
      let features = [];
      if (_.has(filter, 'or')) {
        _.get(filter, 'or', []).forEach(function(it) {
          features = features.concat(filterToGeoJson(it, field));
        });
      } else if (_.has(filter, 'geo_bounding_box.' + field)) {
        const topLeft = _.get(filter, 'geo_bounding_box.' + field + '.top_left');
        const bottomRight = _.get(filter, 'geo_bounding_box.' + field + '.bottom_right');
        if(topLeft && bottomRight) {
          const coords = [];
          coords.push([topLeft.lon, topLeft.lat]);
          coords.push([bottomRight.lon, topLeft.lat]);
          coords.push([bottomRight.lon, bottomRight.lat]);
          coords.push([topLeft.lon, bottomRight.lat]);
          features.push({
            type: 'Polygon',
            coordinates: [coords]
          });
        }
      } else if (_.has(filter, 'geo_polygon.' + field)) {
        const points = _.get(filter, 'geo_polygon.' + field + '.points', []);
        const coords = [];
        points.forEach(function(point) {
          const lat = point[1];
          const lon = point[0];
          coords.push([lon, lat]);
        });
        if(coords.length > 0) features.push({
            type: 'Polygon',
            coordinates: [coords]
          });
      } else if (_.has(filter, 'geo_shape.' + field)) {
        const type = _.get(filter, 'geo_shape.' + field + '.shape.type');
        if (type.toLowerCase() === 'envelope') {
          const envelope = _.get(filter, 'geo_shape.' + field + '.shape.coordinates');
          const tl = envelope[0]; //topleft
          const br = envelope[1]; //bottomright
          const coords = [];
          coords.push([ tl[0], tl[1] ]);
          coords.push([ br[0], tl[1] ]);
          coords.push([ br[0], br[1] ]);
          coords.push([ tl[0], br[1] ]);
          features.push({
            type: 'Polygon',
            coordinates: [coords]
          });
        } else {
          features.push({
            type: type,
            coordinates: _.get(filter, 'geo_shape.' + field + '.shape.coordinates')
          });
        }
      }
      return features;
    }

    function getGeoFilters(field) {
      let filters = [];
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (isGeoFilter(it, field) && !_.get(it, 'meta.disabled', false)) {
          const features = filterToGeoJson(it, field);
          filters = filters.concat(features);
        }
      });
      return filters;
    }

    function isGeoFilter(filter, field) {
      if (filter.meta.key === field
        || _.has(filter, 'geo_bounding_box.' + field)
        || _.has(filter, 'geo_polygon.' + field)
        || _.has(filter, 'or[0].geo_bounding_box.' + field)
        || _.has(filter, 'or[0].geo_polygon.' + field)
        || _.has(filter, 'geo_shape.' + field)
        || _.has(filter, 'or[0].geo_shape.' + field)) {
        return true;
      } else {
        return false;
      }
    }

    return {
      add: addGeoFilter,
      isGeoFilter: isGeoFilter,
      toGeoJson: getGeoFilters
    }
  }
});
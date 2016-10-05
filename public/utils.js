import _ from 'lodash';

define(function (require) {
  return {
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
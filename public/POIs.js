const _ = require('lodash');
const L = require('leaflet');

define(function (require) {
  return function POIsFactory(Private, savedSearches) {

    const SearchSource = Private(require('ui/courier/data_source/search_source'));

    /**
     * Points of Interest
     *
     * Turns saved search results into easily consumible data for leaflet.
     */
    function POIs(params) {
      this.savedSearchId = params.savedSearchId;
      this.geoPointField = params.geoPointField;
      this.labelField = _.get(params, 'labelField', null);
      this.limit = _.get(params, 'limit', 100);
    }

    POIs.prototype.getPOIs = function (callback) {
      savedSearches.get(this.savedSearchId).then(savedSearch => {
        const searchSource = new SearchSource();
        //Do not filter POIs by time so can not inherit from rootSearchSource
        searchSource.inherits(false);
        searchSource.query(savedSearch.searchSource.get('query'));
        searchSource.filter(savedSearch.searchSource.get('filter'));
        searchSource.index(savedSearch.searchSource._state.index);
        searchSource.size(this.limit);
        searchSource.source(_.compact([ this.geoPointField, this.labelField ]));
        searchSource.fetch()
        .then(searchResp => {
          callback(_.map(searchResp.hits.hits, hit => {
            return {
              label: hit._source[this.labelField],
              latlng: extractLatLng(hit._source[this.geoPointField])
            }
          }));
        });
      });
    };

    //Extract lat and lon from geo, geo can be an array, string, or object
    function extractLatLng(geo) {
      let lat = 0;
      let lon = 0;
      if(_.isArray(geo)) {
        lat = geo[1];
        lon = geo[0];
      } else if (isString(geo)) {
        const split = geo.split(',');
        lat = split[0];
        lon = split[1];
      } else if (_.has(geo, 'lat') && _.has(geo, 'lon')) {
        lat = geo.lat;
        lon = geo.lon;
      }
      return L.latLng(lat, lon);
    }

    function isString(myVar) {
      let isString = false;
      if (typeof myVar === 'string' || myVar instanceof String) {
        isString = true;
      }
      return isString;
    }

    return POIs;
  }
});
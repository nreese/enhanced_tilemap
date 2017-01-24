const _ = require('lodash');
const L = require('leaflet');
import {markerIcon} from 'plugins/enhanced_tilemap/vislib/markerIcon';

define(function (require) {
  return function POIsFactory(Private, savedSearches) {

    const SearchSource = Private(require('ui/courier/data_source/search_source'));
    const queryFilter = Private(require('ui/filter_bar/query_filter'));

    /**
     * Points of Interest
     *
     * Turns saved search results into easily consumible data for leaflet.
     */
    function POIs(params) {
      this.savedSearchId = params.savedSearchId;
      this.geoField = params.geoField;
      //remain backwards compatible
      if (!params.geoField && params.geoPointField) {
        this.geoField = params.geoPointField
      }
      this.labelField = _.get(params, 'labelField', null);
      this.limit = _.get(params, 'limit', 100);
      this.syncFilters = _.get(params, 'syncFilters', false);
    }

    /**
     * @param {options} options: styling options
     * @param {Function} callback(layer)
          layer {ILayer}: Leaflet ILayer containing the results of the saved search
     */
    POIs.prototype.getLayer = function (options, callback) {
      const self = this;
      savedSearches.get(this.savedSearchId).then(savedSearch => {
        const geoType = savedSearch.searchSource._state.index.fields.byName[self.geoField].type;
        const searchSource = new SearchSource();
        if (this.syncFilters) {
          searchSource.inherits(savedSearch.searchSource);
          searchSource.filter(queryFilter.getFilters());
        } else {
          //Do not filter POIs by time so can not inherit from rootSearchSource
          searchSource.inherits(false);
          searchSource.index(savedSearch.searchSource._state.index);
          searchSource.query(savedSearch.searchSource.get('query'));
          searchSource.filter(savedSearch.searchSource.get('filter'));
        }
        searchSource.size(this.limit);
        //TODO - set source
        //source.excludes is undefined if source set. This causes courier to fail
        //searchSource.source(_.compact([ this.geoPointField, this.labelField ]));
        searchSource.fetch()
        .then(searchResp => {
          callback(self._createLayer(searchResp.hits.hits, geoType, options));
        });
      });
    };

    POIs.prototype._createLayer = function (hits, geoType, options) {
      layer = null;
      if ('geo_point' === geoType) {
        const markers = _.map(hits, hit => {
          return this._createMarker(hit, options);
        });
        layer = new L.FeatureGroup(markers);
      } else if ('geo_shape' === geoType) {
        const shapes = _.map(hits, hit => {
          return {
            type: 'Feature',
            properties: {
              label: _.get(hit._source, this.labelField)
            },
            geometry: hit._source[this.geoField]
          }
        });
        layer = L.geoJson(
          shapes,
          {
            onEachFeature: function (feature, thisLayer) {
              if (feature.properties.label) {
                thisLayer.bindPopup('<div>' + feature.properties.label + '</div>');
                thisLayer.on('mouseover', function(e) {
                  this.openPopup();
                });
                thisLayer.on('mouseout', function(e) {
                  this.closePopup();
                });
              }
            },
            pointToLayer: function (feature, latlng) {
              return L.circleMarker(
                latlng, 
                {
                  radius: 6
                });
            },
            style: {
              color: options.color,
              weight: 1.5,
              opacity: 0.65
            }
          });
      } else {
        console.warn('Unexpected feature geo type: ' + geoType);
      }
      return layer;
    };

    POIs.prototype._createMarker = function (hit, options) {
      const feature = L.marker(
        extractLatLng(hit._source[this.geoField]),
        {
          icon: markerIcon(options.color, options.size)
        });
      if (this.labelField) {
        feature.bindPopup('<div>' + hit._source[this.labelField] + '</div>');
        feature.on('mouseover', function(e) {
          this.openPopup();
        });
        feature.on('mouseout', function(e) {
          this.closePopup();
        });
      }
      return feature;
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
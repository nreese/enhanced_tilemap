const _ = require('lodash');
const L = require('leaflet');
import { markerIcon } from 'plugins/enhanced_tilemap/vislib/markerIcon';
import { toLatLng } from 'plugins/enhanced_tilemap/vislib/geo_point';

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
      this.popupFields = _.get(params, 'popupFields', []).map(function(obj) {
        return obj.name;
      });
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
        searchSource.source({
          includes: _.compact(_.flatten([this.geoField, this.popupFields])),
          excludes: []
        });
        searchSource.fetch()
        .then(searchResp => {
          callback(self._createLayer(searchResp.hits.hits, geoType, options));
        });
      });
    };

    POIs.prototype._createLayer = function (hits, geoType, options) {
      let layer = null;
      if ('geo_point' === geoType) {
        const markers = _.map(hits, hit => {
          return this._createMarker(hit, options);
        });
        layer = new L.FeatureGroup(markers);
      } else if ('geo_shape' === geoType) {
        const shapes = _.map(hits, hit => {
          const geometry = _.get(hit, `_source[${this.geoField}]`);
          geometry.type = capitalizeFirstLetter(geometry.type);
          let popupContent = false;
          if (this.popupFields.length > 0) {
            popupContent = this._popupContent(hit);
          }
          return {
            type: 'Feature',
            properties: {
              label: popupContent
            },
            geometry: geometry
          }
        });
        layer = L.geoJson(
          shapes,
          {
            onEachFeature: function (feature, thisLayer) {
              if (feature.properties.label) {
                thisLayer.bindPopup(feature.properties.label);
                thisLayer.on('mouseover', function(e) {
                  this.openPopup();
                });
                thisLayer.on('mouseout', function(e) {
                  this.closePopup();
                });
              }

              if (_.get(feature, 'geometry.type') === 'Polygon') {
                thisLayer.on('click', function(e) {
                  thisLayer._map.fire('etm:select-feature', {
                    geojson: thisLayer.toGeoJSON()
                  });
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
        toLatLng(_.get(hit, `_source[${this.geoField}]`)),
        {
          icon: markerIcon(options.color, options.size)
        });
      if (this.popupFields.length > 0) {
        feature.bindPopup(this._popupContent(hit));
        feature.on('mouseover', function(e) {
          this.openPopup();
        });
        feature.on('mouseout', function(e) {
          this.closePopup();
        });
      }
      return feature;
    };

    POIs.prototype._popupContent = function (hit) {
      let dlContent = '';
      this.popupFields.forEach(function(field) {
        dlContent += `<dt>${field}</dt><dd>${hit._source[field]}</dd>`
      });
      return `<dl>${dlContent}</dl>`;
    }

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    return POIs;
  }
});
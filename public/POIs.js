const _ = require('lodash');
const L = require('leaflet');
import { markerIcon } from 'plugins/enhanced_tilemap/vislib/markerIcon';
import { toLatLng } from 'plugins/enhanced_tilemap/vislib/geo_point';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import utils from 'plugins/enhanced_tilemap/utils';

define(function (require) {
  return function POIsFactory(Private, savedSearches) {

    const SearchSource = Private(SearchSourceProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));

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
        this.geoField = params.geoPointField;
      }
      this.popupFields = _.get(params, 'popupFields', []).map(function (obj) {
        return obj.name;
      });
      this.limit = _.get(params, 'limit', 100);
      this.syncFilters = _.get(params, 'syncFilters', false);
    }

    const getPopupParent = function (element, className) {
      let parent = element;
      while (parent != null) {
        if (parent.className && L.DomUtil.hasClass(parent, className)) {
          return parent;
        };
        parent = parent.parentNode;
      };
      return false;
    };

    /**
     * @param {options} options: styling options
     * @param {Function} callback(layer)
          layer {ILayer}: Leaflet ILayer containing the results of the saved search
     */
    POIs.prototype.getLayer = function (options, callback) {
      const self = this;
      savedSearches.get(this.savedSearchId).then(savedSearch => {
        const geoType = savedSearch.searchSource._state.index.fields.byName[self.geoField].type;

        function createMapExtentFilter(rect) {
          const bounds = rect.geo_bounding_box.geoBoundingBox;
          return geoFilter.rectFilter(rect.geoField.fieldname, rect.geoField.geotype, bounds.top_left, bounds.bottom_right);
        }

        const searchSource = new SearchSource();

        if (this.syncFilters) {
          searchSource.inherits(savedSearch.searchSource);
          const allFilters = queryFilter.getFilters();
          allFilters.push(createMapExtentFilter(options.mapExtentFilter));
          searchSource.filter(allFilters);
        } else {
          //Do not filter POIs by time so can not inherit from rootSearchSource
          searchSource.inherits(false);
          searchSource.index(savedSearch.searchSource._state.index);
          searchSource.query(savedSearch.searchSource.get('query'));
          searchSource.filter(createMapExtentFilter(options.mapExtentFilter));
        }
        searchSource.size(this.limit);
        searchSource.source({
          includes: _.compact(_.flatten([this.geoField, this.popupFields])),
          excludes: []
        });

        // assigning the placeholder value of 1000 POIs in the 
        // case where number in the limit field has been replaced with null
        let poiLimitToDisplay;
        if (this.limit) {
          poiLimitToDisplay = this.limit;
        } else {
          poiLimitToDisplay = 1000;
        }

        const tooManyDocsInfo = [
          `<i class="fa fa-exclamation-triangle text-color-warning doc-viewer-underscore"></i>`,
          `<b><p class="text-color-warning">There are undisplayed POIs for this overlay due <br>
                                            to having reached the limit currently set to: ${poiLimitToDisplay}</b>`
        ];

        //Removal of previous too many documents warning when map is changed to a new extent
        options.$legend.innerHTML = '';

        searchSource.fetch()
          .then(searchResp => {

            //Too many documents warning for each specific layer
            options.$legend.tooManyDocsInfo = '';

            if (searchResp.hits.total > this.limit) {
              options.$legend.innerHTML = tooManyDocsInfo[0];
              options.$legend.tooManyDocsInfo = tooManyDocsInfo;
            };
            callback(self._createLayer(searchResp.hits.hits, geoType, options));
          });
      });
    };

    POIs.prototype._createLayer = function _createLayer(hits, geoType, options) {
      let layer = null;
      const self = this;
      if ('geo_point' === geoType) {
        const markers = _.map(hits, hit => {
          return this._createMarker(hit, options);
        });
        layer = new L.FeatureGroup(markers);
        layer.destroy = () => {
          for (const marker of markers) {
            this._removeMouseEventsGeoPoint(marker);
          }
        };
      } else if ('geo_shape' === geoType) {
        const shapes = _.map(hits, hit => {
          const geometry = _.get(hit, `_source[${this.geoField}]`);
          if (geometry) {
            geometry.type = capitalizeFirstLetter(geometry.type);
          };

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
          };
        });
        layer = L.geoJson(
          shapes,
          {
            onEachFeature: function onEachFeature(feature, thisLayer) {
              if (feature.properties.label) {
                thisLayer.bindPopup(feature.properties.label);
                thisLayer.on('mouseover', self.addMouseOverGeoShape);
                thisLayer.on('mouseout', self.addMouseOutToGeoShape);
              }

              if (_.get(feature, 'geometry.type') === 'Polygon') {
                thisLayer._click = function fireEtmSelectFeature(e) {
                  thisLayer._map.fire('etm:select-feature', {
                    geojson: thisLayer.toGeoJSON()
                  });
                };
                self.addClickToGeoShape(thisLayer);
              }
            },
            pointToLayer: function pointToLayer(feature, latlng) {
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
          }
        );
        layer.destroy = () => {
          _.each(layer._layers, polygon => {
            polygon.off('mouseover', self.addMouseOverGeoShape);
            polygon.off('mouseout', self.addMouseOutToGeoShape);
            if (polygon._click) {
              polygon.off('click', polygon._click);
              polygon._click = null;
            }
          });
        };
      } else {
        console.warn('Unexpected feature geo type: ' + geoType);
      }
      layer.$legend = options.$legend;
      return layer;
    };

    //Mouse event creation for GeoShape
    POIs.prototype.addMouseOverGeoShape = function addMouseOverGeoShape(e) {
      this.openPopup();
    };
    POIs.prototype.addMouseOutToGeoShape = function addMouseOutToGeoShape(e) {  
      const self = this;

      self._popupMouseOut = function (e) {
        // detach the event
        L.DomEvent.off(self._map._popup._container, "mouseout", self._popupMouseOut, self);
        // get the element that the mouse hovered onto
        const target = e.toElement || e.relatedTarget;
        // check to see if the element is a popup
        if (getPopupParent(target, "leaflet-popup")) {
          return true;
        }
        self.closePopup();
      };

      const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;

      // check to see if the element is a popup
      if (getPopupParent(target, "leaflet-popup")) {
        L.DomEvent.on(self._map._popup._container, "mouseout", self._popupMouseOut, self);
        return true;
      }
      self.closePopup();
    };
    POIs.prototype.addClickToGeoShape = function addClickToGeoShape(polygon) {
      polygon.on('click', polygon._click);
    };

    //Mouse event creation and closing for GeoPoints
    POIs.prototype._getMouseOverGeoPoint = function _getMouseOverGeoPoint(content) {
      const popup = function (e) {
        L.popup({
          autoPan: false,
          maxHeight: 'auto',
          maxWidth: 'auto',
          offset: utils.popupOffset(this._map, content, e.latlng)
        })
          .setLatLng(e.latlng)
          .setContent(content)
          .openOn(this._map);
      };
      return popup;
    };

    POIs.prototype._addMouseOutGeoPoint = function (e) {
      const self = this;

      self._popupMouseOut = function (e) {
        // detach the event
        L.DomEvent.off(self._map._popup._container, "mouseout", self._popupMouseOut, self);
        // get the element that the mouse hovered onto
        const target = e.toElement || e.relatedTarget;
        // check to see if the element is a popup
        if (getPopupParent(target, "leaflet-popup")) {
          return true;
        }
        self._map.closePopup();
      };

      const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;

      // check to see if the element is a popup
      if (getPopupParent(target, "leaflet-popup")) {
        L.DomEvent.on(self._map._popup._container, "mouseout", self._popupMouseOut, self);
        return true;
      }
      self._map.closePopup();
    };
    POIs.prototype._addMouseEventsGeoPoint = function _addMouseEventsGeoPoint(feature, content) {
      feature.on('mouseover', this._getMouseOverGeoPoint(content));
      feature.on('mouseout', this._addMouseOutGeoPoint);
    };
    POIs.prototype._removeMouseEventsGeoPoint = function _removeMouseEventsGeoPoint(feature, content) {
      feature.off('mouseover', this._getMouseOverGeoPoint(content));
      feature.off('mouseout', this._addMouseOutGeoPoint);
    };

    POIs.prototype._createMarker = function (hit, options) {
      const feature = L.marker(
        toLatLng(_.get(hit, `_source[${this.geoField}]`)),
        {
          icon: markerIcon(options.color, options.size)
        });

      if (this.popupFields.length > 0) {
        const content = this._popupContent(hit);
        this._addMouseEventsGeoPoint(feature, content);
      }
      return feature;
    };

    POIs.prototype._popupContent = function _popupContent(hit) {
      let dlContent = '';
      this.popupFields.forEach(function (field) {
        dlContent += `<dt>${field}</dt><dd>${hit._source[field]}</dd>`;
      });
      return `<dl>${dlContent}</dl>`;
    };

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    return POIs;
  };
});

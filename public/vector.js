const _ = require('lodash');
const L = require('leaflet');
import { markerIcon } from 'plugins/enhanced_tilemap/vislib/markerIcon';
import { toLatLng } from 'plugins/enhanced_tilemap/vislib/geo_point';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import utils from 'plugins/enhanced_tilemap/utils';

define(function (require) {
  return function VectorFactory(Private, savedSearches) {

    const SearchSource = Private(SearchSourceProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));

    /**
     * Points of Interest
     *
     * Turns saved search results into easily consumible data for leaflet.
     */
    function Vector(geoJsonCollection) {
      //remain backwards compatible
      if (!_.isEqual(this._geoJsonCollection, geoJsonCollection)) {
        this._geoJsonCollection = geoJsonCollection;
      };
    }

    const getParentWithClass = function (element, className) {
      let parent = element;
      while (parent != null) {
        if (parent.className && L.DomUtil.hasClass(parent, className)) {
          return parent;
        };
        parent = parent.parentNode;
      };
      return false;
    };

    Vector.prototype.getLayer = function (options) {
      let layer = null;
      const self = this;

      //geometry type of the first feature used to determine the type of features present
      const geometry = self._geoJsonCollection.features[0].geometry;
      geometry.type = capitalizeFirstLetter(geometry.type);

      /*********************************************************************/
      //for now, there is no limit on number of geoJsons to be drawn
      //the below has been adapted to retain the functionality if desired.
      // options.$legend = {};
      // options.$legend.innerHTML = '';
      // options.$legend.tooManyDocsInfo = '';
      //this is an option to have a too many features in map extent button
      // if (self._geoJsonCollection.features.length > 100) {
      //   const tooManyDocsInfo = [
      //     `<i class="fa fa-exclamation-triangle text-color-warning doc-viewer-underscore"></i>`,
      //     `<b><p class="text-color-warning">There are undisplayed POIs for this overlay due <br>
      //                                         to having reached the limit currently set to: ${self._geoJsonCollection.features.length}</b>`
      //   ];
      //   options.$legend.innerHTML = tooManyDocsInfo[0];
      //   options.$legend.tooManyDocsInfo = tooManyDocsInfo;
      // }
      /*********************************************************************/

      if ('Point' === geometry.type) {
        const markers = _.map(self._geoJsonCollection.features, feature => {
          return self._createMarker(feature, options);
        });
        layer = new L.FeatureGroup(markers);
        layer.destroy = () => markers.forEach(self._removeMouseEventsPoint);

      } else if ('Polygon' === geometry.type ||
        'MultiPolygon' === geometry.type) {
        const shapes = _.map(self._geoJsonCollection.features, (feature) => {
          let popupContent = false;
          if (options.popupFields.length > 0) {
            popupContent = self._popupContent(feature, options.popupFields);
          }
          return {
            type: 'Feature',
            properties: {
              label: popupContent
            },
            geometry: feature.geometry
          };

        });
        layer = L.geoJson(
          shapes,
          {
            style: { color: options.color },
            onEachFeature: function onEachFeature(feature, polygon) {
              if (feature.properties.label) {

                const popupOptions = {
                  autoPan: false
                };

                const popup = L.popup(popupOptions)
                  .setContent(feature.properties.label);

                polygon.bindPopup(popup);
                polygon.on('mouseover', self.addMouseOverPolygon);
                polygon.on('mouseout', self.addMouseOutPolygon);
              }

              if (_.get(feature, 'geometry.type') === 'Polygon' ||
                _.get(feature, 'geometry.type') === 'MultiPolygon') {
                polygon._click = function fireEtmSelectFeature(e) {
                  polygon._map.fire('etm:select-feature-vector', {
                    args: {
                      _siren: options._siren,
                      geoFieldName: options.geoFieldName,
                      indexPattern: options.indexPattern,
                      vector: true,
                      type: feature.geometry.type
                    },
                    geojson: polygon.toGeoJSON()
                  });
                };
                polygon.on('click', polygon._click);
              }
            }
          }
        );
        layer.destroy = () => {
          _.each(layer._layers, polygon => {
            polygon.off('mouseover', self.addMouseOverPolygon);
            polygon.off('mouseout', self.addMouseOutPolygon);
            if (polygon._click) {
              polygon.off('click', polygon._click);
              polygon._click = null;
            }
          });
        };
      } else {
        console.warn('Unexpected feature geo type: ' + geometry.type);
      }
      layer.$legend = options.$legend;
      layer.id = options.id;
      return layer;
    };

    //Mouse event creation for GeoShape
    Vector.prototype.addMouseOverPolygon = function (e) {
      if (!e.target._map.disablePopups) {
        this.openPopup();
      };
    };

    Vector.prototype.addMouseOutPolygon = function (e) {
      const self = this;

      self._popupMouseOut = function (e) {
        // detach the event, if one exists
        if (self._map) {
          // get the element that the mouse hovered onto
          const target = e.toElement || e.relatedTarget;
          // check to see if the element is a popup
          if (getParentWithClass(target, 'leaflet-popup')) {
            return true;
          }
          L.DomEvent.off(self._map._popup._container, 'mouseout', self._popupMouseOut, self);
          self.closePopup();
        }
      };

      const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;

      // check to see if the element is a popup
      if (getParentWithClass(target, 'leaflet-popup')) {
        L.DomEvent.on(self._map._popup._container, 'mouseout', self._popupMouseOut, self);
        return true;
      }
      self.closePopup();
    };
    Vector.prototype.addClickToGeoShape = function (polygon) {
      polygon.on('click', polygon._click);
    };

    //Mouse event creation and closing for Points
    Vector.prototype._getMouseOverPoint = function (content) {
      const popup = function (e) {
        if (!e.target._map.disablePopups) {
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
      };
      return popup;
    };

    Vector.prototype._addMouseOutPoint = function (e) {
      const self = this;

      self._popupMouseOut = function (e) {
        // detach the event, if one exists
        if (self._map) {
          // get the element that the mouse hovered onto
          const target = e.toElement || e.relatedTarget;
          // check to see if the element is a popup
          if (getParentWithClass(target, 'leaflet-popup')) {
            return true;
          }
          L.DomEvent.off(self._map._popup._container, 'mouseout', self._popupMouseOut, self);
          self._map.closePopup();
        }
      };

      const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;

      // check to see if the element is a popup
      if (getParentWithClass(target, 'leaflet-popup')) {
        L.DomEvent.on(self._map._popup._container, 'mouseout', self._popupMouseOut, self);
        return true;
      }
      self._map.closePopup();
    };

    Vector.prototype._addMouseEventsPoint = function (feature, content) {
      feature.on('mouseover', this._getMouseOverPoint(content));
      feature.on('mouseout', this._addMouseOutPoint);
    };

    Vector.prototype._removeMouseEventsPoint = function (feature) {
      feature.off('mouseover');
      feature.off('mouseout');
    };

    Vector.prototype._createMarker = function (hit, options) {
      const feature = L.marker(
        toLatLng(hit.geometry.coordinates),
        {
          icon: markerIcon(options.color, options.size)
        });

      if (options.popupFields.length > 0) {
        const content = this._popupContent(hit, options.popupFields);
        this._addMouseEventsPoint(feature, content);
      }
      return feature;
    };

    Vector.prototype._popupContent = function (feature, popupFields) {
      let dlContent = '';
      popupFields.forEach(function (field) {
        const label = field.charAt(0).toUpperCase() + field.slice(1).toLowerCase();
        dlContent += `<dt>${label}</dt><dd>${feature.properties[field]}</dd>`;
      });
      return `<dl>${dlContent}</dl>`;
    };

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    return Vector;
  };
});

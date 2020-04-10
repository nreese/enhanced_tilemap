const _ = require('lodash');
const L = require('leaflet');
import { searchIcon } from 'plugins/enhanced_tilemap/vislib/searchIcon';
import { toLatLng } from 'plugins/enhanced_tilemap/vislib/geo_point';
import utils from 'plugins/enhanced_tilemap/utils';

export default class EsLayer {
  constructor() {
  }


  createLayer = function (hits, geo, type, options) {
    let layer = null;
    const self = this;

    //handling too many documents warnings
    options.$legend = options.$element.find('a.leaflet-control-layers-toggle').get(0);
    options.$legend.innerHTML = '';
    if (options.warning && options.warning.limit) {
      options.$legend.innerHTML = `<i class="fa fa-exclamation-triangle text-color-warning doc-viewer-underscore"></i>`;
    }

    if (geo) {
      geo.type = geo.type.toLowerCase();
      if ('geo_point' === geo.type || 'point' === geo.type) {
        options.searchIcon = _.get(options, 'searchIcon', 'fas fa-map-marker-alt');
        const markers = _.map(hits, hit => {
          const marker = self._createMarker(hit, geo.field, options);
          if (options.popupFields.length) {
            marker.content = this._popupContent(hit, options.popupFields);
          }
          return marker;
        });
        layer = new L.FeatureGroup(markers);
        layer.type = type + 'point';
        layer.options = { pane: 'overlayPane' };
        layer.icon = `<i class="${options.searchIcon}" style="color:${options.color};"></i>`;
        layer.destroy = () => {
          layer.unbindPopup();
        };
        self.bindPopup(layer, options);
      } else if ('geo_shape' === geo.type || 'polygon' === geo.type || 'multipolygon' === geo.type) {
        const shapesWithGeometry = _.remove(hits, hit => {
          return _.get(hit, `_source[${geo.field}]`);
        });

        const shapes = _.map(shapesWithGeometry, hit => {
          const geometry = _.get(hit, `_source[${geo.field}]`);

          geometry.type = self.capitalizeFirstLetter(geometry.type);
          if (geometry.type === 'Multipolygon') {
            geometry.type === 'MultiPolygon';
          }

          let popupContent = false;
          if (options.popupFields.length > 0) {
            popupContent = self._popupContent(hit, options.popupFields);
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
            onEachFeature: function onEachFeature(feature, polygon) {
              if (feature.properties.label) {
                polygon.bindPopup(feature.properties.label);
                polygon.on('mouseover', self.addMouseOverGeoShape);
                polygon.on('mouseout', self.addMouseOutToGeoShape);
              }

              if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
                polygon._click = function fireEtmSelectFeature() {
                  polygon._map.fire('etm:select-feature-vector', {
                    args: {
                      _siren: options._siren,
                      geoFieldName: options.geoFieldName,
                      indexPattern: options.indexPattern,
                      type: feature.geometry.type
                    },
                    geojson: polygon.toGeoJSON()
                  });
                };
                polygon.on('click', polygon._click, this);
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
              fillColor: options.color || '#8510d8',
              weight: 2,
              opacity: 1,
              color: options.color || '#000000',
              dashArray: '3',
              fillOpacity: 0.75
            },
            destroy: function onEachFeature(feature, polygon) {
              if (feature && options.leafletMap._popup) {
                if (feature.properties.label) {
                  polygon.off('mouseover', self.addMouseOverGeoShape);
                  polygon.off('mouseout', self.addMouseOutToGeoShape);
                  polygon.unbindPopup();
                }
                if (polygon._click) {
                  polygon.off('click', polygon._click, this);
                  polygon._click = null;
                }
              }
            }
          }
        );
        layer.icon = `<i class="far fa-stop" style="color:${options.color};"></i>`;
        layer.type = type + 'shape';
        layer.destroy = () => layer.options.destroy();
      } else {
        console.warn('Unexpected feature geo type: ' + geo.type);
      }

      layer.id = options.id;
      layer.label = options.displayName;

      if (options.warning && options.warning.limit) {
        layer.warning = `There are undisplayed POIs for this overlay due
      to having reached the limit currently set to ${options.warning.limit}`;
      }
      layer.filterPopupContent = options.filterPopupContent;
      layer.close = options.close;

      layer.layerGroup = options.layerGroup;

      return layer;
    } else {
      layer = L.geoJson();
      layer.id = options.id;
      layer.label = options.displayName;
      layer.icon = `<i class="far fa-question-square" style="color:${options.color};"></i>`;
      layer.options = { pane: 'overlayPane' };
      layer.type = type;
      return layer;
    }
  }


  /**
   * Binds popup and events to each feature on map
   *
   * @method bindPopup
   * @param feature {Object}
   * @param layer {Object}
   * return {undefined}
   */
  bindPopup = function (layer, options) {
    const self = this;
    const KEEP_POPUP_OPEN_CLASS_NAMES = ['leaflet-popup', 'tooltip'];

    self._popupMouseOut = function (e) {
      // get the element that the mouse hovered onto
      const target = e.toElement || e.relatedTarget;
      // check to see if the element is a popup
      if (utils.getParent(target, KEEP_POPUP_OPEN_CLASS_NAMES)) {
        return true;
      }
      // detach the event
      L.DomEvent.off(options.leafletMap._popup._container, 'mouseout', self._popupMouseOut, self);
      options.leafletMap.closePopup();
    };

    layer.on({
      mouseover: function (e) {
        self._showTooltip(e.layer.content, e.latlng, options.leafletMap);
      },

      mouseout: function (e) {
        const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;
        // check to see if the element is a popup
        if (utils.getParent(target, KEEP_POPUP_OPEN_CLASS_NAMES)) {
          L.DomEvent.on(options.leafletMap._popup._container, 'mouseout', self._popupMouseOut, self);
          return true;
        }
        options.leafletMap.closePopup();
      }
    });
  };

  _showTooltip = function (content, latLng, leafletMap) {
    if (!leafletMap) return;
    if (!content) return;

    const popupDimensions = {
      height: leafletMap.getSize().y * 0.9,
      width: Math.min(leafletMap.getSize().x * 0.9, 400)
    };

    L.popup({
      autoPan: false,
      maxHeight: popupDimensions.height,
      maxWidth: popupDimensions.width,
      offset: utils.popupOffset(leafletMap, content, latLng, popupDimensions)
    })
      .setLatLng(latLng)
      .setContent(content)
      .openOn(leafletMap);
  };

  //Mouse event creation for GeoShape
  addMouseOverGeoShape = function (e) {
    if (!e.target._map.disablePopups) {
      this.openPopup();
    }
  };
  addMouseOutToGeoShape = function (e) {
    const self = this;

    self._popupMouseOut = function (e) {
      // detach the event, if one exists
      if (self._map) {
        // get the element that the mouse hovered onto
        const target = e.toElement || e.relatedTarget;
        // check to see if the element is a popup
        if (utils.getParent(target, ['leaflet-popup'])) {
          return true;
        }
        L.DomEvent.off(self._map._popup._container, 'mouseout', self._popupMouseOut, self);
        self.closePopup();
      }
    };

    const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;

    // check to see if the element is a popup
    if (utils.getParent(target, ['leaflet-popup'])) {
      L.DomEvent.on(self._map._popup._container, 'mouseout', self._popupMouseOut, self);
      return true;
    }
    self.closePopup();
  };
  addClickToGeoShape = function (polygon) {
    polygon.on('click', polygon._click);
  };

  _createMarker = function (hit, geoField, options) {
    let hitCoords;
    if (_.has(hit, '_source.geometry.coordinates') && _.has(hit, '_source.geometry.type')) {
      hitCoords = hit._source.geometry.coordinates;
    } else {
      hitCoords = _.get(hit, `_source[${geoField}]`);
    }

    const feature = L.marker(
      toLatLng(hitCoords),
      {
        icon: searchIcon(options.searchIcon, options.color, options.size),
        pane: 'overlayPane'
      });
    return feature;
  };

  _popupContent = function (hit, popupFields) {
    let dlContent = '';
    popupFields.forEach(function (field) {
      dlContent += `<dt>${field}</dt><dd>${hit._source[field]}</dd>`;
    });
    return `<dl>${dlContent}</dl>`;
  };

  capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
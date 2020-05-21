const _ = require('lodash');
const L = require('leaflet');
import { searchIcon } from 'plugins/enhanced_tilemap/vislib/searchIcon';
import { toLatLng } from 'plugins/enhanced_tilemap/vislib/geo_point';
import utils from 'plugins/enhanced_tilemap/utils';

export default class EsLayer {
  constructor() {
  }


  createLayer = function (hits, geo, type, options) {
    const layerControl = options.$element.find('.leaflet-control-layers');
    let layer = null;
    const self = this;

    //handling too many documents warnings
    options.$legend = options.$element.find('a.leaflet-control-layers-toggle').get(0);
    options.$legend.innerHTML = '';
    layerControl.removeClass('leaflet-control-layers-warning');
    if (options.warning && options.warning.limit) {
      layerControl.addClass('leaflet-control-layers-warning');
      options.$legend.innerHTML = `<i class="fa fa-exclamation-triangle text-color-warning doc-viewer-underscore"></i>`;
    }

    if (geo.field) {
      //using layer level config
      const layerControlIcon = options.icon;
      const layerControlColor = options.color;
      geo.type = geo.type.toLowerCase();
      if ('geo_point' === geo.type || 'point' === geo.type) {
        options.icon = _.get(options, 'icon', 'fas fa-map-marker-alt');
        const markers = _.map(hits, hit => {

          if (type === 'es_ref') {
            self.assignFeatureLevelConfigurations(hit, geo.type, options);
          }
          const marker = self._createMarker(hit, geo.field, options);
          if (options.popupFields.length) {
            marker.content = this._popupContent(hit, options.popupFields);
          }
          return marker;
        });
        layer = new L.FeatureGroup(markers);
        layer.type = type + '_point';
        layer.options = { pane: 'overlayPane' };
        layer.icon = `<i class="${layerControlIcon}" style="color:${layerControlColor};"></i>`;
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

          if (type === 'es_ref') {
            self.assignFeatureLevelConfigurations(hit, geo.type, options);
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
                polygon.content = feature.properties.label;
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
        self.bindPopup(layer, options);
        layer.icon = `<i class="far fa-stop" style="color:${layerControlColor};"></i>`;
        layer.type = type + '_shape';
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


      if (options.visible === false) {
        layer.visible = options.visible;
      } else {
        layer.visible = true;
      }

      layer.layerGroup = options.layerGroup;

      return layer;
    } else {
      //when there is no data present for the current map canvas
      layer = L.geoJson();
      layer.id = options.id;
      layer.label = options.displayName;

      if (geo.type === 'point') {
        layer.icon = `<i class="${options.icon}" style="color:${options.color};"></i>`;
      } else {
        layer.icon = `<i class="far fa-stop" style="color:${options.color};"></i>`;
      }

      layer.options = { pane: 'overlayPane' };
      if (geo.type === 'point') {
        layer.type = type + '_point';
      } else {
        layer.type = type + '_shape';
      }

      layer.visible = options.visible || true;
      return layer;
    }
  }

  assignFeatureLevelConfigurations = function (hit, type, options) {
    const properties = hit._source.properties;
    if (type === 'point' || type === 'geo_point') {
      options.size = properties.size || options.size || 'm';
      options.icon = properties.icon || options.icon || 'far fa-question';
    }
    options.popupFields = properties.popupFields || options.popupFields || [];
    options.color = properties.color || options.color || '#FF0000';
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
        icon: searchIcon(options.icon, options.color, options.size),
        pane: 'overlayPane'
      });
    return feature;
  };

  _popupContent = function (hit, popupFields) {
    let dlContent = '';
    if(_.isArray(popupFields)) {
      popupFields.forEach(function (field) {
        let popupFieldValue;
        if (hit._source.properties) {
          popupFieldValue = hit._source.properties[field] || hit._source[field];
        } else {
          popupFieldValue = hit._source[field];
        }

        dlContent += `<dt>${field}</dt><dd>${popupFieldValue}</dd>`;
      });
    } else {
      dlContent = popupFields;
    }
    return `<dl>${dlContent}</dl>`;
  };

  capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

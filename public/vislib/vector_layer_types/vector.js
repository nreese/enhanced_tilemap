const _ = require('lodash');
const L = require('leaflet');
import { markerIcon } from 'plugins/enhanced_tilemap/vislib/icons/markerIcon';
import { toLatLng } from 'plugins/enhanced_tilemap/vislib/geo_point';
import { bindPopup } from './bindPopup';

/**
 * Vector overlay
 *
 * Turns geoJson into easily consumable layer for leaflet.
 */

export default class Vector {
  constructor(geoJsonCollection) {
    //remain backwards compatible
    if (!_.isEqual(this._geoJsonCollection, geoJsonCollection)) {
      this._geoJsonCollection = geoJsonCollection;
    }
  }

  getLayer = function (options) {
    let layer = null;
    const self = this;

    //geometry type of the first feature used to determine the type of features present
    const geometry = self._geoJsonCollection.features[0].geometry;
    geometry.type = self.capitalizeFirstLetter(geometry.type);

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
        const marker = self._createMarker(feature, options);
        if (options.popupFields.length) {
          marker.content = this._popupContent(feature, options.popupFields);
        }
        return marker;
      });
      layer = new L.FeatureGroup(markers);
      layer.destroy = () => {
        layer.unbindPopup();
      };
      bindPopup(layer, options);
      layer.id = options.id;
      layer.label = options.displayName;
      layer.type = 'vector_point';
      layer.options = { pane: 'overlayPane' };
      layer.icon = `<i class="fas fa-map-marker" style="color:${options.color};"></i>`;
    } else if ('Polygon' === geometry.type ||
      'MultiPolygon' === geometry.type) {
      const shapes = _.map(self._geoJsonCollection.features, (feature) => {
        let popupContent = false;
        if (options.popupFields.length > 0) {
          popupContent = self._popupContent(feature, options.popupFields);
        }
        return {
          id: feature.id,
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
          className: 'polygon-popup',
          style: { color: options.color },
          onEachFeature: function onEachFeature(feature, polygon) {
            if (feature.properties.label) {
              polygon.content = feature.properties.label;
            }

            if (_.get(feature, 'geometry.type') === 'Polygon' ||
              _.get(feature, 'geometry.type') === 'MultiPolygon') {
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
              polygon.on('click', polygon._click);
            }
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
      bindPopup(layer, options);
      layer.type = 'vectoroverlay';
      layer.label = options.displayName;
      layer.icon = `<i class="far fa-stop" style="color:${options.color};"></i>`;
      layer.destroy = () => layer.options.destroy();
    } else {
      console.warn('Unexpected feature geo type: ' + geometry.type);
    }
    layer.$legend = options.$legend;
    layer.visible = true;
    return layer;
  };

  addClickToGeoShape = function (polygon) {
    polygon.on('click', polygon._click);
  };

  _createMarker = function (hit, options) {
    const feature = L.marker(
      toLatLng(hit.geometry.coordinates),
      {
        className: 'point-popup',
        icon: markerIcon(options.color, options.size)
      });
    _.set(feature, 'feature.id', hit.id);

    return feature;
  };

  _popupContent = function (feature, popupFields) {
    let dlContent = '';
    popupFields.forEach(function (field) {
      const label = field.charAt(0).toUpperCase() + field.slice(1).toLowerCase();
      dlContent += `<dt>${label}</dt><dd>${feature.properties[field]}</dd>`;
    });
    return `<dl>${dlContent}</dl>`;
  };

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

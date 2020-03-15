import { remove } from 'lodash';

define(function () {
  return {
    /*
     * @param layer { Object } A leaflet Feature Group object
     * @param allLayers { Array } An array of Leaflet Feature Group objects
     * @param leafletMap { Object } A leaflet map object
     */
    addOrReplaceLayer: (layer, allLayers, leafletMap) => {
      let replaced = false;
      // replacing
      allLayers.forEach((item, i) => {
        if (item.id === layer.id) {
          allLayers[i] = layer;
          leafletMap.removeLayer(item);
          layer.setZIndex(allLayers.length - i);
          leafletMap.addLayer(layer);
          replaced = true;
        }
      });
      // adding new layer
      if (!replaced) {
        allLayers.push(layer);
        layer.setZIndex(0 - allLayers.length);
        leafletMap.addLayer(layer);
      }
    },
    removeLayerIfPresent: (layer, leafletMap) => {
      if (leafletMap.hasLayer(layer)) {
        leafletMap.removeLayer(layer);
        return layer;
      }
    },
    removeLayerById: (id, allLayers, leafletMap) => {
      remove(allLayers, (layer) => {
        if (layer.id === id) {
          this.removeLayerIfPresent(layer, leafletMap);
          return true;
        }
      });
    }
  };
});
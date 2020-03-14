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
      allLayers.forEach((item, i) => {
        if (item.id === layer.id) {
          leafletMap.removeLayer(item);
          leafletMap.addLayer(layer);
          // drawOnMapIfEnabled(layer, leafletMap);
          replaced = true;
          allLayers[i] = layer;
        }
      });
      if (!replaced) {
        leafletMap.addLayer(layer);
        allLayers.push(layer);
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
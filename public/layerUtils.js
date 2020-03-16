import { remove } from 'lodash';

function setZIndexOfAnyLayerType(layer, zIndex) {
  if (layer.type === 'wms') {
    layer.zIndex = zIndex;
    // } else if (layer.type === 'marker') {
    //   layer.setZIndexOffset(zIndex);
  } else {
    layer.setZIndex(zIndex);
  }
}

function redrawOverlays(allLayers, leafletMap) {
  for (let i = (allLayers.length - 1); i >= 0; i--) {
    leafletMap.removeLayer(allLayers[i]);
    if (allLayers[i].enabled) {
      const zIndex = i;
      setZIndexOfAnyLayerType(allLayers[i], zIndex);
      leafletMap.addLayer(allLayers[i]);
    }
  }
}

define(function () {
  return {
    /*
     * @param layer { Object } A leaflet Feature Group object
     * @param allLayers { Array } An array of Leaflet Feature Group objects
     * @param leafletMap { Object } A leaflet map object
     */
    addOrReplaceLayer: (layer, allLayers, leafletMap) => {
      let replaced = false;
      // replacing layer
      for (let i = 0; i <= (allLayers.length - 1); i++) {
        if (allLayers[i].id === layer.id) {
          leafletMap.removeLayer(allLayers[i]);
          allLayers[i] = layer;
          replaced = true;
          break;
        }
      }
      //adding layer
      if (!replaced) {
        allLayers.push(layer);
      }
      redrawOverlays(allLayers, leafletMap);
    },
    redrawOverlays,
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
    },
  };
});
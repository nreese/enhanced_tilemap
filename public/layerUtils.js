import { remove } from 'lodash';

function setZIndexOfAnyLayerType(layer, zIndex, leafletMap) {
  if (layer.type === 'poipoint' || layer.type === 'vectorpoint' || layer.type === 'marker') {
    layer.eachLayer(marker => {
      // const  pos = leafletMap.latLngToLayerPoint(marker.getLatLng()).round();
      marker.setZIndexOffset(zIndex);
    });
  } else {
    layer.setZIndex(zIndex);
  }
}

function redrawOverlays(allLayers, leafletMap) {
  clearAllLayersFromMap(leafletMap);
  for (let i = (allLayers.length - 1); i >= 0; i--) {
    if (allLayers[i].enabled) {
      const zIndex = (allLayers.length - 1) - i;
      setZIndexOfAnyLayerType(allLayers[i], zIndex, leafletMap);
      leafletMap.addLayer(allLayers[i]);
    }
  }
}

function orderLayersByType(allLayers) {
  // ensuring the ordering of markers, then overlays, then tile layers
  const tileLayersTemp = [];
  const overlaysTemp = [];
  const markerLayersTemp = [];
  allLayers.forEach((layer) => {
    if (layer.type === 'wms') {
      tileLayersTemp.push(layer);
    } else if (layer.type === 'marker' || layer.type === 'poipoint' || layer.type === 'vectorpoint') {
      markerLayersTemp.push(layer);
    } else {
      overlaysTemp.push(layer);
    }
  });
  return markerLayersTemp.concat(overlaysTemp).concat(tileLayersTemp);
}

function clearAllLayersFromMap(leafletMap) {
  leafletMap.eachLayer(function (layer) {
    if (layer.type !== 'base') {
      if (layer.destroy) {
        layer.destroy();
      }
      leafletMap.removeLayer(layer);
    }
  });
}

function clearAllLayersFromControl(allLayers) {
  allLayers = [];
  // for (let i = 0; i < allLayers.length; i++) {
  //   allLayers[i];
  // }
}

function removeAllLayersFromMapandControl(allLayers, leafletMap) {
  clearAllLayersFromMap(leafletMap);
  clearAllLayersFromControl(allLayers);
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
          allLayers[i] = layer;
          replaced = true;
          break;
        }
      }
      //adding layer
      if (!replaced) {
        allLayers.push(layer);
      }
      orderLayersByType(allLayers);
      redrawOverlays(allLayers, leafletMap);
    },

    removeAllLayersFromMapandControl,
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
    redrawOverlays,
    orderLayersByType,
  };
});
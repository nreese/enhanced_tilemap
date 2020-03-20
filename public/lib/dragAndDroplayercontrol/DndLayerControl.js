// ********************************************************************************
// This file is taken from the link below:
// https://github.com/ismyrnow/leaflet-groupedlayercontrol/pull/57
// It contains a 1 line fix and the npm version
// hasn't been updated yet. If at any point the npm version is updated,
// then the npm version of grouped-layerControl can replace this file
// Npm ink is:
//https://www.npmjs.com/package/leaflet-groupedlayercontrol
// ********************************************************************************

// A layer control which provides for layer groupings.
// Author: Ishmael Smyrnow

import { get } from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
// import { layerControlTree } from '../layerControlTree/layerContolTree';
import { LayerControlDnd } from './uiLayerControlDnd';


let _leafletMap;
let _reactElement;
let _allLayers;

function setZIndexOfAnyLayerType(layer, zIndex, leafletMap) {
  if (layer.type === 'poipoint' || layer.type === 'vectorpoint' || layer.type === 'marker') {
    layer.eachLayer(marker => {
      //The leaflet overlay pane has a z-index of 200
      //Marker layer types (i.e. poi and vector point layers) have been added to the overlay pane
      //AND require a 'hard' z-index to be set using setZIndexOffset
      //the default z-index is based on latitude and the below code resets the default
      const pos = leafletMap.latLngToLayerPoint(marker.getLatLng()).round();
      marker.setZIndexOffset(zIndex - pos.y + 198);
    });
  } else {
    layer.setZIndex(zIndex);
  }
}

function _orderLayersByType() {
  // ensuring the ordering of markers, then overlays, then tile layers
  const tileLayersTemp = [];
  const overlaysTemp = [];
  const markerLayersTemp = [];
  _allLayers.forEach((layer) => {
    if (layer.type === 'wms') {
      tileLayersTemp.push(layer);
    } else if (layer.type === 'marker' || layer.type === 'vectorpoint') {
      markerLayersTemp.push(layer);
    } else {
      overlaysTemp.push(layer);
    }
  });
  _allLayers = markerLayersTemp.concat(overlaysTemp).concat(tileLayersTemp);
}

function _redrawOverlays() {
  _clearAllLayersFromMap();
  let zIndex = 0;
  for (let i = (_allLayers.length - 1); i >= 0; i--) {
    if (_allLayers[i].enabled) {
      setZIndexOfAnyLayerType(_allLayers[i], zIndex, _leafletMap);
      _leafletMap.addLayer(_allLayers[i]);
    }
    zIndex++;
  }
}

function _addOrReplaceLayer(layer) {
  let replaced = false;
  for (let i = 0; i <= (_allLayers.length - 1); i++) {
    // replacing layer
    if (_allLayers[i].id === layer.id) {
      _allLayers[i] = layer;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    //adding layer
    _allLayers.push(layer);
  }
  _orderLayersByType();
  _redrawOverlays();
}

function _clearAllLayersFromMap() {
  _leafletMap.eachLayer(function (layer) {
    if (layer.type !== 'base') {
      // if (layer.destroy) {
      //   layer.destroy();
      // }
      _leafletMap.removeLayer(layer);
    }
  });
}

function _clearLayerFromMapById(id) {
  _leafletMap.eachLayer(function (layer) {
    if (layer.id === id) {
      if (layer.destroy) {
        layer.destroy();
      }
      _leafletMap.removeLayer(layer);
    }
  });
}

function dndLayerVisibilityChange(enabled, layer, index) {
  _allLayers[index].enabled = enabled;
  let type;
  if (enabled) {
    _redrawOverlays();
    type = 'showlayer';
  } else {
    _clearLayerFromMapById(layer.id);
    type = 'hidelayer';
  }

  _leafletMap.fire(type, {
    id: layer.id,
    enabled
  });
}

function dndListOrderChange(newList) {
  _allLayers = newList;
  _orderLayersByType();
  _redrawOverlays();
  _updateLayerControl();
}

function dndRemoveLayerFromControl(newList, id) {
  _allLayers = newList;
  _clearLayerFromMapById(id);
  _updateLayerControl();
  _leafletMap.fire('removelayer', { id });
}

function _updateLayerControl() {
  render(<LayerControlDnd
    dndCurrentListOrder={_allLayers}
    dndListOrderChange={dndListOrderChange}
    dndLayerVisibilityChange={dndLayerVisibilityChange}
    dndRemoveLayerFromControl={dndRemoveLayerFromControl}
  >
  </LayerControlDnd >, _reactElement);
}

function removeAllLayersFromMapandControl() {
  _clearAllLayersFromMap();
  _allLayers = [];
}
function removeLayerFromMapAndControlById(id) {
  _allLayers.filter(layer => layer.id === id);
  _clearLayerFromMapById(id);
}

function addOverlay(layer) {
  _addOrReplaceLayer(layer);
  _updateLayerControl();
}

function destroy() {
  _allLayers.forEach(layer => {
    if (layer.destroy) {
      layer.destroy();
    }
  });
  _allLayers = undefined;
}

L.Control.DndLayerControl = L.Control.extend({

  options: {
    collapsed: true,
    position: 'topright',
    id: 'ReactDom',
    autoZIndex: true,
    exclusiveGroups: [],
    groupCheckboxes: false
  },

  initialize: function (allLayers) {
    _allLayers = allLayers;
    this._lastZIndex = 0;
  },

  //todo add comments describing functions
  _addOrReplaceLayer,
  _updateLayerControl,
  addOverlay,
  removeAllLayersFromMapandControl,
  removeLayerFromMapAndControlById,
  destroy,

  onAdd: function (map) {
    _leafletMap = map;
    this._initLayout();
    return this._container;
  },

  onRemove: function () {
    unmountComponentAtNode(_reactElement);
  },

  addBaseLayer: function (layer, name) {
    this._addLayer(layer, name);
    return this;
  },

  _getLayer: function (id) {
    for (let i = 0; i < this._layers.length; i++) {
      if (this._layers[i] && L.stamp(this._layers[i].layer) === id) {
        return this._layers[i];
      }
    }
  },

  _initLayout: function () {
    const className = 'leaflet-control-layers';
    const container = this._container = L.DomUtil.create('div', className);

    // Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute('aria-haspopup', true);

    if (L.Browser.touch) {
      L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
      L.DomEvent.stopPropagation(container);
    } else {
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
    }

    const header = this._header = L.DomUtil.create('form', className + '-header');
    header.innerHTML = '<h4>Layers</h4>';

    //Injecting an element to render React component in
    const form = this._form = L.DomUtil.create('form', className + '-list');
    _reactElement = L.DomUtil.create('div');
    form.appendChild(_reactElement);
    _updateLayerControl();

    L.DomEvent.on(container, 'click', this._toggleLayerControl, this);
    L.DomUtil.create('a', className + '-toggle', container);

    container.appendChild(header);
    container.appendChild(form);
  },

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
  _createRadioElement: function (name, checked) {
    let radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
    if (checked) {
      radioHtml += ' checked="checked"';
    }
    radioHtml += '/>';

    const radioFragment = document.createElement('div');
    radioFragment.innerHTML = radioHtml;

    return radioFragment.firstChild;
  },

  _toggleLayerControl: function (e) {
    const className = get(e, 'toElement.form.className') || get(e, 'toElement.offsetParent.className');
    if (className.includes('leaflet-control-layers-list')) {
      return;
    } else if (!this._container.className.includes('leaflet-control-layers-expanded')) {
      L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
      //permits to have a scrollbar if overlays heighter than the map.
      const acceptableHeight = this._map._size.y - (this._container.offsetTop * 4);
      if (acceptableHeight < this._form.clientHeight) {
        L.DomUtil.addClass(this._form, 'leaflet-control-layers-scrollbar');
        this._form.style.height = acceptableHeight + 'px';
      } else {
        this._form.style.height = 'auto';
      }
    } else {
      L.DomUtil.removeClass(this._container, 'leaflet-control-layers-expanded');
    }
    // (!this._container.className.includes('leaflet-control-layers-expanded')
  },
  _indexOf: function (arr, obj) {
    for (let i = 0, j = arr.length; i < j; i++) {
      if (arr[i] === obj) {
        return i;
      }
    }
    return -1;
  }
});

L.control.dndLayerControl = function (allLayers) {
  return new L.Control.DndLayerControl(allLayers);
};

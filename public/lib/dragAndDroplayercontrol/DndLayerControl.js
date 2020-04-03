/* eslint-disable siren/memory-leak */
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

import { get, debounce, remove } from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { showAddLayerTreeModal } from './layerContolTree';
import { LayerControlDnd } from './uiLayerControlDnd';
import EsLayer from './../../vislib/vector_layer_types/EsLayer';

import {
  EuiButton
} from '@elastic/eui';


const mrisOnMap = [];
let _leafletMap;
let _dndListElement;
let _addLayerElement;
let _allLayers;
let esClient;
let $element;
let mainSearchDetails;

function _setZIndexOfAnyLayerType(layer, zIndex, leafletMap) {
  if (layer.type === 'poipoint' ||
    layer.type === 'vectorpoint' ||
    layer.type === 'marker' ||
    layer.type === 'mripoint') {
    layer.eachLayer(marker => {
      //The leaflet overlay pane has a z-index of 200
      //Marker layer types (i.e. poi and vector point layers) have been added to the overlay pane
      //AND require a 'hard' z-index to be set using setZIndexOffset
      //the default z-index is based on latitude and the below code resets the default
      const pos = leafletMap.latLngToLayerPoint(marker.getLatLng()).round();
      marker.setZIndexOffset(zIndex - pos.y + 300);// 198); //for now, we don't need to layer marker types with overlay types
    });
  } else {
    layer.setZIndex(zIndex);
  }
}

function _orderLayersByType() {
  // ensuring the ordering of markers, then overlays, then tile layers
  const tileLayersTemp = [];
  const overlaysTemp = [];
  const markerTemp = [];
  const markerLayersTemp = [];

  const pointTypes = ['poipoint', 'vectorpoint', 'mripoint'];
  _allLayers.forEach((layer) => {
    if (layer.type === 'wms') {
      tileLayersTemp.push(layer);
    } else if (layer.type === 'marker') {
      markerTemp.push(layer);
    } else if (pointTypes.includes(layer.type)) {
      markerLayersTemp.push(layer);
    } else {
      overlaysTemp.push(layer);
    }
  });
  _allLayers = markerTemp.concat(markerLayersTemp).concat(overlaysTemp).concat(tileLayersTemp);
}

function _redrawOverlays() {
  _clearAllLayersFromMap();
  let zIndex = 0;
  for (let i = (_allLayers.length - 1); i >= 0; i--) {
    const layer = _allLayers[i];
    if (layer.enabled) {
      _setZIndexOfAnyLayerType(layer, zIndex, _leafletMap);
      _leafletMap.addLayer(layer);
      zIndex++;
      _leafletMap.fire('showlayer', {
        id: layer.id,
        enabled: layer.enabled
      });
    }
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
      //todo thebelow should be executed, but need to keep events, I think
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

function _updateMriVisibility(id, enabled) {
  // when stored in layer control, mri path is the id
  for (let i = 0; mrisOnMap.length - 1; i++) {
    if (mrisOnMap[i].id === id || mrisOnMap[i].id.substring(3) === id) {
      mrisOnMap[i].enabled = enabled;
      break;
    }
  }
}

function dndLayerVisibilityChange(enabled, layer, index) {
  _allLayers[index].enabled = enabled;
  if (enabled) {
    _redrawOverlays();
  } else {
    _clearLayerFromMapById(layer.id);
    _leafletMap.fire('hidelayer', {
      id: layer.id,
      enabled
    });
  }
  if (layer.type === 'mripoint' || layer.type === 'mrishape') {
    _updateMriVisibility(layer.id, enabled);
  }
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
  _removeMriFromLayerControlArray(id);
  _leafletMap.fire('removelayer', { id });
}

function _removeMriFromLayerControlArray(path) {
  remove(mrisOnMap, (layer) => layer.path === path);
}

function _updateLayerControl() {
  render(<LayerControlDnd
    dndCurrentListOrder={_allLayers}
    dndListOrderChange={dndListOrderChange}
    dndLayerVisibilityChange={dndLayerVisibilityChange}
    dndRemoveLayerFromControl={dndRemoveLayerFromControl}
  >
  </LayerControlDnd >, _dndListElement);
}

async function getMriLayer(spatialPath, enabled) {
  const limit = 250;
  const resp = await esClient.search({
    index: '.map__*',
    body: {
      size: limit,
      query: {
        bool: {
          must: {
            term: {
              'spatial_path.raw': spatialPath
            }
          },
          filter: mainSearchDetails.mapExtentFilter()
        }
      }
    }
  });

  const options = {
    id: spatialPath,
    displayName: spatialPath,
    color: get(resp[0], 'properties.color', '#8510d8'),
    size: get(resp[0], 'properties.size', 'm'),
    popupFields: get(resp, 'properties.popup', []),
    indexPattern: mainSearchDetails.indexPattern,
    _siren: mainSearchDetails._siren,
    $element
  };

  let geo;
  if (resp.hits.total.value >= 1) {
    geo = {
      type: resp.hits.hits[0]._source.geometry.type,
      field: 'geometry'
    };
  }

  options.warning = {};
  if (resp.hits.total.value >= limit) {
    options.warning = { limit };
  }


  const layer = new EsLayer().createLayer(resp.hits.hits, geo, 'mri', options);
  layer.enabled = enabled;
  layer.close = true;
  return layer;
}

function addOverlay(layer) {
  _addOrReplaceLayer(layer);
  _updateLayerControl();
}


function _redrawMriLayers() {
  if (mrisOnMap.length >= 1) {
    mrisOnMap.forEach(async item => {
      if (item.enabled) {
        const layer = await getMriLayer(item.path, item.enabled);
        addOverlay(layer);
      }
    });
  }
}

function _createAddLayersButton() {
  render(<EuiButton
    size="s"
    onClick={() => showAddLayerTreeModal(esClient, addOverlay, mrisOnMap, getMriLayer)}
  >
    Add Layers
  </EuiButton>, _addLayerElement);
}

function removeAllLayersFromMapandControl() {
  _clearAllLayersFromMap();
  _allLayers = [];
}
function removeLayerFromMapAndControlById(id) {
  _allLayers.filter(layer => layer.id === id);
  _clearLayerFromMapById(id);
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

  initialize: function (allLayers, es, mSD, $el) {
    _allLayers = allLayers;
    esClient = es;
    mainSearchDetails = mSD;
    this._lastZIndex = 0;
    $element = $el;
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

    _leafletMap.on('moveend', debounce(() => {
      _redrawMriLayers();
    }, 150, false));

    _leafletMap.on('zoomend', debounce(() => {
      _redrawMriLayers();
    }, 150, false));

    this._initLayout();
    return this._container;
  },

  onRemove: function () {
    unmountComponentAtNode(_dndListElement);
    unmountComponentAtNode(_addLayerElement);
  },

  addBaseLayer: function (layer, name) {
    this._addLayer(layer, name);
    return this;
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
    _dndListElement = L.DomUtil.create('div');
    form.appendChild(_dndListElement);
    _updateLayerControl();

    const footer = this._footer = L.DomUtil.create('div', className + '-add-layer');
    _addLayerElement = L.DomUtil.create('div');
    footer.appendChild(_addLayerElement);
    _createAddLayersButton();

    L.DomEvent.on(container, 'click', this._toggleLayerControl, this);
    L.DomUtil.create('a', className + '-toggle', container);

    container.appendChild(header);
    container.appendChild(form);
    container.appendChild(footer);
  },

  _toggleLayerControl: function (e) {
    if (e.target !== this._container && e.target.offsetParent !== this._container) {
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
  }
});

L.control.dndLayerControl = function (allLayers, esClient, mainSearchDetails, $element) {
  return new L.Control.DndLayerControl(allLayers, esClient, mainSearchDetails, $element);
};

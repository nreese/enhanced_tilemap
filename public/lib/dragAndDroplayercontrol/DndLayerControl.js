/* eslint-disable siren/memory-leak */

import { debounce, remove, get, findIndex, pick, cloneDeep } from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { showAddLayerTreeModal } from './layerContolTree';
import { LayerControlDnd } from './uiLayerControlDnd';
import EsLayer from './../../vislib/vector_layer_types/EsLayer';

import { EuiButton } from '@elastic/eui';

function getExtendedMapControl() {
  let esRefLayersOnMap = [];
  let _leafletMap;
  let _dndListElement;
  let _addLayerElement;
  let _allLayers;
  let esClient;
  let $element;
  let mainSearchDetails;
  let _currentZoom;
  let geometryTypeOfSpatialPaths;
  let uiState;

  const _debouncedRedrawOverlays = debounce(_redrawOverlays, 400);

  function _updateCurrentZoom() {
    _currentZoom = _leafletMap.getZoom();
  }

  function _isHeatmapLayer(layer) {
    return layer.options && layer.options.blur;
  }

  function _visibleForCurrentMapZoom(config) {
    return _currentZoom >= config.minZoom && _currentZoom <= config.maxZoom;
  }

  function _setAvailableConfigs(config, foundConfig) {
    const configTypes = ['minZoom', 'maxZoom', 'icon', 'size', 'popupFields', 'color'];
    return Object.assign(pick(config, configTypes), foundConfig);
  }

  function _allConfigAssigned(foundConfig) {
    return (foundConfig.minZoom || foundConfig.minZoom === 0) &&
      (foundConfig.maxZoom || foundConfig.maxZoom === 0) &&
      foundConfig.popupFields &&
      foundConfig.color &&
      foundConfig.icon &&
      foundConfig.size;
  }

  function _getLayerLevelConfig(path, storedLayerConfig) {
    let foundConfig = {};
    const pathConstituents = path.split('/');

    //looking for sptial path that is most similar to actual path
    while (pathConstituents.length > 0 && !_allConfigAssigned(foundConfig)) {
      const currentPath = pathConstituents.join('/');
      const configIndex = findIndex(storedLayerConfig, (currentConfig) => currentConfig.spatial_path === currentPath);

      if (configIndex !== -1) {
        foundConfig = _setAvailableConfigs(storedLayerConfig[configIndex], foundConfig);
      }

      pathConstituents.pop();
    }

    if (!_allConfigAssigned(foundConfig)) {
      //use default if nothing else is found
      foundConfig = _setAvailableConfigs(storedLayerConfig[storedLayerConfig.length - 1], foundConfig);
    }

    return foundConfig;
  }

  function _setZIndexOfAnyLayerType(layer, zIndex, leafletMap) {
    if (layer.type === 'poi_point' ||
      layer.type === 'vector_point' ||
      layer.type === 'marker' ||
      layer.type === 'es_ref_point') {
      layer.eachLayer(marker => {
        //The leaflet overlay pane has a z-index of 200
        //Marker layer types (i.e. poi and vector point layers) have been added to the overlay pane
        //AND require a 'hard' z-index to be set using setZIndexOffset
        //the default z-index is based on latitude and the below code resets the default
        const pos = leafletMap.latLngToLayerPoint(marker.getLatLng()).round();
        marker.setZIndexOffset(zIndex - pos.y + 300);// 198); //for now, we don't need to layer marker types with overlay types
      });
    } else {
      if (!_isHeatmapLayer(layer)) {
        layer.setZIndex(zIndex);
      }
    }
  }

  function _orderLayersByType() {
    // ensuring the ordering of markers, then overlays, then tile layers
    const tileLayersTemp = [];
    const overlaysTemp = [];
    const markerTemp = [];
    const markerLayersTemp = [];

    const pointTypes = ['poi_point', 'vector_point', 'es_ref_point'];
    _allLayers.forEach((layer) => {
      if (layer.type === 'wms') {
        tileLayersTemp.push(layer);
      } else if (layer.type === 'marker') {
        markerTemp.push(layer);
      } else if (pointTypes.includes(layer.type)) {
        markerLayersTemp.push(layer);
      } else if (_isHeatmapLayer(layer)) {
        tileLayersTemp.unshift(layer);
      } else {
        overlaysTemp.push(layer);
      }
    });
    _allLayers = markerTemp.concat(markerLayersTemp).concat(overlaysTemp).concat(tileLayersTemp);
  }

  function _drawOverlays() {
    if (!_allLayers) {
      return;
    }
    let zIndex = 0;
    for (let i = (_allLayers.length - 1); i >= 0; i--) {
      const layer = _allLayers[i];
      if (layer.enabled && layer.visible) {
        _setZIndexOfAnyLayerType(layer, zIndex, _leafletMap);
        _leafletMap.addLayer(layer);
        zIndex++;
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
  }

  function _clearAllLayersFromMap() {
    _leafletMap.eachLayer(function (layer) {
      if (layer.type !== 'base') {
        //TODO investigate if this is causing memory leak
        if (layer.destroy) {
          layer.destroy();
        }
        _leafletMap.removeLayer(layer);
      }
    });
  }

  function _redrawOverlays() {
    _clearAllLayersFromMap();
    _drawOverlays();
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

  function _updateEsRefLayerVisibility(id, enabled) {
    // when stored in layer control, elastic map reference indices path is the id
    for (let i = 0; i < esRefLayersOnMap.length - 1; i++) {
      if (esRefLayersOnMap[i].id === id || esRefLayersOnMap[i].id.substring(3) === id) {
        esRefLayersOnMap[i].enabled = enabled;
        break;
      }
    }
  }

  function dndLayerVisibilityChange(enabled, layer, index) {
    _allLayers[index].enabled = enabled;
    if (enabled) {
      _redrawOverlays();
      _leafletMap.fire('showlayer', {
        layerType: layer.type,
        id: layer.id,
        enabled: enabled
      });
    } else {
      _clearLayerFromMapById(layer.id);
      _leafletMap.fire('hidelayer', {
        layerType: layer.type,
        id: layer.id,
        enabled
      });
    }
    if (layer.type === 'es_ref_point' || layer.type === 'es_ref_shape') {
      _updateEsRefLayerVisibility(layer.id, enabled);
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
    _redrawOverlays();
    _updateLayerControl();
    _removeEsRefFromLayerControlArray(id);
    _leafletMap.fire('removelayer', { id });
  }

  function _removeEsRefFromLayerControlArray(path) {
    remove(esRefLayersOnMap, (layer) => layer.path === path);
  }

  function _updateLayerControl() {
    render(<LayerControlDnd
      dndCurrentListOrder={_allLayers}
      dndListOrderChange={dndListOrderChange}
      dndLayerVisibilityChange={dndLayerVisibilityChange}
      dndRemoveLayerFromControl={dndRemoveLayerFromControl}
      mapContainerId={_leafletMap.getContainer().id}
    >
    </LayerControlDnd >, _dndListElement);
  }

  function _makeExistsForConfigFieldTypes(config) {
    //initial attempt to make sure that all feature level config types are retrived from layer with no data present on current map canvas
    const existsQueryArray = [];
    Object.keys(config).forEach(configType => {
      if (Array.isArray(config[configType]) && configType !== 'popupFields' && configType !== 'minZoom' && configType !== 'maxZoom') {
        existsQueryArray.push({ exists: { field: config[configType].toString() } });
      }
    });
    return existsQueryArray;
  }

  async function getEsRefLayer(spatialPath, enabled) {
    const config = _getLayerLevelConfig(spatialPath, mainSearchDetails.storedLayerConfig);
    const visibleForCurrentMapZoom = _visibleForCurrentMapZoom(config);
    const limit = 250;
    const filter = mainSearchDetails.mapExtentFilter();
    let noHitsForCurrentExtent = false;
    let resp;
    if (visibleForCurrentMapZoom) {
      resp = await esClient.search({
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
              filter
            }
          }
        }
      });
    }

    if (!resp) {
      //getting first object if not visible
      noHitsForCurrentExtent = true;
      resp = await esClient.search({
        index: '.map__*',
        body: {
          size: 1,
          query: {
            bool: {
              must: {
                term: {
                  'spatial_path.raw': spatialPath
                }
              },
              should: _makeExistsForConfigFieldTypes(config)
            }
          }
        }
      });
    }

    let hits = resp.hits.hits;
    const options = {
      id: spatialPath,
      displayName: spatialPath,
      indexPattern: mainSearchDetails.getIndexPatternId(),
      _siren: mainSearchDetails.getSirenMeta(),
      $element,
      leafletMap: _leafletMap,
      geoFieldName: mainSearchDetails.getGeoField().fieldname,
      visible: visibleForCurrentMapZoom
    };

    //assigning configurations to layer options
    Object.keys(config).forEach(configType => {
      if (Array.isArray(config[configType]) && configType !== 'popupFields') {
        //checking and assigning config from first hit for field level config types
        options[configType] = get(hits[0]._source, [config[configType]].toString());
      } else {
        options[configType] = config[configType];
      }
    });

    let geo;
    if (hits[0] && hits[0]._source && hits[0]._source.type) {
      geo = {
        type: hits[0]._source.geometry.type,
        field: 'geometry'
      };
    } else {
      geo = {
        type: geometryTypeOfSpatialPaths[spatialPath]
      };
    }

    if (noHitsForCurrentExtent) {
      hits = [];
    }

    options.warning = {};
    if (resp.hits.total.value >= limit) {
      options.warning = { limit };
    }

    const layer = new EsLayer().createLayer(hits, geo, 'es_ref', options);
    layer.enabled = enabled;
    layer.close = true;
    return layer;
  }

  async function addStoredLayers(list) {
    const esRefLayerList = [];
    _updateCurrentZoom();
    for (const item of list) {
      const layer = await getEsRefLayer(item.path, item.enabled);
      esRefLayerList.push(layer);
      if (layer.enabled) {
        _leafletMap.fire('showlayer', {
          layerType: layer.type,
          id: layer.id,
          enabled: layer.enabled
        });
      }
    }
    addOverlays(esRefLayerList);
    addEsRefLayers(list);
  }

  function addOverlays(layers) {
    layers.forEach(_addOrReplaceLayer);
    _orderLayersByType();
    _updateLayerControl();
    _debouncedRedrawOverlays();
  }

  async function _redrawEsRefLayers() {
    const esRefLayers = [];
    if (esRefLayersOnMap.length >= 1) {
      _updateCurrentZoom();
      for (const item of esRefLayersOnMap) {
        if (item.enabled) {
          const layer = await getEsRefLayer(item.path, item.enabled);
          esRefLayers.push(layer);
        }
      }
      addOverlays(esRefLayers);
    }
  }

  function addEsRefLayers(layers) {
    for (const layer of layers) {
      const itemOnMapIndex = findIndex(esRefLayersOnMap, itemOnMap => itemOnMap.id === layer.id);
      if (itemOnMapIndex !== -1) {
        esRefLayersOnMap[itemOnMapIndex] = layer;
      } else {
        esRefLayersOnMap.push(layer);
      }
    }
  }

  async function _getGeometryTypeOfSpatialPaths(aggs) {
    const layerTypes = {};
    const queryBodyTemplate = {
      query: {
        match: {
          'spatial_path.raw': {
            query: ''
          }
        }
      },
      _source: ['geometry', 'spatial_path'],
      size: 1
    };

    function getQueryBody() {
      const index = JSON.stringify({ index: '.map__*' }) + '\n';

      let queryBody = '';
      aggs.forEach(agg => {
        const individualQueryBody = cloneDeep(queryBodyTemplate);
        individualQueryBody.query.match['spatial_path.raw'].query = agg.key;
        queryBody = queryBody.concat(index);
        queryBody = queryBody.concat(JSON.stringify(individualQueryBody)) + '\n';
      });
      return queryBody;
    }


    const resp = await esClient.msearch({
      body: getQueryBody()
    });

    resp.responses.forEach(spatialPathDoc => {
      if (spatialPathDoc.hits.hits.length === 1) {
        const spaitalPathSource = spatialPathDoc.hits.hits[0]._source;

        let geometryType = 'point';
        if (spaitalPathSource.geometry.type.includes('Polygon')) {
          geometryType = 'polygon';
        }

        layerTypes[spaitalPathSource.spatial_path] = geometryType;
      }
    });
    return layerTypes;
  }

  function esRefLayerOnMap(id) {
    if (findIndex(esRefLayersOnMap, layer => layer.id === id) !== -1) {
      return true;
    }
  }

  function _createAddLayersButton() {
    render(
      <EuiButton
        size="s"
        onClick={() => showAddLayerTreeModal(esClient, addStoredLayers, esRefLayerOnMap, getPathList)}
      >
        Add Layers
      </EuiButton>
      , _addLayerElement);
  }

  async function getPathList() {
    const resp = await esClient.search({
      index: '.map__*',
      body: {
        query: { 'match_all': {} },
        aggs: {
          2: {
            terms: {
              field: 'spatial_path',
              order: { _key: 'asc' },
              size: 9999
            }
          }
        },
        size: 0
      }
    });

    if (resp.aggregations && resp.aggregations[2] && resp.aggregations[2].buckets) {
      return resp;
    }
  }

  async function loadSavedStoredLayers() {
    const resp = await getPathList();
    // a check if there are any stored layers
    if (resp) {
      const aggs = resp.aggregations[2].buckets;
      geometryTypeOfSpatialPaths = _getGeometryTypeOfSpatialPaths(aggs);
      const savedStoredLayers = [];

      aggs.forEach(agg => {
        const currentUiState = uiState.get(agg.key);
        if (currentUiState === 'se') { // saved and enabled on map
          savedStoredLayers.push({ id: agg.key, path: agg.key, enabled: true });
        } else if (currentUiState === 'sne') {  // saved but NOT enabled on map
          savedStoredLayers.push({ id: agg.key, path: agg.key, enabled: false });
        }
      });
      addStoredLayers(savedStoredLayers);
    }
  }

  function removeAllLayersFromMapandControl() {
    _clearAllLayersFromMap();
    _allLayers = [];
    esRefLayersOnMap = [];
  }

  function removeLayerFromMapAndControlById(id) {
    _allLayers.filter(layer => layer.id === id);
    esRefLayersOnMap.filter(layer => layer.id === id);
    _clearLayerFromMapById(id);
  }

  function setStoredLayerConfigs(newStoredLayerConfig) {
    mainSearchDetails.storedLayerConfig = newStoredLayerConfig;
  }

  function destroy() {
    _allLayers.forEach(layer => {
      if (layer.destroy) {
        layer.destroy();
      }
    });
    _leafletMap.off('click').off('wheel');
    _allLayers = undefined;
  }

  return L.Control.extend({

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
      uiState = mSD.uiState;
      this._lastZIndex = 0;
      $element = $el;
      loadSavedStoredLayers();
    },

    //todo add comments describing functions
    _addOrReplaceLayer, // maintains ordering for _allLayers, the master list of vis and stored layers
    _updateLayerControl, // updates react layer list component when layer editing interactions have taken place
    addOverlays,
    _orderLayersByType,
    removeAllLayersFromMapandControl,
    removeLayerFromMapAndControlById,
    destroy,
    setStoredLayerConfigs,
    _getLayerLevelConfig,
    _makeExistsForConfigFieldTypes,
    getPathList, // retrieves a list of spatial paths from indices with a .map__ prefix
    loadSavedStoredLayers, //checks the uiState for stored layers and draws the ones that are present

    getAllLayers: () => {
      return _allLayers;
    },

    onAdd: function (map) {
      const debouncedHandler = debounce(() => {
        _redrawEsRefLayers();
      }, 200);
      _leafletMap = map;
      _leafletMap.on('moveend', debouncedHandler);
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
      } else {
        L.DomUtil.removeClass(this._container, 'leaflet-control-layers-expanded');
      }
    }
  });
}

L.control.dndLayerControl = function (allLayers, esClient, mainSearchDetails, $element) {
  const ExtendedMapControl = getExtendedMapControl();
  return new ExtendedMapControl(allLayers, esClient, mainSearchDetails, $element);
};

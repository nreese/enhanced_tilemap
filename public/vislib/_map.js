/* eslint-disable siren/memory-leak */
/* eslint-disable siren/memoryleaks */
import { markerIcon } from 'plugins/enhanced_tilemap/vislib/markerIcon';

define(function (require) {
  return function MapFactory(Private) {
    const formatcoords = require('formatcoords');
    const mgrs = require('mgrs/dist/mgrs.js');
    const _ = require('lodash');
    const $ = require('jquery');
    const L = require('leaflet');
    require('leaflet-draw');
    const LDrawToolbench = require('./LDrawToolbench');

    require('leaflet-mouse-position');
    require('leaflet.nontiledlayer');
    require('../lib/dragAndDroplayercontrol/DndLayerControl.js');
    require('./../lib/leaflet.setview/L.Control.SetView.css');
    require('./../lib/leaflet.setview/L.Control.SetView');
    require('./../lib/leaflet.measurescale/L.Control.MeasureScale.css');
    require('./../lib/leaflet.measurescale/L.Control.MeasureScale');
    const syncMaps = require('./sync_maps');

    const defaultMapZoom = 2;
    const defaultMapCenter = [15, 5];
    const defaultMarkerType = 'Scaled Circle Markers';

    const mapTiles = {
      url: '//a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
      }
    };
    const markerTypes = {
      'Scaled Circle Markers': Private(require('./marker_types/scaled_circles')),
      'Shaded Circle Markers': Private(require('./marker_types/shaded_circles')),
      'Shaded Geohash Grid': Private(require('./marker_types/geohash_grid')),
      'Heatmap': Private(require('./marker_types/heatmap')),
    };

    /**
     * Tile Map Maps
     *
     * @class Map
     * @constructor
     * @param container {HTML Element} Element to render map into
     * @param params {Object} Parameters used to build a map
     */
    function TileMapMap(container, params) {
      this._container = container;
      this.allLayers = [];
      this.$element = params.$element;
      this.esClient = params.es;
      // keep a reference to all of the optional params
      this.mainSearchDetails = params.mainSearchDetails;
      this.uiState = params.uiState;
      this._callbacks = _.get(params, 'callbacks');
      this._setMarkerType(params.mapType);
      const centerArray = _.get(params, 'center') || defaultMapCenter;
      this._mapCenter = L.latLng(centerArray[0], centerArray[1]);
      this._mapZoom = _.get(params, 'zoom') || defaultMapZoom;
      this._setAttr(params.attr);
      this._isEditable = params.editable || false;

      const mapOptions = {
        minZoom: 1,
        maxZoom: 18,
        noWrap: true,
        maxBounds: L.latLngBounds([-90, -220], [90, 220]),
        scrollWheelZoom: _.get(params.attr, 'scrollWheelZoom', true),
        fadeAnimation: false,
        syncMap: params.syncMap
      };

      this._createMap(mapOptions);
    }

    TileMapMap.prototype._addDrawControl = function () {
      if (this._drawControl) return;

      //create Markers feature group and add saved markers
      this._drawnItems = new L.FeatureGroup();
      // this._drawnItems.options = { pane: 'overlayPane' };
      const self = this;
      this._attr.markers.forEach(function (point) {
        let color = 'green';
        if (point.length === 3) {
          color = point.pop();
        }
        self._drawnItems.addLayer(
          L.marker(
            point,
            {
              icon: markerIcon(color),
              // pane: 'overlayPane'
            })
        );
      });

      this._drawnItems.id = 'Markers';
      this._drawnItems.label = 'Markers';
      this._drawnItems.type = 'marker';
      this._drawnItems.icon = '<i class="fas fa-map-marker" style="color:green";"></i>';
      this._drawnItems.enabled = this.uiState.get('Markers') || true;
      this._layerControl.addOverlay(this._drawnItems);

      //https://github.com/Leaflet/Leaflet.draw
      const drawOptions = {
        draw: {
          circle: true,
          marker: {
            icon: markerIcon('green')
          },
          polygon: {},
          polyline: false,
          rectangle: {
            shapeOptions: {
              stroke: false,
              color: '#000'
            }
          },
          circlemarker: false
        },
        edit: {
          featureGroup: this._drawnItems,
          edit: false
        }
      };
      //Do not show marker and remove buttons when visualization is displayed in dashboard, i.e. not editable
      if (!this._isEditable) {
        drawOptions.draw.marker = false;
        drawOptions.edit.remove = false;
      }

      this._drawControl = new L.Control.Draw(drawOptions);
      this.leafletMap.addControl(this._drawControl);

      this._toolbench = new LDrawToolbench(this.leafletMap, this._drawControl);
    };

    TileMapMap.prototype._addSetViewControl = function () {
      if (this._setViewControl) return;

      this._setViewControl = new L.Control.SetView();
      this.leafletMap.addControl(this._setViewControl);
    };

    TileMapMap.prototype._addMousePositionControl = function () {
      if (this._mousePositionControl) return;

      this._mousePositionControl = L.control.mousePosition({
        emptyString: '',
        formatters: [
          function (lat, lon) {
            return L.Util.formatNum(lat, 5) + ':' + L.Util.formatNum(lon, 5);
          },
          function (lat, lon) {
            return formatcoords(lat, lon).format('DD MM ss X', {
              latLonSeparator: ':',
              decimalPlaces: 2
            });
          },
          function (lat, lon) {
            return mgrs.forward([lon, lat]);
          }
        ]
      });
      this.leafletMap.addControl(this._mousePositionControl);
    };

    /**
     * Adds label div to each map when data is split
     *
     * @method addTitle
     * @param mapLabel {String}
     * @return {undefined}
     */
    TileMapMap.prototype.addTitle = function (mapLabel) {
      if (this._label) return;

      const label = this._label = L.control();

      label.onAdd = function () {
        this._div = L.DomUtil.create('div', 'tilemap-info tilemap-label');
        this.update();
        return this._div;
      };
      label.update = function () {
        this._div.innerHTML = '<h2>' + _.escape(mapLabel) + '</h2>';
      };

      // label.addTo(this.map);
      this.leafletMap.addControl(label);
    };

    /**
     * remove css class for desat filters on map tiles
     *
     * @method saturateTile
     * @return undefined
     */
    TileMapMap.prototype.saturateTile = function (isDesaturated, overlay) {
      if (isDesaturated) {
        if (overlay instanceof L.NonTiledLayer) {
          $(overlay._div).addClass('no-filter');
        } else {
          $(overlay.getContainer()).removeClass('no-filter');
        }
      } else {
        if (overlay instanceof L.NonTiledLayer) {
          $(overlay._div).removeClass('no-filter');
        } else {
          $(overlay.getContainer()).addClass('no-filter');
        }
      }
    };

    TileMapMap.prototype.updateSize = function () {
      this.leafletMap.invalidateSize({
        debounceMoveend: true
      });
    };

    TileMapMap.prototype.removeAllLayersFromMapandControl = function () {
      this._layerControl.removeAllLayersFromMapandControl();
    };

    TileMapMap.prototype.destroy = function () {
      this._destroyMapEvents();
      if (this._label) this._label.removeFrom(this.leafletMap);
      if (this._fitControl) this._fitControl.removeFrom(this.leafletMap);
      if (this._drawControl) this._drawControl.remove(this.leafletMap);
      if (this._markers) this._markers.destroy();
      if (this._layerControl) this._layerControl.destroy();
      syncMaps.remove(this.leafletMap);
      this.leafletMap.remove();
      this.leafletMap = undefined;
    };

    TileMapMap.prototype.removeLayerFromMapAndControlById = function (id) {
      this._layerControl.removeLayerFromMapAndControlById(id);
    };

    TileMapMap.prototype.addPOILayer = function (layer) {
      const id = layer.id;
      if (this.uiState.get(id) || this.uiState.get(id) === undefined) layer.enabled = true;
      this._layerControl.addOverlay(layer);

      //Add tool to l.draw.toolbar so users can filter by POIs
      if (Object.keys(this.allLayers).length === 1) {
        if (this._toolbench) this._toolbench.removeTools();
        if (!this._toolbench) this._addDrawControl();
        this._toolbench.addTool();
      }
    };

    TileMapMap.prototype.addVectorLayer = function (layer) {
      const id = layer.id;
      layer.enabled = this.uiState.get(id) || true;
      this._layerControl.addOverlay(layer);

      //Add tool to l.draw.toolbar so users can filter by vector layers
      if (Object.keys(this.allLayers).length === 1) {
        if (this._toolbench) this._toolbench.removeTools();
        if (!this._toolbench) this._addDrawControl();
        this._toolbench.addTool();
      }
    };

    /**
     * Switch type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     *
     * @method _addMarkers
     */
    TileMapMap.prototype.addMarkers = function (chartData, newParams, tooltipFormatter, valueFormatter, collar) {
      this._setMarkerType(newParams.mapType);
      this._setAttr(newParams);
      this._chartData = chartData;
      this._geoJson = _.get(chartData, 'geoJson');
      this._collar = collar;

      let prevState = null;
      if (this._markers) {
        prevState = this._markers.destroy();
      }

      this._markers = this._createMarkers({
        uiState: this.uiState,
        tooltipFormatter: tooltipFormatter,
        valueFormatter: valueFormatter,
        prevState: prevState,
        attr: this._attr
      });
    };

    /**
     * Display geospatial filters as map layer to provide
     * users context for all applied filters
     */
    TileMapMap.prototype.addFilters = function (filters) {
      if (this._filters) {
        if (this.leafletMap.hasLayer(this._filters)) {
          this._filters.enabled = true;
        }
      }

      const style = {
        fillColor: '#ccc',
        color: '#777777',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.75
      };
      this._filters = L.featureGroup(filters);
      this._filters.setStyle(style);
      this._filters.id = 'Geo Filters';
      this._filters.label = 'Geo Filters';
      this._filters.type = 'filter';
      this._filters.icon = `<i class="far fa-filter" style="color:${style.color};"></i>`;
      // the uiState takes precedence
      this._filters.enabled = this.uiState.get(this._filters.id);
      this._layerControl.addOverlay(this._filters);
    };

    TileMapMap.prototype.addWmsOverlay = function (url, name, wmsOptions, options, id) {

      let overlay = null;
      if (options.nonTiled) {
        overlay = new L.NonTiledLayer.WMS(url, wmsOptions);
      } else {
        overlay = L.tileLayer.wms(url, wmsOptions);
      }

      overlay.layerOptions = options;
      overlay.id = id;
      overlay.type = 'wms';
      overlay.label = name;
      overlay.icon = `<i class="fas fa-map" style="color:#000000;"></i>`;
      // if (options.enabled) this.leafletMap.addLayer(overlay);

      const presentInUiState = this.uiState.get(id);
      if (presentInUiState) {
        overlay.enabled = true;
      } else if (presentInUiState === false) {
        overlay.enabled = false;
      }

      this._layerControl.addOverlay(overlay, options);
      this.saturateTile(this._attr.isDesaturated, overlay);
    };

    TileMapMap.prototype.saturateWMSTiles = function () {
      this.allLayers.forEach(layer => {
        if (layer.type === 'wms') {
          this.saturateTile(this._attr.isDesaturated, layer);
        }
      });
    };

    TileMapMap.prototype.mapBounds = function () {
      let bounds = this.leafletMap.getBounds();

      //When map is not visible, there is no width or height.
      //Need to manually create bounds based on container width/height
      if (bounds.getNorthWest().equals(bounds.getSouthEast())) {
        let parent = this._container.parentNode;
        while (parent.clientWidth === 0 && parent.clientHeight === 0) {
          parent = parent.parentNode;
        }

        const southWest = this.leafletMap.layerPointToLatLng(L.point(parent.clientWidth / 2 * -1, parent.clientHeight / 2 * -1));
        const northEast = this.leafletMap.layerPointToLatLng(L.point(parent.clientWidth / 2, parent.clientHeight / 2));
        bounds = L.latLngBounds(southWest, northEast);
      }
      return bounds;
    };

    /**
     * Create the marker instance using the given options
     *
     * @method _createMarkers
     * @param options {Object} options to give to marker class
     * @return {Object} marker layer
     */
    TileMapMap.prototype._createMarkers = function (options) {
      const MarkerType = markerTypes[this._markerType];
      return new MarkerType(this.leafletMap, this._geoJson, this._layerControl, options);
    };

    TileMapMap.prototype.unfixMapTypeTooltips = function () {
      this._markers.unfixTooltips();
    };

    TileMapMap.prototype._setMarkerType = function (markerType) {
      this._markerType = markerTypes[markerType] ? markerType : defaultMarkerType;
    };

    TileMapMap.prototype._setAttr = function (attr) {
      this._attr = attr || {};

      //Ensure plugin is backwards compatible with old saved state values
      if ('static' === this._attr.scaleType) {
        this._attr.scaleType = 'Static';
      } else if ('dynamic' === this._attr.scaleType) {
        this._attr.scaleType = 'Dynamic - Linear';
      }

      //update map options based on new attributes
      if (this.leafletMap) {
        if (this._attr.scrollWheelZoom) {
          this.leafletMap.scrollWheelZoom.enable();
        } else {
          this.leafletMap.scrollWheelZoom.disable();
        }
      }
    };

    TileMapMap.prototype._destroyMapEvents = function () {
      const allEvents = [
        'draw:drawstart',
        'draw:drawstop',
        'draw:created',
        'draw:deleted',
        'setview:fitBounds',
        'groupLayerControl:removeClickedLayer',
        'moveend',
        'etm:select-feature',
        'etm:select-feature-vector',
        'toolbench:poiFilter',
        'zoomend',
        'overlayadd',
        'overlayremove'
      ];

      allEvents.forEach(event => {
        this.leafletMap.off(event);
      });
    };

    TileMapMap.prototype._attachEvents = function () {
      const self = this;

      this.leafletMap.on('removeLayer', (e) => {
        const id = e.layerId;
        if (_.has(this.allLayers, id)) {
          const layer = this.allLayers[id];
          this.allLayers[id].destroy();
          this.leafletMap.removeLayer(layer);
          delete this.allLayers[id];
        }
      });

      this.leafletMap.on('etm:select-feature-vector', function (e) {
        self._callbacks.polygonVector({
          args: e.args,
          params: self._attr,
          points: e.geojson.geometry.coordinates
        });
      });

      //stop popups appearing when drawing has started
      this.leafletMap.on('draw:drawstart', function () {
        this.disablePopups = true;
      });

      //start popups appearing finished drawing
      this.leafletMap.on('draw:drawstop', function () {
        this.disablePopups = false;
      });

      this.leafletMap.on('draw:deleted', function (e) {
        self._callbacks.deleteMarkers({
          chart: self._chartData,
          deletedLayers: e.layers,
        });
      });
    };

    TileMapMap.prototype._hasSameLocation = function () {
      const oldLat = this._mapCenter.lat.toFixed(5);
      const oldLon = this._mapCenter.lng.toFixed(5);
      const newLat = this.leafletMap.getCenter().lat.toFixed(5);
      const newLon = this.leafletMap.getCenter().lng.toFixed(5);
      let isSame = false;
      if (oldLat === newLat
        && oldLon === newLon
        && this.leafletMap.getZoom() === this._mapZoom) {
        isSame = true;
      }
      return isSame;
    };

    TileMapMap.prototype.redrawDefaultMapLayers = function (url, options, enabled) {
      // Use WMS compliant server, if not enabled, use OSM mapTiles as default
      if (enabled) {
        this._tileLayer.remove();
        this._tileLayer = L.tileLayer.wms(url, options);
      } else {
        this._tileLayer.remove();
        this._tileLayer = L.tileLayer(mapTiles.url, mapTiles.options);
      }
      this._tileLayer.setZIndex(-10);
      this._tileLayer.type = 'base';
      this._tileLayer.addTo(this.leafletMap);

      this._layerControl.addOverlay(this._drawnItems);
    };

    TileMapMap.prototype._createMap = function (mapOptions) {
      if (this.leafletMap) this.destroy();

      // Use WMS compliant server, if not enabled, use OSM mapTiles as default
      if (this._attr.wms && this._attr.wms.enabled) {
        this._tileLayer = L.tileLayer.wms(this._attr.wms.url, this._attr.wms.options);
      } else {
        this._tileLayer = L.tileLayer(mapTiles.url, mapTiles.options);
      }
      this._tileLayer.type = 'base';
      this._tileLayer.setZIndex(-10);

      mapOptions.center = this._mapCenter;
      mapOptions.zoom = this._mapZoom;

      this.leafletMap = L.map(this._container, mapOptions);

      // add base layer based on above logic and decide saturation based on saved settings
      this._tileLayer.addTo(this.leafletMap);

      this.saturateTile(this._attr.isDesaturated, this._tileLayer);

      this._layerControl = L.control.dndLayerControl(this.allLayers, this.esClient, this.mainSearchDetails, this.$element);
      this._layerControl.addTo(this.leafletMap);

      this._addSetViewControl();
      this._addDrawControl();
      this._addMousePositionControl();
      L.control.measureScale().addTo(this.leafletMap);
      this._attachEvents();
      if (mapOptions.syncMap) syncMaps.add(this.leafletMap);
    };

    /**
     * zoom map to fit all features in featureLayer,
     * even those NOT currently within map canvas extent
     *
     * @method _fitBounds
     * @param leafletMap {Leaflet Object}
     * @return {boolean}
     */
    TileMapMap.prototype.fitBounds = function (entireBounds) {
      this.leafletMap.fitBounds(entireBounds);
    };
    return TileMapMap;
  };
});

/* eslint-disable siren/memory-leak */

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

    let mapTiles;

    const markerTypes = {
      'Scaled Circle Markers': Private(require('./marker_types/scaled_circles')),
      'Shaded Circle Markers': Private(require('./marker_types/shaded_circles')),
      'Shaded Geohash Grid': Private(require('./marker_types/geohash_grid')),
      'Heatmap': Private(require('./marker_types/heatmap')),
    };

    async function getDefaultBaseLayer(getTileMapFromInvestigateYaml) {
      const tmsFromYaml = await getTileMapFromInvestigateYaml();
      return {
        url: tmsFromYaml.url || '//a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
          maxZoom: tmsFromYaml.maxZoom || 18,
          minZoom: tmsFromYaml.minZoom || 0,
          attribution: tmsFromYaml.attribution || 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        }
      };
    }

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
      this.sirenSessionState = params.sirenSessionState;
      this.aggLayerParams = {};
      this._callbacks = _.get(params, 'callbacks');
      this._setMarkerType(params.mapType);
      this._mapCenter = L.latLng(this.sirenSessionState.get('mapCenter')) || L.latLng(defaultMapCenter);
      this._mapZoom = this.sirenSessionState.get('mapZoom') || defaultMapZoom;
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

      //*********************************************************************** */
      //  If markers need to be revisited, here is PR that removed them
      //     https://sirensolutions.atlassian.net/browse/INVE-11323
      //*********************************************************************** */

      //https://github.com/Leaflet/Leaflet.draw
      const drawOptions = {
        draw: {
          circle: true,
          marker: false,
          polygon: {},
          polyline: false,
          rectangle: {
            shapeOptions: {
              stroke: false,
              color: '#000'
            }
          },
          circlemarker: false
        }
      };

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

    TileMapMap.prototype.addFeatureLayer = function (layer) {
      if (this.sirenSessionState.get(layer.id)) layer.enabled = true;
      this._layerControl.addOverlays([layer]);

      //Add tool to l.draw.toolbar so users can filter by vector layers
      if (this._toolbench) this._toolbench.removeTools();
      if (!this._toolbench) this._addDrawControl();
      if (this._layerControl.mapHasLayerType('point') &&
        !this._layerControl.mapHasCluster() &&
        this._layerControl.totalNumberOfPointsOnMap() <= 80) {
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
        sirenSessionState: this.sirenSessionState,
        tooltipFormatter: tooltipFormatter,
        valueFormatter: valueFormatter,
        prevState: prevState,
        attr: this._attr
      });
      this._markers.show();
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
      this._filters.enabled = this.sirenSessionState.get(this._filters.id);
      this._filters.visible = true;
      this._layerControl.addOverlays([this._filters]);
    };

    TileMapMap.prototype.addWmsOverlay = function (url, name, wmsOptions, options, id, type, notify) {

      let overlay = null;
      if (type === 'wms') {
        if (options.nonTiled) {
          overlay = new L.NonTiledLayer.WMS(url, wmsOptions);
        } else {
          overlay = L.tileLayer.wms(url, wmsOptions);
        }
      } else if (type === 'xyz') {
        if (options.nonTiled) {
          notify.error('Non-Tiled option detected: not supported with XYZ tile layers');
        } else {
          overlay = L.tileLayer(url, wmsOptions);
        }
      }

      if (overlay) {
        overlay.layerOptions = options;
        overlay.id = id;
        overlay.type = 'wms';
        overlay.label = name;
        overlay.icon = `<i class="fas fa-map" style="color:#000000;"></i>`;
        overlay.visible = true;
        overlay.enabled = options.enabled;

        this._layerControl.addOverlays([overlay], options);
      }
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

    TileMapMap.prototype.fixMapTypeTooltips = function () {
      this._markers.fixTooltips();
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

    TileMapMap.prototype._hasSameLocation = function (currentCenter, currentZoom) {
      const oldLat = this._mapCenter.lat.toFixed(5);
      const oldLon = this._mapCenter.lng.toFixed(5);
      const newLat = currentCenter.lat.toFixed(5);
      const newLon = currentCenter.lng.toFixed(5);
      let isSame = false;
      if (oldLat === newLat
        && oldLon === newLon
        && this.leafletMap.getZoom() === this._mapZoom) {
        isSame = true;
      } else {
        this._mapZoom = currentZoom;
        this._mapCenter = L.latLng(currentCenter);
      }
      return isSame;
    };

    TileMapMap.prototype.createBaseLayer = async function (getTileMapFromInvestigateYaml = null, url, options, enabled) {
      if (this._tileLayer) this._tileLayer.remove();
      if (getTileMapFromInvestigateYaml) {
        mapTiles = await getDefaultBaseLayer(getTileMapFromInvestigateYaml);
      }

      // Use WMS compliant server, if not enabled, use OSM mapTiles as default
      if (enabled) {
        this._tileLayer = L.tileLayer.wms(url, options);
      } else {
        this._tileLayer = L.tileLayer(mapTiles.url, mapTiles.options);
      }
      this._tileLayer.type = 'base';
      this._tileLayer.setZIndex(-10);
      // add base layer based on above logic and decide saturation based on saved settings
      this._tileLayer.addTo(this.leafletMap);

      this.saturateTile(this._attr.isDesaturated, this._tileLayer);
    };

    TileMapMap.prototype._createMap = function (mapOptions) {
      if (this.leafletMap) this.destroy();

      mapOptions.center = this._mapCenter;
      mapOptions.zoom = this._mapZoom;

      this.leafletMap = L.map(this._container, mapOptions);

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

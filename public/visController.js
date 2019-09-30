
import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import chrome from 'ui/chrome';
import { Binder } from 'ui/binder';
import MapProvider from 'plugins/enhanced_tilemap/vislib/_map';
import { VislibVisTypeBuildChartDataProvider } from 'ui/vislib_vis_type/build_chart_data';
import { backwardsCompatible } from './backwardsCompatible';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { ResizeCheckerProvider } from 'ui/vislib/lib/resize_checker';
import { uiModules } from 'ui/modules';
import { TileMapTooltipFormatterProvider } from 'ui/agg_response/geo_json/_tooltip_formatter';


define(function (require) {
  const module = uiModules.get('kibana/enhanced_tilemap', [
    'kibana',
    'etm-ui.bootstrap.accordion',
    'rzModule',
    'angularjs-dropdown-multiselect'
  ]);

  module.controller('KbnEnhancedTilemapVisController', function (
    $scope, $rootScope, $element, $timeout,
    Private, courier, config, getAppState, indexPatterns, $http, $injector) {
    const buildChartData = Private(VislibVisTypeBuildChartDataProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const callbacks = Private(require('plugins/enhanced_tilemap/callbacks'));
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const POIsProvider = Private(require('plugins/enhanced_tilemap/POIs'));
    const VectorProvider = Private(require('plugins/enhanced_tilemap/vector'));
    const utils = require('plugins/enhanced_tilemap/utils');
    const RespProcessor = require('plugins/enhanced_tilemap/resp_processor');
    const TileMapMap = Private(MapProvider);
    const ResizeChecker = Private(ResizeCheckerProvider);
    const SearchTooltip = Private(require('plugins/enhanced_tilemap/tooltip/searchTooltip'));
    const VisTooltip = Private(require('plugins/enhanced_tilemap/tooltip/visTooltip'));
    let map = null;
    let collar = null;
    let chartData = null;
    let tooltip = null;
    let tooltipFormatter = null;
    $scope.flags = {};

    backwardsCompatible.updateParams($scope.vis.params);
    appendMap();
    modifyToDsl();
    setTooltipFormatter($scope.vis.params.tooltip);
    drawWfsOverlays();

    const shapeFields = $scope.vis.indexPattern.fields.filter(function (field) {
      return field.type === 'geo_shape';
    }).map(function (field) {
      return field.name;
    });
    //Using $root as mechanism to pass data to vis-editor-vis-options scope
    $scope.$root.etm = {
      shapeFields: shapeFields
    };

    const binder = new Binder();
    const resizeChecker = new ResizeChecker($element);
    binder.on(resizeChecker, 'resize', function () {
      resizeArea();
    });

    // kibi: moved processor to separate file
    const respProcessor = new RespProcessor($scope.vis, buildChartData, utils);
    // kibi: end

    function modifyToDsl() {
      $scope.vis.aggs.origToDsl = $scope.vis.aggs.toDsl;
      $scope.vis.aggs.toDsl = function () {
        resizeArea();
        const dsl = $scope.vis.aggs.origToDsl();

        //append map collar filter to geohash_grid aggregation
        _.keys(dsl).forEach(function (key) {
          if (_.has(dsl[key], 'geohash_grid')) {
            const origAgg = dsl[key];
            dsl[key] = {
              filter: aggFilter(origAgg.geohash_grid.field),
              aggs: {
                filtered_geohash: origAgg
              }
            };
          }
        });
        return dsl;
      };
    }

    function aggFilter(field) {
      collar = utils.scaleBounds(
        map.mapBounds(),
        $scope.vis.params.collarScale);
      const filter = { geo_bounding_box: {} };
      filter.geo_bounding_box[field] = collar;
      return filter;
    }

    $scope.$watch('vis.aggs', function (resp) {
      //'apply changes' creates new vis.aggs object - ensure toDsl is overwritten again
      if (!_.has($scope.vis.aggs, 'origToDsl')) {
        modifyToDsl();
      }
    });

    function getGeoBoundingBox() {
      //collarscale is hardcoded to exactly the size of the map canvas
      const geoBoundingBox = utils.scaleBounds(map.mapBounds(), 1);
      return { geoBoundingBox };
    };

    function initPOILayer(layerParams) {
      const poi = new POIsProvider(layerParams);
      const displayName = layerParams.displayName || layerParams.savedSearchLabel;
      const options = {
        displayName,
        color: _.get(layerParams, 'color', '#008800'),
        size: _.get(layerParams, 'markerSize', 'm'),
        mapExtentFilter: {
          geo_bounding_box: getGeoBoundingBox(),
          geoField: getGeoField()
        }
      };

      //Element rendered in Leaflet Library
      const $legend = $element.find('a.leaflet-control-layers-toggle').get(0);

      if ($legend) {
        options.$legend = $legend;
      }

      poi.getLayer(options, function (layer) {
        map.addPOILayer(displayName, layer);
      });
    }

    function initVectorLayer(layerName, geoJsonCollection, options) {

      let popupFields = [];
      if (_.get(options, 'popupFields') === '' || !_.get(options, 'popupFields')) {
        popupFields = [];
      } else if (_.get(options, 'popupFields').indexOf(',') > -1) {
        popupFields = _.get(options, 'popupFields').split(',');
      } else {
        popupFields = [_.get(options, 'popupFields', [])];
      };

      const optionsWithDefaults = {
        color: _.get(options, 'color', '#008800'),
        size: _.get(options, 'size', 'm'),
        popupFields,
        layerGroup: _.get(options, 'layerGroup', '<b> Vector Overlays </b>'),
        indexPattern: $scope.vis.indexPattern.title,
        geoFieldName: $scope.vis.aggs[1].params.field.name,
        _siren: $scope.vis._siren,
        mapExtentFilter: {
          geo_bounding_box: getGeoBoundingBox(),
        },
        type: _.get(options, 'type', 'noType')
      };

      const vector = new VectorProvider(geoJsonCollection).getLayer(optionsWithDefaults);
      map.addVectorLayer(layerName, vector, optionsWithDefaults);

    };


    $scope.$watch('vis.params', function (visParams, oldParams) {
      if (visParams !== oldParams) {
        //When vis is first opened, vis.params gets updated with old context
        backwardsCompatible.updateParams($scope.vis.params);

        $scope.flags.isVisibleSource = 'visParams';
        //remove mouse related heatmap events when moving to a different geohash type
        if (oldParams && oldParams.mapType === 'Heatmap') {
          map.unfixMapTypeTooltips();
        }

        map._redrawBaseLayer(visParams.wms.url, visParams.wms.options, visParams.wms.enabled);
        setTooltipFormatter(visParams.tooltip);

        draw();

        map.saturateTiles(visParams.isDesaturated);

        //POI overlays
        map.clearPOILayers();
        $scope.vis.params.overlays.savedSearches.forEach(initPOILayer);

        drawWfsOverlays();

      }
    });

    $scope.$listen(queryFilter, 'update', function () {
      setTooltipFormatter($scope.vis.params.tooltip);
    });

    $scope.$watch('esResponse', function (resp) {
      if (_.has(resp, 'aggregations') && (resp.aggregations[2].doc_count > 0)) {
        chartData = respProcessor.process(resp);
        draw();

      };

      //POI overlays - no need to clear all layers for this watcher
      $scope.vis.params.overlays.savedSearches.forEach(initPOILayer);
    });

    $scope.$watch(
      function () {
        const checked = $element
          .find('div.leaflet-control-layers-overlays input.leaflet-control-layers-selector:checked');
        if (checked) {
          return checked.length;
        }
      },
      function (newChecked, oldChecked) {
        if (!$scope.flags.check) return;

        $scope.flags.isVisibleSource = 'layerControlCheckbox';

        if (newChecked !== oldChecked && $scope.flags.check === true) {
          drawWmsOverlays();

          //POI overlays
          map.clearPOILayers();
          $scope.vis.params.overlays.savedSearches.forEach(initPOILayer);
        }
      }
    );

    $scope.$on('$destroy', function () {
      binder.destroy();
      resizeChecker.destroy();
      if (map) map.destroy();
      if (tooltip) tooltip.destroy();
    });

    function draw() {
      if (!chartData || chartData.hits === 0) {
        return;
      }
      //add overlay layer to provide visibility of filtered area
      const fieldName = getGeoField().fieldname;
      if (fieldName) {
        map.addFilters(geoFilter.getGeoFilters(fieldName));
      }

      drawWmsOverlays();

      map.addMarkers(
        chartData,
        $scope.vis.params,
        tooltipFormatter,
        _.get(chartData, 'valueFormatter', _.identity),
        collar);
    }

    function setTooltipFormatter(tooltipParams) {
      if (tooltip) {
        tooltip.destroy();
      }

      const options = {
        xRatio: _.get(tooltipParams, 'options.xRatio', 0.6),
        yRatio: _.get(tooltipParams, 'options.yRatio', 0.6)
      };
      const geoField = getGeoField();
      if (_.get(tooltipParams, 'type') === 'visualization') {
        tooltip = new VisTooltip(
          _.get(tooltipParams, 'options.visId'),
          geoField.fieldname,
          geoField.geotype,
          options);
        tooltipFormatter = tooltip.getFormatter();
      } else {
        tooltipFormatter = Private(TileMapTooltipFormatterProvider);
      }

    }

    /**
     * Field used for Geospatial filtering can be set in multiple places
     * 1) field specified by geohash_grid aggregation
     * 2) field specified under options. Allows for filtering by geo_shape
     *
     * Use this method to locate the field
     */
    function getGeoField() {
      let fieldname = null;
      let geotype = 'geo_point';
      if ($scope.vis.params.filterByShape && $scope.vis.params.shapeField) {
        fieldname = $scope.vis.params.shapeField;
        geotype = 'geo_shape';
      } else {
        const agg = utils.getAggConfig($scope.vis.aggs, 'segment');
        if (agg) {
          fieldname = agg.fieldName();
        }
      }
      return {
        fieldname: fieldname,
        geotype: geotype
      };
    }

    function drawWfsOverlays() {
      //clear all wfs overlays before redrawing
      map.clearWfsOverlays();

      if ($scope.vis.params.overlays.wfsOverlays &&
        $scope.vis.params.overlays.wfsOverlays.length === 0) {
        return;
      };
      _.each($scope.vis.params.overlays.wfsOverlays, wfsOverlay => {

        const options = {
          color: _.get(wfsOverlay, 'color', '#10aded'),
          popupFields: _.get(wfsOverlay, 'popupFields', ''),
          layerGroup: '<b> WFS Overlays </b>',
          type: 'WFS'
        };
        const getFeatureRequest = `${wfsOverlay.url}request=GetFeature&typeNames=${wfsOverlay.layers}&outputFormat=json`;

        return $http.get(getFeatureRequest)
          .then(resp => {
            initVectorLayer(wfsOverlay.displayName, resp.data, options);
          });
      });
    };

    function drawWmsOverlays() {
      $scope.flags.check = false;
      const prevState = map.clearWMSOverlays();
      if ($scope.vis.params.overlays.wmsOverlays.length === 0) {
        return;
      }

      const wmsDrawAsync = $scope.vis.params.overlays.wmsOverlays.map(function (layerParams) {
        const wmsIndexId = _.get(layerParams, 'indexId', $scope.vis.indexPattern.id);
        return indexPatterns.get(wmsIndexId).then(function (indexPattern) {
          const source = new courier.SearchSource();
          const appState = getAppState();
          source.set('filter', queryFilter.getFilters());
          if (appState.query && !appState.linked) {
            source.set('query', appState.query);
          }
          source.index(indexPattern);
          return source._flatten().then(function (fetchParams) {
            const esQuery = fetchParams.body.query;
            //remove kibana parts of query
            const cleanedMust = [];
            if (_.has(esQuery, 'bool.must')) {
              esQuery.bool.must.forEach(function (must) {
                cleanedMust.push(_.omit(must, ['$state', '$$hashKey']));
              });
            }
            esQuery.bool.must = cleanedMust;
            const cleanedMustNot = [];
            if (_.has(esQuery, 'bool.must_not')) {
              esQuery.bool.must_not.forEach(function (mustNot) {
                cleanedMustNot.push(_.omit(mustNot, ['$state', '$$hashKey']));
              });
            }
            esQuery.bool.must_not = cleanedMustNot;

            if (JSON.stringify(esQuery).includes('join_sequence')) {
              return $http.post(chrome.getBasePath() + '/translateToES', { query: esQuery })
                .then(resp => {
                  return resp.data.translatedQuery;
                });
            } else {
              return Promise.resolve(esQuery);
            }
          })
            .then(esQuery => {
              const name = _.get(layerParams, 'displayName', layerParams.layers);
              const wmsOptions = {
                format: 'image/png',
                layers: layerParams.layers,
                maxFeatures: _.get(layerParams, 'maxFeatures', 1000),
                minZoom: _.get(layerParams, 'minZoom', 13),
                transparent: true,
                version: '1.1.1'
              };
              const viewparams = [];
              if (_.get(layerParams, 'viewparams')) {
                viewparams.push('q:' + JSON.stringify(esQuery));
              }
              const aggs = _.get(layerParams, 'agg', '');
              if (aggs.length !== 0) {
                viewparams.push('a:' + aggs);
              }
              if (viewparams.length >= 1) {
                //http://docs.geoserver.org/stable/en/user/data/database/sqlview.html#using-a-parametric-sql-view
                wmsOptions.viewparams = _.map(viewparams, param => {
                  let escaped = param;
                  escaped = escaped.replace(new RegExp('[,]', 'g'), '\\,'); //escape comma
                  //escaped = escaped.replace(/\s/g, ''); //remove whitespace
                  return escaped;
                }).join(';');
              }
              const cqlFilter = _.get(layerParams, 'cqlFilter', '');
              if (cqlFilter.length !== 0) {
                wmsOptions.CQL_FILTER = cqlFilter;
              }
              const styles = _.get(layerParams, 'styles', '');
              if (styles.length !== 0) {
                wmsOptions.styles = styles;
              }
              const formatOptions = _.get(layerParams, 'formatOptions', '');
              if (formatOptions.length !== 0) {
                wmsOptions.format_options = formatOptions;
              }

              let isVisible;
              if ($scope.flags.isVisibleSource === 'visParams') {
                isVisible = layerParams.isVisible;
              } else if (prevState[name] ||
                $scope.flags.isVisibleSource === 'layerControlCheckbox') {
                isVisible = prevState[name];
              } else {
                isVisible = layerParams.isVisible;
              };

              $scope.flags.visibleSource = '';

              const layerOptions = {
                isVisible,
                nonTiled: _.get(layerParams, 'nonTiled', false)
              };
              return map.addWmsOverlay(layerParams.url, name, wmsOptions, layerOptions);
            });
        });
      });

      Promise.all(wmsDrawAsync).then(function () {
        $scope.flags.check = true;
      });
    };

    function appendMap() {
      const initialMapState = utils.getMapStateFromVis($scope.vis);
      const params = $scope.vis.params;
      const container = $element[0].querySelector('.tilemap');
      map = new TileMapMap(container, {
        center: initialMapState.center,
        zoom: initialMapState.zoom,
        callbacks: callbacks,
        mapType: params.mapType,
        attr: params,
        editable: $scope.vis.getEditableVis() ? true : false
      });
    }

    function resizeArea() {
      if (map) map.updateSize();
    }

    // ============================
    // === API actions ===
    // ============================

    if ($injector.has('actionRegistry')) {
      const actionRegistry = $injector.get('actionRegistry');

      actionRegistry.register($scope.vis.id, 'renderGeoJsonCollection', async (layerName, geoJsonCollection, options) => {
        return initVectorLayer(layerName, geoJsonCollection, options);
      });

      actionRegistry.register($scope.vis.id, 'getGeoBoundingBox', async () => {
        return getGeoBoundingBox();
      });

    }

  });
});

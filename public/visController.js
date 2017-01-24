/*
 * Had to rework original tilemap functionallity to migrate 
 * to TemplateVisType. Combined pieces from 
 *   plugins/kbn_vislib_vis_types/public/tileMap.js
 *   ui/public/vislib/visualizations/tile_map.js
 */
import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import Binder from 'ui/binder';
import MapProvider from 'plugins/enhanced_tilemap/vislib/_map';
import VislibVisTypeBuildChartDataProvider from 'ui/vislib_vis_type/build_chart_data';

define(function (require) {
  var module = require('ui/modules').get('kibana/enhanced_tilemap', ['kibana', 'etm-ui.bootstrap.accordion']);
  
  module.controller('KbnEnhancedTilemapVisController', function ($scope, $rootScope, $element, Private, courier, config, getAppState) {
    let buildChartData = Private(VislibVisTypeBuildChartDataProvider);
    const queryFilter = Private(require('ui/filter_bar/query_filter'));
    const callbacks = Private(require('plugins/enhanced_tilemap/callbacks'));
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const POIsProvider = Private(require('plugins/enhanced_tilemap/POIs'));
    const utils = require('plugins/enhanced_tilemap/utils');
    let TileMapMap = Private(MapProvider);
    const ResizeChecker = Private(require('ui/vislib/lib/resize_checker'));
    let map = null;
    let collar = null;
    let chartData = null;
    appendMap();
    modifyToDsl();

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
    binder.on(resizeChecker, 'resize', function() {
      resizeArea();
    });

    const respProcessor = {
      buildChartData: buildChartData,
      process: function(resp) {
        const aggs = resp.aggregations;
        _.keys(aggs).forEach(function(key) {
          if(_.has(aggs[key], "filtered_geohash")) {
            aggs[key].buckets = aggs[key].filtered_geohash.buckets;
            delete aggs[key].filtered_geohash;
          }
        });

        const chartData = this.buildChartData(resp);
        const geoMinMax = utils.getGeoExtents(chartData);
        chartData.geoJson.properties.allmin = geoMinMax.min;
        chartData.geoJson.properties.allmax = geoMinMax.max;
        return chartData;
      },
      vis: $scope.vis
    }

    function modifyToDsl() {
      $scope.vis.aggs.origToDsl = $scope.vis.aggs.toDsl;
      $scope.vis.aggs.toDsl = function() {
        resizeArea();
        const dsl = $scope.vis.aggs.origToDsl();
        
        //append map collar filter to geohash_grid aggregation
        _.keys(dsl).forEach(function(key) {
          if(_.has(dsl[key], "geohash_grid")) {
            const origAgg = dsl[key];
            dsl[key] = {
              filter: aggFilter(origAgg.geohash_grid.field),
              aggs: {
                filtered_geohash: origAgg
              }
            }
          }
        });
        return dsl;
      }
    }

    function aggFilter(field) {
      collar = utils.scaleBounds(
        map.mapBounds(), 
        $scope.vis.params.collarScale);
      var filter = {geo_bounding_box: {}};
      filter.geo_bounding_box[field] = collar;
      return filter;
    }

    $scope.$watch('vis.aggs', function (resp) {
      //'apply changes' creates new vis.aggs object - ensure toDsl is overwritten again
      if(!_.has($scope.vis.aggs, "origToDsl")) {
        modifyToDsl();
      }
    });

    function initPOILayer(layerParams) {
      const poi = new POIsProvider(layerParams);
      const options = {
        color: _.get(layerParams, 'color', '#008800'),
        size: _.get(layerParams, 'markerSize', 'm')
      };
      poi.getLayer(options, function(layer) {
        map.addPOILayer(layerParams.savedSearchId, layer);
      });
    }

    $scope.$watch('vis.params', function (visParams) {
      draw();

      map.saturateTiles(visParams.isDesaturated);
      map.clearPOILayers();
      $scope.vis.params.overlays.savedSearches.forEach(function (layerParams) {
        initPOILayer(layerParams);
      });
    });

    $scope.$watch('esResponse', function (resp) {
      if(_.has(resp, 'aggregations')) {
        chartData = respProcessor.process(resp);
        draw();

        _.filter($scope.vis.params.overlays.savedSearches, function(layerParams) {
          return layerParams.syncFilters
        }).forEach(function (layerParams) {
          initPOILayer(layerParams);
        });
      }
    });

    $scope.$on("$destroy", function() {
      binder.destroy();
      resizeChecker.destroy();
      if (map) map.destroy();
    });

    function draw() {
      if(!chartData) return;

      //add overlay layer to provide visibility of filtered area
      let fieldName = getGeoField();
      if (fieldName) {
        map.addFilters(geoFilter.getGeoFilters(fieldName));
      }

      drawWmsOverlays();

      map.addMarkers(
        chartData, 
        $scope.vis.params,
        Private(require('ui/agg_response/geo_json/_tooltip_formatter')),
        _.get(chartData, 'valueFormatter', _.identity),
        collar);
    }

    /**
     * Field used for Geospatial filtering can be set in multiple places
     * 1) field specified by geohash_grid aggregation
     * 2) field specified under options in event no aggregation is used
     *
     * Use this method to locate the field
     */
    function getGeoField() {
      let fieldName = null;
      if ($scope.vis.params.filterByShape && $scope.vis.params.shapeField) {
        fieldName = $scope.vis.params.shapeField;
      } else {
        const agg = utils.getAggConfig($scope.vis.aggs, 'segment');
        if (agg) {
          fieldName = agg.fieldName();
        }
      }
      return fieldName;
    }

    function drawWmsOverlays() {
      map.clearWMSOverlays();
      if ($scope.vis.params.overlays.wmsOverlays.length === 0) {
        return;
      }
      
      const source = new courier.SearchSource();
      const appState = getAppState();
      source.set('filter', queryFilter.getFilters());
      if (appState.query && !appState.linked) {
        source.set('query', appState.query);
      }
      source._flatten().then(function (fetchParams) {
        const esQuery = fetchParams.body.query;
        //remove kibana parts of query
        const cleanedMust = [];
        if (_.has(esQuery, 'bool.must')) {
          esQuery.bool.must.forEach(function(must) {
            cleanedMust.push(_.omit(must, ['$state', '$$hashKey']));
          });
        }
        esQuery.bool.must = cleanedMust;
        const cleanedMustNot = [];
        if (_.has(esQuery, 'bool.must_not')) {
          esQuery.bool.must_not.forEach(function(mustNot) {
            cleanedMustNot.push(_.omit(mustNot, ['$state', '$$hashKey']));
          });
        }
        esQuery.bool.must_not = cleanedMustNot;
        const escapedQuery = JSON.stringify(esQuery).replace(new RegExp('[,]', 'g'), '\\,');

        $scope.vis.params.overlays.wmsOverlays.forEach(function(layerParams) {
          const name = _.get(layerParams, 'displayName', layerParams.layers);
          const options = {
            format: 'image/png',
            layers: layerParams.layers,
            maxFeatures: _.get(layerParams, 'maxFeatures', 1000),
            transparent: true,
            version: '1.1.1'
          };
          if (_.get(layerParams, 'viewparams')) {
            options.viewparams = 'q:' + escapedQuery;
          }
          map.addWmsOverlay(layerParams.url, name, options);
        });
      });
    }

    function appendMap() {
      const initialMapState = utils.getMapStateFromVis($scope.vis);
      var params = $scope.vis.params;
      var container = $element[0].querySelector('.tilemap');
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
  });
});

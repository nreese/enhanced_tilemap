/*
 * Had to rework original tilemap functionallity to migrate 
 * to TemplateVisType. Combined pieces from 
 *   plugins/kbn_vislib_vis_types/public/tileMap.js
 *   ui/public/vislib/visualizations/tile_map.js
 */
import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import AggResponseGeoJsonGeoJsonProvider from 'ui/agg_response/geo_json/geo_json';
import MapProvider from 'plugins/enhanced_tilemap/vislib/_map';

define(function (require) {
  var module = require('ui/modules').get('kibana/enhanced_tilemap', ['kibana']);
  
  module.controller('KbnEnhancedTilemapVisController', function ($scope, $rootScope, $element, Private, courier, config, getAppState) {
    let aggResponse = Private(require('ui/agg_response/index'));
    const queryFilter = Private(require('ui/filter_bar/query_filter'));
    const callbacks = Private(require('plugins/enhanced_tilemap/callbacks'));
    const utils = require('plugins/enhanced_tilemap/utils');
    let TileMapMap = Private(MapProvider);
    const geoJsonConverter = Private(AggResponseGeoJsonGeoJsonProvider);
    let map = null;
    appendMap();

    //Useful bits of ui/public/vislib_vis_type/buildChartData.js
    function buildChartData(resp) {
      var tableGroup = aggResponse.tabify($scope.vis, resp, {
        canSplit: true,
        asAggConfigResults: true
      });
      var tables = tableGroup.tables;
      var firstChild = tables[0];
      return geoJsonConverter($scope.vis, firstChild);
    }

    function getGeoExtents(visData) {
      return {
        min: visData.geoJson.properties.min,
        max: visData.geoJson.properties.max
      }
    }

    $scope.$watch('esResponse', function (resp) {
      if(resp) {
        resizeArea();
        const chartData = buildChartData(resp);
        const geoMinMax = getGeoExtents(chartData);
        chartData.geoJson.properties.allmin = geoMinMax.min;
        chartData.geoJson.properties.allmax = geoMinMax.max;
        if (_.has(chartData, 'geohashGridAgg')) {
          const agg = _.get(chartData, 'geohashGridAgg');
          map.addFilters(getGeoFilters(agg.fieldName()));
        }
        if (_.get($scope.vis.params, 'overlay.wms.enabled')) {
          addWmsOverlays();
        }
        map.addMarkers(
          chartData, 
          $scope.vis.params,
          Private(require('ui/agg_response/geo_json/_tooltip_formatter')),
          _.get(chartData, 'valueFormatter', _.identity));
      }
    });

    var changeVisOff = $rootScope.$on(
      'change:vis', 
      _.debounce(resizeArea, 200, false));
    
    $scope.$on("$destroy", function() {
      if (map) map.destroy();
      changeVisOff();
    });

    function getGeoFilters(field) {
      let filters = [];
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (utils.isGeoFilter(it, field) && !_.get(it, 'meta.disabled', false)) {
          const features = filterToGeoJson(it, field);
          filters = filters.concat(features);
        }
      });
      return filters;
    }

    function addWmsOverlays() {
      const url = _.get($scope.vis.params, 'overlay.wms.url');
      const name = _.get($scope.vis.params, 'overlay.wms.options.displayName', 'WMS Overlay');
      const options = {
        format: 'image/png',
        layers: _.get($scope.vis.params, 'overlay.wms.options.layers'),
        transparent: true,
        version: '1.1.1'
      };
      if (_.get($scope.vis.params, 'overlay.wms.options.viewparams.enabled')) {
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
          if (_.has(esQuery, 'filtered.filter.bool.must')) {
            esQuery.filtered.filter.bool.must.forEach(function(must) {
              cleanedMust.push(_.omit(must, ['$state', '$$hashKey']));
            });
          }
          esQuery.filtered.filter.bool.must = cleanedMust;
          const cleanedMustNot = [];
          if (_.has(esQuery, 'filtered.filter.bool.must_not')) {
            esQuery.filtered.filter.bool.must_not.forEach(function(mustNot) {
              cleanedMustNot.push(_.omit(mustNot, ['$state', '$$hashKey']));
            });
          }
          esQuery.filtered.filter.bool.must_not = cleanedMustNot;
          
          options.viewparams = 'q:' + JSON.stringify(esQuery).replace(new RegExp('[,]', 'g'), '\\,');
          map.addWmsOverlay(url, name, options);
        });
      } else {
        map.addWmsOverlay(url, name, options);
      }
    }

    function filterToGeoJson(filter, field) {
      let features = [];
      if (_.has(filter, 'or')) {
        _.get(filter, 'or', []).forEach(function(it) {
          features = features.concat(filterToGeoJson(it, field));
        });
      } else if (_.has(filter, 'geo_bounding_box.' + field)) {
        const topLeft = _.get(filter, 'geo_bounding_box.' + field + '.top_left');
        const bottomRight = _.get(filter, 'geo_bounding_box.' + field + '.bottom_right');
        if(topLeft && bottomRight) {
          const coords = [];
          coords.push([topLeft.lon, topLeft.lat]);
          coords.push([bottomRight.lon, topLeft.lat]);
          coords.push([bottomRight.lon, bottomRight.lat]);
          coords.push([topLeft.lon, bottomRight.lat]);
          features.push({
            type: 'Polygon',
            coordinates: [coords]
          });
        }
      } else if (_.has(filter, 'geo_polygon.' + field)) {
        const points = _.get(filter, 'geo_polygon.' + field + '.points', []);
        const coords = [];
        points.forEach(function(point) {
          const lat = point[1];
          const lon = point[0];
          coords.push([lon, lat]);
        });
        if(polygon.length > 0) features.push({
            type: 'Polygon',
            coordinates: [coords]
          });
      }
      return features;
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

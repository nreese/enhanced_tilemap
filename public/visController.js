import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import AggResponseGeoJsonGeoJsonProvider from 'ui/agg_response/geo_json/geo_json';
import MapProvider from 'plugins/enhanced_tilemap/vislib/_map';

define(function (require) {
  var module = require('ui/modules').get('kibana/enhanced_tilemap', ['kibana']);
  
  module.controller('KbnEnhancedTilemapVisController', function ($scope, $rootScope, $element, Private) {
    let aggResponse = Private(require('ui/agg_response/index'));
    let TileMapMap = Private(MapProvider);
    const geoJsonConverter = Private(AggResponseGeoJsonGeoJsonProvider);

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

    $scope.$watch('esResponse', function (resp) {
      if(resp) {
        var chartData = buildChartData(resp);
        
        var params = $scope.vis.params;
        var container = $element[0].querySelector('.tilemap');
        const map = new TileMapMap(container, chartData, {
          center: params.mapCenter,
          zoom: params.mapZoom,
          events: null,
          markerType: params.mapType,
          tooltipFormatter: Private(require('ui/agg_response/geo_json/_tooltip_formatter')),
          valueFormatter: _.identity,
          attr: params
        });

        map.addFitControl();
        map.addBoundingControl();
      }
    });
  });
});

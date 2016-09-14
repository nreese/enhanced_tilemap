import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import AggResponseGeoJsonGeoJsonProvider from 'ui/agg_response/geo_json/geo_json';
import MapProvider from 'plugins/enhanced_tilemap/vislib/_map';

define(function (require) {
  var module = require('ui/modules').get('kibana/enhanced_tilemap', ['kibana']);
  
  module.controller('KbnEnhancedTilemapVisController', function ($scope, $rootScope, $element, Private, courier, config, getAppState) {
    let aggResponse = Private(require('ui/agg_response/index'));
    let TileMapMap = Private(MapProvider);
    const geoJsonConverter = Private(AggResponseGeoJsonGeoJsonProvider);
    let map = null;

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
        const chartData = buildChartData(resp);
        const geoMinMax = getGeoExtents(chartData);
        chartData.geoJson.properties.allmin = geoMinMax.min;
        chartData.geoJson.properties.allmax = geoMinMax.max;
        if (map === null) appendMap();
        map.addMarkers(chartData, $scope.vis.params);
      }
    });

    $scope.$on("$destroy", function() {
      if (map) map.destroy();
    });

    function appendMap() {
      console.log("Width" + $element[0].offsetWidth);
      console.log("Height" + $element[0].offsetHeight);
      var params = $scope.vis.params;
      var container = $element[0].querySelector('.tilemap');
      map = new TileMapMap(container, {
        center: params.mapCenter,
        zoom: params.mapZoom,
        callbacks: {
          mapMoveEnd: mapMoveEnd,
          mapZoomEnd: mapZoomEnd,
          rectangle: rectangle
        },
        mapType: params.mapType,
        tooltipFormatter: Private(require('ui/agg_response/geo_json/_tooltip_formatter')),
        valueFormatter: _.identity,
        attr: params
      });

      map.addFitControl();
      map.addBoundingControl();
    }

    const mapMoveEnd = function (event) {
      const agg = _.get(event, 'chart.geohashGridAgg');
      if (!agg) return;

      agg.params.mapZoom = event.zoom;
      agg.params.mapCenter = [event.center.lat, event.center.lng];

      const editableVis = agg.vis.getEditableVis();
      if (!editableVis) return;

      const editableAgg = editableVis.aggs.byId[agg.id];
      if (editableAgg) {
        editableAgg.params.mapZoom = event.zoom;
        editableAgg.params.mapCenter = [event.center.lat, event.center.lng];
      }
    }

    const mapZoomEnd = function (event) {
      const agg = _.get(event, 'chart.geohashGridAgg');
      if (!agg || !agg.params.autoPrecision) return;

      // zoomPrecision maps event.zoom to a geohash precision value
      // event.limit is the configurable max geohash precision
      // default max precision is 7, configurable up to 12
      const zoomPrecision = {
        1: 2,
        2: 2,
        3: 2,
        4: 3,
        5: 3,
        6: 4,
        7: 4,
        8: 5,
        9: 5,
        10: 6,
        11: 6,
        12: 7,
        13: 7,
        14: 8,
        15: 9,
        16: 10,
        17: 11,
        18: 12
      };

      const precision = config.get('visualization:tileMap:maxPrecision');
      agg.params.precision = Math.min(zoomPrecision[event.zoom], precision);

      courier.fetch();
    }

    const rectangle = function (event) {
      const agg = _.get(event, 'chart.geohashGridAgg');
      if (!agg) return;

      const pushFilter = Private(require('ui/filter_bar/push_filter'))(getAppState());
      const indexPatternName = agg.vis.indexPattern.id;
      const field = agg.fieldName();
      const filter = {geo_bounding_box: {}};
      filter.geo_bounding_box[field] = event.bounds;

      pushFilter(filter, false, indexPatternName);
    }

  });
});

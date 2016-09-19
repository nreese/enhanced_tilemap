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

    var changeVisOff = $rootScope.$on(
      'change:vis', 
      _.debounce(resizeArea, 200, false));
    
    $scope.$on("$destroy", function() {
      if (map) map.destroy();
      changeVisOff();
    });

    function appendMap() {
      var params = $scope.vis.params;
      var container = $element[0].querySelector('.tilemap');
      map = new TileMapMap(container, {
        center: params.mapCenter,
        zoom: params.mapZoom,
        callbacks: {
          createMarker: createMarker,
          deleteMarkers: deleteMarkers,
          mapMoveEnd: mapMoveEnd,
          mapZoomEnd: mapZoomEnd,
          rectangle: rectangle
        },
        mapType: params.mapType,
        tooltipFormatter: Private(require('ui/agg_response/geo_json/_tooltip_formatter')),
        valueFormatter: _.identity,
        attr: params,
        editable: $scope.vis.getEditableVis() ? true : false
      });
    }

    function resizeArea() {
      if (map) map.updateSize();
    }

    function isBoundingBoxFilter(filter, field) {
      let isBBFilter = false;
      if (filter.meta.key === field) {
        isBBFilter = true;
      } else if (_.has(filter, 'or') 
        && _.isArray(filter.or) 
        && filter.or.length > 0
        && _.has(filter.or[0], 'geo_bounding_box')
        && _.has(filter.or[0].geo_bounding_box, field)) {
        isBBFilter = true;
      }
      return isBBFilter;
    }

    function filterAlias(field, numBoxes) {
      return field + ": " + numBoxes + " bounding boxes"
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
      
      const indexPatternName = agg.vis.indexPattern.id;
      const field = agg.fieldName();
      
      const newFilter = {geo_bounding_box: {}};
      newFilter.geo_bounding_box[field] = event.bounds;

      var queryFilter = Private(require('ui/filter_bar/query_filter'));
      let existingFilter = null;
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (isBoundingBoxFilter(it, field)) {
          existingFilter = it;
        }
      });

      if (existingFilter) {
        let boundingBoxes = [newFilter];
        if (_.has(existingFilter, 'geo_bounding_box')) {
          boundingBoxes.push({geo_bounding_box: existingFilter.geo_bounding_box});
        } else if (_.has(existingFilter, 'or')) {
          boundingBoxes = boundingBoxes.concat(existingFilter.or);
        }
        queryFilter.updateFilter({
          model: { or : boundingBoxes },
          source: existingFilter,
          type: 'geo_bounding_box',
          alias: filterAlias(field, boundingBoxes.length)
        });
      } else {
        const pushFilter = Private(require('ui/filter_bar/push_filter'))(getAppState());
        pushFilter(newFilter, false, indexPatternName);
      }
    }

    const createMarker = function (event) {
      const editableVis = $scope.vis.getEditableVis();
      if (!editableVis) return;
      const newPoint = [_.round(event.latlng.lat, 5), _.round(event.latlng.lng, 5)];
      editableVis.params.markers.push(newPoint);
    }

    const deleteMarkers = function (event) {
      const editableVis = $scope.vis.getEditableVis();
      if (!editableVis) return;

      event.deletedLayers.eachLayer(function (layer) {
        editableVis.params.markers = editableVis.params.markers.filter(function(point) {
          if(point[0] === layer._latlng.lat && point[1] === layer._latlng.lng) {
            return false;
          } else {
            return true;
          }
        });
      });
    }
  });
});

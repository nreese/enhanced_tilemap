import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
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
    Private, courier, config, getAppState, indexPatterns) {
    const buildChartData = Private(VislibVisTypeBuildChartDataProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const callbacks = Private(require('plugins/enhanced_tilemap/callbacks'));
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const POIsProvider = Private(require('plugins/enhanced_tilemap/POIs'));
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

    backwardsCompatible.updateParams($scope.vis.params);
    appendMap();
    modifyToDsl();
    setTooltipFormatter($scope.vis.params.tooltip);

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
      const filter = {geo_bounding_box: {}};
      filter.geo_bounding_box[field] = collar;
      return filter;
    }

    $scope.$watch('vis.aggs', function (resp) {
      //'apply changes' creates new vis.aggs object - ensure toDsl is overwritten again
      if (!_.has($scope.vis.aggs, 'origToDsl')) {
        modifyToDsl();
      }
    });

    function initPOILayer(layerParams) {
      const poi = new POIsProvider(layerParams);
      const options = {
        color: _.get(layerParams, 'color', '#008800'),
        size: _.get(layerParams, 'markerSize', 'm')
      };
      poi.getLayer(options, function (layer) {
        map.addPOILayer(layerParams.savedSearchId, layer);
      });
    }

    $scope.$watch('vis.params', function (visParams, oldParams) {
      if (visParams !== oldParams) {
        //When vis is first opened, vis.params gets updated with old context
        backwardsCompatible.updateParams($scope.vis.params);

        setTooltipFormatter(visParams.tooltip);

        draw();

        map.saturateTiles(visParams.isDesaturated);
        map.clearPOILayers();
        $scope.vis.params.overlays.savedSearches.forEach(function (layerParams) {
          initPOILayer(layerParams);
        });
      }
    });

    $scope.$listen(queryFilter, 'update', function () {
      setTooltipFormatter($scope.vis.params.tooltip);
    });

    $scope.$watch('esResponse', function (resp) {
      if (_.has(resp, 'aggregations')) {
        chartData = respProcessor.process(resp);

        draw();

        _.filter($scope.vis.params.overlays.savedSearches, function (layerParams) {
          return layerParams.syncFilters;
        }).forEach(function (layerParams) {
          initPOILayer(layerParams);
        });
      }
    });

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
      // search directive changed a lot in 5.5 - no longer supported at this time
      /*if (_.get(tooltipParams, 'type') === 'search') {
        tooltip = new SearchTooltip(
            _.get(tooltipParams, 'options.searchId'),
            geoField.fieldname,
            geoField.geotype,
            options);
        tooltipFormatter = tooltip.getFormatter();
      }*/
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

    function drawWmsOverlays() {
      const prevState = map.clearWMSOverlays();
      if ($scope.vis.params.overlays.wmsOverlays.length === 0) {
        return;
      }

      $scope.vis.params.overlays.wmsOverlays.forEach(function (layerParams) {
        const wmsIndexId = _.get(layerParams, 'indexId', $scope.vis.indexPattern.id);
        indexPatterns.get(wmsIndexId).then(function (indexPattern) {
          const source = new courier.SearchSource();
          const appState = getAppState();
          source.set('filter', queryFilter.getFilters());
          if (appState.query && !appState.linked) {
            source.set('query', appState.query);
          }
          source.index(indexPattern);
          source._flatten().then(function (fetchParams) {
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
            const layerOptions = {
              isVisible: _.get(prevState, name, true),
              nonTiled: _.get(layerParams, 'nonTiled', false)
            };
            map.addWmsOverlay(layerParams.url, name, wmsOptions, layerOptions);
          });
        });
      });
    }

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
  });
});

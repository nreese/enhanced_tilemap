/*
 * Had to rework original tilemap functionallity to migrate
 * to TemplateVisType. Combined pieces from
 *   plugins/kbn_vislib_vis_types/public/tileMap.js
 *   ui/public/vislib/visualizations/tile_map.js
 */
import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
//
import Binder from 'ui/binder';
import MapProvider from 'plugins/enhanced_tilemap/vislib/_map';
import VislibVisTypeBuildChartDataProvider from 'ui/vislib_vis_type/build_chart_data';

define(function(require) {
      var module = require('ui/modules').get('kibana/enhanced_tilemap', ['kibana', 'etm-ui.bootstrap.accordion']);

      module.controller('KbnEnhancedTilemapVisController', function($scope, $rootScope, $element, Private, courier, config, getAppState, indexPatterns, $http) {
          let buildChartData = Private(VislibVisTypeBuildChartDataProvider);
          const queryFilter = Private(require('ui/filter_bar/query_filter'));
          const callbacks = Private(require('plugins/enhanced_tilemap/callbacks'));
          const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
          const POIsProvider = Private(require('plugins/enhanced_tilemap/POIs'));
          const utils = require('plugins/enhanced_tilemap/utils');
          let TileMapMap = Private(MapProvider);
          const ResizeChecker = Private(require('ui/vislib/lib/resize_checker'));
          const VisTooltip = Private(require('plugins/enhanced_tilemap/tooltip/visTooltip'));
          let map = null;

          let collar = null;
          let chartData = null;
          let tooltip = null;
          let tooltipFormatter = null;
          let district_boundary = null;
          let geoJsonLayers = {};
          let geometry_geo_shape_field = 'geometry';
          let lat_lon_geo_shape_field = 'point_shape';

          const es_type_to_geojson = {
            multipolygon: 'MultiPolygon',
            polygon: 'Polygon',
            point: 'Point',
            linestring: 'Linestring',
            geometrycollection: 'GeometryCollection'
          }

          appendMap();
          modifyToDsl();
          setTooltipFormatter($scope.vis.params.tooltip);
          const shapeFields = $scope.vis.indexPattern.fields.filter(function(field) {
            return field.type === 'geo_shape';
          }).map(function(field) {
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
                if (_.has(aggs[key], "filtered_geohash")) {
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
                if (_.has(dsl[key], "geohash_grid")) {
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
            var filter = {
              geo_bounding_box: {}
            };
            filter.geo_bounding_box[field] = collar;
            return filter;
          }

          $scope.$watch('vis.aggs', function(resp) {
            //'apply changes' creates new vis.aggs object - ensure toDsl is overwritten again
            if (!_.has($scope.vis.aggs, "origToDsl")) {
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

          $scope.$watch('vis.params', function(visParams) {
            setTooltipFormatter(visParams.tooltip);

            draw();

            map.saturateTiles(visParams.isDesaturated);
            map.clearPOILayers();
            $scope.vis.params.overlays.savedSearches.forEach(function(layerParams) {
              initPOILayer(layerParams);
            });
          });

          $scope.$watch('esResponse', function(resp) {
            if (_.has(resp, 'aggregations')) {
              chartData = respProcessor.process(resp);
              draw();

              _.filter($scope.vis.params.overlays.savedSearches, function(layerParams) {
                return layerParams.syncFilters
              }).forEach(function(layerParams) {
                initPOILayer(layerParams);
              });
            }
          });

          $scope.$on("$destroy", function() {
            binder.destroy();
            resizeChecker.destroy();
            if (map) map.destroy();
            if (tooltip) tooltip.destroy()
          });

          function draw() {
            if (!chartData) return;

            //add overlay layer to provide visibility of filtered area
            let fieldName = getGeoField();
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

            if (_.get(tooltipParams, 'type') === 'visualization') {
              const options = {
                xRatio: _.get(tooltipParams, 'options.xRatio', 0.6),
                yRatio: _.get(tooltipParams, 'options.yRatio', 0.6)
              }
              tooltip = new VisTooltip(
                _.get(tooltipParams, 'options.visId'),
                getGeoField(),
                options);
              tooltipFormatter = tooltip.getFormatter();
            } else {
              tooltipFormatter = Private(require('ui/agg_response/geo_json/_tooltip_formatter'));
            }

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

            $scope.vis.params.overlays.wmsOverlays.forEach(function(layerParams) {
              const wmsIndexId = _.get(layerParams, 'indexId', $scope.vis.indexPattern.id);
              indexPatterns.get(wmsIndexId).then(function(indexPattern) {
                const source = new courier.SearchSource();
                const appState = getAppState();
                source.set('filter', queryFilter.getFilters());
                if (appState.query && !appState.linked) {
                  source.set('query', appState.query);
                }
                source.index(indexPattern);
                source._flatten().then(function(fetchParams) {
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

                  const name = _.get(layerParams, 'displayName', layerParams.layers);
                  const options = {
                    format: 'image/png', 
                    layers: layerParams.layers,
                    maxFeatures: _.get(layerParams, 'maxFeatures', 1000),
                    minZoom: _.get(layerParams, 'minZoom', 13),
                    transparent: true,
                    version: '1.1.1'
                  };
                  if (_.get(layerParams, 'viewparams')) {
                    options.viewparams = 'q:' + escapedQuery;
                  }
                  const cqlFilter = _.get(layerParams, 'cqlFilter', '');
                  if (cqlFilter.length !== 0) {
                    options.CQL_FILTER = cqlFilter;
                  }
                  map.addWmsOverlay(layerParams.url, name, options);
                });
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

            $('#ajax').on('input', function() {
              var input_text = $('#ajax').val();
              setTimeout(function() {
                if (input_text == $('#ajax').val()) {
                  getPlaceSuggestions(input_text)
                }
              }, 500)
            });
            $("#go-btn").click(function() {
              var text = document.getElementById('ajax').value;
              getPlaceGeometry(JSON.parse(text));
            });
          }

            function getPlaceGeometry(options) {
              var data = {
                index: options.index,
                doctype: options.doctype,
                id: options.id
              };
              $http({
                  url: '../api/places',
                  method: "POST",
                  data: data
                })
                .then(function(resp) {
                  $(resp.data.hits.hits).each(function(key, value) {
                    let es_geometry = value._source.geometry;
                    // convert the geom type from lowercase ES for proper geojson
                    es_geometry.type = es_type_to_geojson[es_geometry.type]
                    appendGeoJsonLayer(es_geometry)
                  });
                  appendFilter(options);
                });
            }

            function appendGeoJsonLayer(es_geometry) {
              var geojson = new L.geoJson(
                null, {
                  onEachFeature: function(feature, layer) {
                    layer.on('click', function() {
                      geojson.removeLayer(layer);
                      var filter = geoFilter.getFilterBarGeoFilters(shapeFields[0]);
                      queryFilter.removeFilter(filter[0]);
                    });
                  }
                }
              );
              geojson.addData({
                geometry: es_geometry,
                type: 'Feature'
              });
              geojson.addTo(map.map);
            }

            // getPlaceSuggestions("name: funkytown",{size: 1, index:'funky_places' } )
            function getPlaceSuggestions(query_string, options = {}) {
              options.query_string = query_string + '*';
              options.index = $scope.vis.params.internalShapeSearchIndices;
              console.log("suggestion index:" + options.index)
              console.log("suggestion query:" + options.query_string)
              let results = [];
              $http({
                  url: '../api/place_suggestions',
                  method: "POST",
                  data: options // see routes.js for option fields
                })
                .then(function(resp) {
                  var dataList = document.getElementById('json-datalist');
                  var input = document.getElementById('ajax');
                  while (dataList.hasChildNodes()) {
                    dataList.removeChild(dataList.lastChild);
                  }
                  $(resp.data.hits.hits).each(function(key, value) {
                    place_data = {
                      name: value._source.name,
                      index: value._index,
                      doctype: value._type,
                      id: value._id
                    };
                    results += place_data;
                    var option = document.createElement('option');
                    // Set the value using the item in tzhe JSON array.
                    option.value = JSON.stringify(place_data);
                    option.data = JSON.stringify(place_data);
                    // Add the <option> element to the <datalist>.
                    dataList.appendChild(option);
                  });
                });
            }

            function appendFilter(place_data) {
              var params = $scope.vis.params;
              if ($scope.vis.params.filterByInternalShape) {
                var newFilter = {
                  geo_shape: {}
                };
                newFilter.geo_shape[lat_lon_geo_shape_field] = {
                  indexed_shape: {
                    id: place_data.id,
                    type: place_data.doctype || place_data.index,
                    index: place_data.index,
                    path: geometry_geo_shape_field
                  }
                };
              }
              geoFilter.add(newFilter, lat_lon_geo_shape_field, place_data.index);
            }

            function resizeArea() {
              if (map) map.updateSize();
            }
          });
      });

import { filterHelper } from 'ui/kibi/components/dashboards360/filter_helper';

define(function (require) {
  return function CallbacksFactory(Private, courier, config) {
    const _ = require('lodash');
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const utils = require('plugins/enhanced_tilemap/utils');
    const L = require('leaflet');

    return {
      createMarker: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        const editableVis = agg.vis.getEditableVis();
        if (!editableVis) return;
        const newPoint = [_.round(event.latlng.lat, 5), _.round(event.latlng.lng, 5)];
        editableVis.params.markers.push(newPoint);
      },
      deleteMarkers: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        const editableVis = agg.vis.getEditableVis();
        if (!editableVis) return;

        event.deletedLayers.eachLayer(function (layer) {
          editableVis.params.markers = editableVis.params.markers.filter(function (point) {
            if (point[0] === layer._latlng.lat && point[1] === layer._latlng.lng) {
              return false;
            } else {
              return true;
            }
          });
        });
      },
      mapMoveEnd: function (event) {
        const vis = _.get(event, 'chart.geohashGridAgg.vis');
        if (vis && vis.hasUiState()) {
          vis.getUiState().set('mapCenter', [
            _.round(event.center.lat, 5),
            _.round(event.center.lng, 5)
          ]);
          vis.getUiState().set('mapZoom', event.zoom);
        }

        //Fetch new data if map bounds are outsize of collar
        const bounds = utils.scaleBounds(event.mapBounds, 1);
        if (_.has(event, 'collar.top_left') && !utils.contains(event.collar, bounds)) {
          courier.fetch();
        }
      },
      mapZoomEnd: function (event) {
        const vis = _.get(event, 'chart.geohashGridAgg.vis');
        if (vis && vis.hasUiState()) {
          vis.getUiState().set('mapZoom', event.zoom);
        }
        const autoPrecision = _.get(event, 'chart.geohashGridAgg.params.autoPrecision');

        if (autoPrecision || !event.chart) {
          courier.fetch();
        }
      },
      poiFilter: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;

        const field = agg.fieldName();
        const indexPatternName = agg.vis.indexPattern.id;

        const boolFilter = {
          bool: {
            should: []
          }
        };

        event.poiLayers.forEach(function (poiLayer) {
          poiLayer.getLayers().forEach(function (feature) {
            if (feature instanceof L.Marker) {
              const filter = { geo_distance: { distance: event.radius + 'km' } };
              filter.geo_distance[field] = {
                'lat': feature.getLatLng().lat,
                'lon': feature.getLatLng().lng
              };

              boolFilter.bool.should.push(filter);
            }
          });
        });
        filterHelper.addSirenPropertyToFilterMeta(boolFilter, agg.vis._siren);
        geoFilter.add(boolFilter, field, indexPatternName);
      },
      polygon: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        const indexPatternName = agg.vis.indexPattern.id;

        let newFilter;
        let field;

        const firstPoint = event.points[0];
        const lastPoint = event.points[event.points.length - 1];
        if (!_.isEqual(firstPoint, lastPoint)) {
          event.points.push(firstPoint);
        }

        if (event.params.filterByShape && event.params.shapeField) {
          field = event.params.shapeField;
          newFilter = { geo_shape: {} };
          newFilter.geo_shape[field] = {
            shape: {
              type: 'Polygon',
              coordinates: [event.points]
            }
          };
        } else {
          field = agg.fieldName();
          newFilter = { geo_polygon: {} };
          newFilter.geo_polygon[field] = { points: event.points };
        }

        filterHelper.addSirenPropertyToFilterMeta(newFilter, agg.vis._siren);
        geoFilter.add(newFilter, field, indexPatternName);
      },
      polygonVector: function (event) {
        if (!event.args.vector) return;

        let newFilter;
        const field = event.args.geoFieldName;

        if (_.isEqual(event.args.type.toLowerCase(), 'multipolygon')) {
          newFilter = { geo_multi_polygon: {} };
          newFilter.geo_multi_polygon[field] = { polygons: event.points };
        } else if (_.isEqual(event.args.type.toLowerCase(), 'polygon')) {
          newFilter = { geo_polygon: {} };
          newFilter.geo_polygon[field] = { polygons: event.points };
        }

        filterHelper.addSirenPropertyToFilterMeta(newFilter, event.args._siren);
        geoFilter.add(newFilter, field, event.args.indexPattern);

      },
      rectangle: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        const indexPatternName = agg.vis.indexPattern.id;

        let field = agg.fieldName();
        let geotype = 'geo_point';
        if (event.params.filterByShape && event.params.shapeField) {
          field = event.params.shapeField;
          geotype = 'geo_shape';
        }
        const newFilter = geoFilter.rectFilter(
          field, geotype, event.bounds.top_left, event.bounds.bottom_right);

        filterHelper.addSirenPropertyToFilterMeta(newFilter, agg.vis._siren);
        geoFilter.add(newFilter, field, indexPatternName);
      },
      circle: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        const indexPatternName = agg.vis.indexPattern.id;
        const center = [event.e.layer._latlng.lat, event.e.layer._latlng.lng];
        const radius = event.e.layer._mRadius;
        let field = agg.fieldName();
        if (event.params.filterByShape && event.params.shapeField) {
          field = event.params.shapeField;
        }

        const newFilter = geoFilter.circleFilter(
          field, center[0], center[1], radius
        );

        filterHelper.addSirenPropertyToFilterMeta(newFilter, agg.vis._siren);
        geoFilter.add(newFilter, field, indexPatternName);
      }
    };
  };
});

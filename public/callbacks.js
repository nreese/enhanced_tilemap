import { filterHelper } from 'ui/kibi/components/dashboards360/filter_helper';

define(function (require) {
  return function CallbacksFactory(Private) {
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
      fetchSearchSource: async function (event) {
        //Fetch new data if map bounds are outsize of collar
        const bounds = utils.geoBoundingBoxBounds(event.mapBounds, 1);
        const autoPrecision = _.get(event, 'chart.geohashGridAgg.params.autoPrecision');
        const previousZoom = _.get(event, 'chart.geoJson.properties.zoom');
        if (_.has(event, 'collar.top_left')) {
          if (autoPrecision && (event.currentZoom !== previousZoom || !utils.contains(event.collar, bounds))) {
            return event.searchSource.fetch();
          } else if (!autoPrecision && !utils.contains(event.collar, bounds))  {
            return event.searchSource.fetch();
          }
        }
      },
      poiFilter: function (event) {

        const boolFilter = {
          bool: {
            should: []
          }
        };

        event.poiLayers.forEach(function (poiLayer) {
          poiLayer.getLayers().forEach(function (feature) {
            if (feature instanceof L.Marker) {
              const filter = { geo_distance: { distance: event.radius + 'km' } };
              filter.geo_distance[event.field.fieldname] = {
                'lat': feature.getLatLng().lat,
                'lon': feature.getLatLng().lng
              };

              boolFilter.bool.should.push(filter);
            }
          });
        });
        filterHelper.addSirenPropertyToFilterMeta(boolFilter, event.sirenMeta);
        geoFilter.add(boolFilter, event.field.fieldname, event.indexPatternId);
      },
      polygonVector: function (event) {
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
      polygon: function (event) {
        let newFilter;
        const field = event.field.fieldname;

        const firstPoint = event.points[0];
        const lastPoint = event.points[event.points.length - 1];
        if (!_.isEqual(firstPoint, lastPoint)) {
          event.points.push(firstPoint);
        }

        if (event.field.geotype === 'geo_shape') {
          newFilter = { geo_shape: {} };
          newFilter.geo_shape[field] = {
            shape: {
              type: 'Polygon',
              coordinates: [event.points]
            }
          };
        } else {
          newFilter = { geo_polygon: {} };
          newFilter.geo_polygon[field] = { points: event.points };
        }

        filterHelper.addSirenPropertyToFilterMeta(newFilter, event.sirenMeta);
        geoFilter.add(newFilter, event.field.fieldname, event.indexPatternId);
      },
      rectangle: function (event) {
        const newFilter = geoFilter.rectFilter(
          event.field.fieldname, event.field.geotype, event.bounds.top_left, event.bounds.bottom_right);

        filterHelper.addSirenPropertyToFilterMeta(newFilter, event.sirenMeta);
        geoFilter.add(newFilter, event.field.fieldname, event.indexPatternId);
      },
      circle: function (event) {
        const newFilter = geoFilter.circleFilter(
          event.field.fieldname, event.center[0], event.center[1], event.radius
        );

        filterHelper.addSirenPropertyToFilterMeta(newFilter, event.sirenMeta);
        geoFilter.add(newFilter, event.field.fieldname, event.indexPatternId);
      }
    };
  };
});

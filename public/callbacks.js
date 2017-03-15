define(function (require) {
  return function CallbacksFactory(Private, courier, config) {
    const _ = require('lodash');
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const utils = require('plugins/enhanced_tilemap/utils');
    
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
          editableVis.params.markers = editableVis.params.markers.filter(function(point) {
            if(point[0] === layer._latlng.lat && point[1] === layer._latlng.lng) {
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
        if(_.has(event, 'collar.top_left') && !utils.contains(event.collar, bounds)) {
          courier.fetch();
        }
      },
      mapZoomEnd: function (event) {
        const vis = _.get(event, 'chart.geohashGridAgg.vis');
        if (vis && vis.hasUiState()) {
          vis.getUiState().set('mapZoom', event.zoom);
        }

        const autoPrecision = _.get(event, 'chart.geohashGridAgg.params.autoPrecision');
        if (autoPrecision) {
          courier.fetch();
        }
      },
      poiFilter: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;

        const field = agg.fieldName();
        const indexPatternName = agg.vis.indexPattern.id;

        const filters = [];
        event.poiLayers.forEach(function (poiLayer) {
          poiLayer.getLayers().forEach(function (feature) {
            if (feature instanceof L.Marker) {
              const filter = {geo_distance: {distance: event.radius + "km"}};
              filter.geo_distance[field] = {
                "lat" : feature.getLatLng().lat,
                "lon" : feature.getLatLng().lng
              }
              filters.push(filter);
            }
          });
        });
        geoFilter.add(filters, field, indexPatternName);
      },
      polygon: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        const indexPatternName = agg.vis.indexPattern.id;

        let newFilter;
        let field;
        if (event.params.filterByShape && event.params.shapeField) {
          const firstPoint = event.points[0];
          const closed = event.points;
          closed.push(firstPoint);
          field = event.params.shapeField;
          newFilter = {geo_shape: {}};
          newFilter.geo_shape[field] = {
            shape: {
              type: 'Polygon',
              coordinates: [ closed ]
            }
          };
        } else {
          field = agg.fieldName();
          newFilter = {geo_polygon: {}};
          newFilter.geo_polygon[field] = { points: event.points};
        }

        geoFilter.add(newFilter, field, indexPatternName);
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

        geoFilter.add(newFilter, field, indexPatternName);
      }
    }
  }
});
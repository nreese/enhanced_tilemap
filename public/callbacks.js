define(function (require) {
  return function CallbacksFactory(Private, courier, config, getAppState) {
    const _ = require('lodash');
    const queryFilter = Private(require('ui/filter_bar/query_filter'));
    const pushFilter = Private(require('ui/filter_bar/push_filter'))(getAppState());
    const utils = require('plugins/enhanced_tilemap/utils');

    function filterAlias(field, numBoxes) {
      return field + ": " + numBoxes + " geo filters"
    }

    function addGeoFilter(newFilter, field, indexPatternName) {
      let existingFilter = null;
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (utils.isGeoFilter(it, field)) {
          existingFilter = it;
        }
      });

      if (existingFilter) {
        let geoFilters = [newFilter];
        let type = '';
        if (_.has(existingFilter, 'or')) {
          geoFilters = geoFilters.concat(existingFilter.or);
          type = 'or';
        } else if (_.has(existingFilter, 'geo_bounding_box')) {
          geoFilters.push({geo_bounding_box: existingFilter.geo_bounding_box});
          type = 'geo_bounding_box';
        } else if (_.has(existingFilter, 'geo_polygon')) {
          geoFilters.push({geo_polygon: existingFilter.geo_polygon});
          type = 'geo_polygon';
        }
        queryFilter.updateFilter({
          model: { or : geoFilters },
          source: existingFilter,
          type: type,
          alias: filterAlias(field, geoFilters.length)
        });
      } else {
        pushFilter(newFilter, false, indexPatternName);
      }
    }

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
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;

        const center = [
          _.round(event.center.lat, 5),
          _.round(event.center.lng, 5)
        ]

        const editableVis = agg.vis.getEditableVis();
        if (!editableVis) return;
        editableVis.params.mapCenter = center;
        editableVis.params.mapZoom = event.zoom;

        const editableAgg = editableVis.aggs.byId[agg.id];
        if (editableAgg) {
          editableAgg.params.mapZoom = event.zoom;
          editableAgg.params.mapCenter = center;
        }

        //Fetch new data if map bounds are outsize of collar
        const bounds = utils.scaleBounds(event.mapBounds, 1);
        if(!utils.contains(event.collar, bounds)) {
          courier.fetch();
        }
      },
      mapZoomEnd: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg || !agg.params.autoPrecision) return;

        agg.params.mapZoom = event.zoom;
        
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
      },
      polygon: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        
        const indexPatternName = agg.vis.indexPattern.id;
        const field = agg.fieldName();
        
        const newFilter = {geo_polygon: {}};
        newFilter.geo_polygon[field] = { points: event.points};

        addGeoFilter(newFilter, field, indexPatternName);
      },
      rectangle: function (event) {
        const agg = _.get(event, 'chart.geohashGridAgg');
        if (!agg) return;
        
        const indexPatternName = agg.vis.indexPattern.id;
        const field = agg.fieldName();
        
        const newFilter = {geo_bounding_box: {}};
        newFilter.geo_bounding_box[field] = event.bounds;

        addGeoFilter(newFilter, field, indexPatternName);
      }
    }
  }
});
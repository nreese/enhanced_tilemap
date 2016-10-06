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

    /**
     * Get the number of geohash cells for a given precision
     *
     * @param {number} precision the geohash precision (1<=precision<=12).
     * @param {number} axis constant for the axis 0=lengthwise (ie. columns, along longitude), 1=heightwise (ie. rows, along latitude).
     * @returns {number} Number of geohash cells (rows or columns) at that precision
     */
    function geohashCells(precision, axis) {
      let cells = 1;
      for (let i = 1; i <= precision; i += 1) {
        //On odd precisions, rows divide by 4 and columns by 8. Vice-versa on even precisions.
        cells *= (i % 2 === axis) ? 4 : 8;
      }
      return cells;
    }

    /**
     * Get the number of geohash columns (world-wide) for a given precision
     * @param precision the geohash precision
     * @returns {number} the number of columns
     */
    function geohashColumns(precision) {
      return geohashCells(precision, 0);
    }

    const maxPrecision = parseInt(config.get('visualization:tileMap:maxPrecision'), 10) || 12;
    /**
     * Map Leaflet zoom levels to geohash precision levels.
     * The size of a geohash column-width on the map should be at least `minGeohashPixels` pixels wide.
     */
    let zoomPrecision = {};
    const minGeohashPixels = 16;
    for (let zoom = 0; zoom <= 21; zoom += 1) {
      const worldPixels = 256 * Math.pow(2, zoom);
      zoomPrecision[zoom] = 1;
      for (let precision = 2; precision <= maxPrecision; precision += 1) {
        const columns = geohashColumns(precision);
        if ((worldPixels / columns) >= minGeohashPixels) {
          zoomPrecision[zoom] = precision;
        } else {
          break;
        }
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
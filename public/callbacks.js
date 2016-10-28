define(function (require) {
  return function CallbacksFactory(Private, courier, config, getAppState) {
    const _ = require('lodash');
    const queryFilter = Private(require('ui/filter_bar/query_filter'));
    const utils = require('plugins/enhanced_tilemap/utils');
    
    let pushFilter = null;

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
        if(!pushFilter) {
          console.error("pushFilter not provided. Call setPushFilter!");
        } else {
          pushFilter(newFilter, false, indexPatternName);
        }
      }
    }

    return {
      /*
       * Need to pass in pushFilter
       * super weird bug occurs if pushFilter loaded in this file
       * On first page view - everything worked great
       * After that - all pushes went nowhere - like it was a different state instance
       */
      setPushFilter: function(f) {
        pushFilter = f;
      },
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
          const center = [
            _.round(event.center.lat, 5),
            _.round(event.center.lng, 5)
          ];
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
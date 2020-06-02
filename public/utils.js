import _ from 'lodash';

define(function (require) {
  const L = require('leaflet');

  function scaleBounds(bounds, scale) {
    let safeScale = scale;
    if (safeScale < 1) scale = 1;
    if (safeScale > 5) scale = 5;
    safeScale = safeScale - 1;

    const topLeft = bounds.getNorthWest();
    const bottomRight = bounds.getSouthEast();
    let latDiff = _.round(Math.abs(topLeft.lat - bottomRight.lat), 5);
    const lonDiff = _.round(Math.abs(bottomRight.lng - topLeft.lng), 5);
    //map height can be zero when vis is first created
    if (latDiff === 0) latDiff = lonDiff;

    const latDelta = latDiff * safeScale;
    let topLeftLat = _.round(topLeft.lat, 5) + latDelta;
    if (topLeftLat > 90) topLeftLat = 90;
    let bottomRightLat = _.round(bottomRight.lat, 5) - latDelta;
    if (bottomRightLat < -90) bottomRightLat = -90;
    const lonDelta = lonDiff * safeScale;
    let topLeftLon = _.round(topLeft.lng, 5) - lonDelta;
    if (topLeftLon < -180) topLeftLon = -180;
    let bottomRightLon = _.round(bottomRight.lng, 5) + lonDelta;
    if (bottomRightLon > 180) bottomRightLon = 180;
    return {
      topLeftLat,
      topLeftLon,
      bottomRightLat,
      bottomRightLon
    };
  }

  return {
    /*
     * @param element {html element} The child element to check if there is a parent for
     * @param scale {parentClassNames} An array of classnames to check ancestory for
     * @return {object || boolean} when an object is returned, the element has a parent whose
     * class is specified in the paretnClassNames Array
     */
    getParent: function (element, parentClassNames) {
      let parent = element;
      while (parent != null) {
        if (parent.className) {
          for (let i = 0; i < parentClassNames.length; i++) {
            if (L.DomUtil.hasClass(parent, parentClassNames[i])) return parent;
          }
        }
        parent = parent.parentNode;
      }
    },

    getGeoExtents: function (visData) {
      return {
        min: visData.geoJson.properties.min,
        max: visData.geoJson.properties.max
      };
    },

    /*
     * @param bounds {LatLngBounds}
     * @param scale {number}
     * @return {object}
     */
    geoBoundingBoxBounds: function (bounds, scale) {
      const coords = scaleBounds(bounds, scale);
      //console.log("scale:" + safeScale + ", latDelta: " + latDelta + ", lonDelta: " + lonDelta);
      //console.log("top left lat " + _.round(topLeft.lat, 5) + " -> " + topLeftLat);
      //console.log("bottom right lat " + _.round(bottomRight.lat, 5) + " -> " + bottomRightLat);
      //console.log("top left lon " + _.round(topLeft.lng, 5) + " -> " + topLeftLon);
      //console.log("bottom right lon " + _.round(bottomRight.lng, 5) + " -> " + bottomRightLon);

      return {
        top_left: { lat: coords.topLeftLat, lon: coords.topLeftLon },
        bottom_right: { lat: coords.bottomRightLat, lon: coords.bottomRightLon }
      };
    },

    geoShapeScaleBounds: function (bounds, scale) {
      const coords = scaleBounds(bounds, scale);
      return {
        geometry: {
          shape: {
            type: 'envelope',
            coordinates: [
              [coords.topLeftLon, coords.topLeftLat],
              [coords.bottomRightLon, coords.bottomRightLat]
            ]
          },
          relation: 'intersects'
        }
      };
    },
    contains: function (collar, bounds) {
      //test if bounds top_left is inside collar
      if (bounds.top_left.lat > collar.top_left.lat
        || bounds.top_left.lon < collar.top_left.lon) {
        return false;
      }

      //test if bounds bottom_right is inside collar
      if (bounds.bottom_right.lat < collar.bottom_right.lat
        || bounds.bottom_right.lon > collar.bottom_right.lon) {
        return false;
      }

      //both corners are inside collar so collar contains
      return true;
    },
    getAggConfig: function (aggs, aggName) {
      let aggConfig = null;
      const index = _.findIndex(aggs, function (agg) {
        return agg.schema.name === aggName;
      });
      if (index !== -1) {
        aggConfig = aggs[index];
      }
      return aggConfig;
    },
    /*
     * @param rect {Array of Array(lat, lon)} grid rectangle
     * created from KIBANA_HOME/src/ui/public/agg_response/geo_json/rows_to_features.js
     * @return {object}
     */
    getRectBounds: function (rect) {
      const RECT_LAT_INDEX = 0;
      const RECT_LON_INDEX = 1;
      let latMin = 90;
      let latMax = -90;
      let lonMin = 180;
      let lonMax = -180;
      rect.forEach(function (vertex) {
        if (vertex[RECT_LAT_INDEX] < latMin) latMin = vertex[RECT_LAT_INDEX];
        if (vertex[RECT_LAT_INDEX] > latMax) latMax = vertex[RECT_LAT_INDEX];
        if (vertex[RECT_LON_INDEX] < lonMin) lonMin = vertex[RECT_LON_INDEX];
        if (vertex[RECT_LON_INDEX] > lonMax) lonMax = vertex[RECT_LON_INDEX];
      });
      return {
        top_left: {
          lat: latMax,
          lon: lonMin
        },
        bottom_right: {
          lat: latMin,
          lon: lonMax
        }
      };
    },
    getMapStateFromVis: function (vis) {
      const mapState = {};
      //Visualizations created in 5.x will have map state in uiState
      if (vis.hasUiState()) {
        const uiStateCenter = vis.uiStateVal('mapCenter');
        const uiStateZoom = vis.uiStateVal('mapZoom');
        if (uiStateCenter && uiStateZoom) {
          mapState.center = uiStateCenter;
          mapState.zoom = uiStateZoom;
        }
      }
      //Visualizations created in 4.x will have map state in segment aggregation
      if (!_.has(mapState, 'center') && !_.has(mapState, 'zoom')) {
        const agg = this.getAggConfig(vis.aggs, 'segment');
        if (agg) {
          mapState.center = _.get(agg, 'params.mapCenter');
          mapState.zoom = _.get(agg, 'params.mapZoom');
        }
      }
      //Provide defaults if no state found
      if (!_.has(mapState, 'center') && !_.has(mapState, 'zoom')) {
        mapState.center = [15, 5];
        mapState.zoom = 2;
      }
      return mapState;
    },
    /**
     * Avoid map auto panning. Use the offset option to
     * anchor popups so content fits inside map bounds.
     *
     * @method popupOffset
     * @param leafletMap {L.Map} Leaflet map
     * @param content {String} String containing html popup content
     * @param latLng {L.LatLng} popup location
     * @return {L.Point} offset
     */
    popupOffset: function (leafletMap, content, latLng, popupDimensions) {
      const mapWidth = leafletMap.getSize().x;
      const mapHeight = leafletMap.getSize().y;
      const popupPoint = leafletMap.latLngToContainerPoint(latLng);
      const maxHeight = _.get(popupDimensions, 'height', 'auto');
      const maxWidth = _.get(popupDimensions, 'width', 'auto');
      //Create popup that is out of view to determine dimensions
      const popup = L.popup({
        autoPan: false,
        maxHeight,
        maxWidth,
        offset: new L.Point(mapWidth * -2, mapHeight * -2)
      })
        .setLatLng(latLng)
        .setContent(content)
        .openOn(leafletMap);
      const popupHeight = popup._contentNode.clientHeight;
      const popupWidth = popup._contentNode.clientWidth / 2;

      let widthOffset = 0;
      const distToLeftEdge = popupPoint.x;
      const distToRightEdge = mapWidth - popupPoint.x;
      if (distToLeftEdge < popupWidth) {
        //Move popup right as little as possible
        widthOffset = popupWidth - distToLeftEdge;
      } else if (distToRightEdge < popupWidth) {
        //Move popup left as little as possible
        widthOffset = -1 * (popupWidth - distToRightEdge);
      }

      let heightOffset = 16;
      const distToTopEdge = popupPoint.y;
      if (distToTopEdge < popupHeight) {
        //Move popup down as little as possible
        heightOffset = popupHeight - distToTopEdge + 16;
      }

      return new L.Point(widthOffset, heightOffset);
    },
    offsetMarkerCluster: function (pixels, clusterCentroidInPixels, count) {
      //function to offset the center of the geoHash so that the marker cluster will fit in geohash
      const minDistToRight = {
        1: 31,
        2: 35,
        3: 43,
        4: 50,
        5: 58,
        6: 65,
        7: 70,
        8: 76,
        9: 82
      };

      const minDistanceToLeft = 5;
      const minDistanceToBottom = 24;
      const minDistanceToRight = minDistToRight[count.toString().length];
      const minDistanceToTop = 7;
      //x axis offset
      const distToLeftEdge = clusterCentroidInPixels.x - pixels.topLeft.x;
      const distToRightEdge = pixels.bottomRight.x - clusterCentroidInPixels.x;
      if (distToLeftEdge <= minDistanceToLeft) {
        clusterCentroidInPixels.x += (minDistanceToLeft - distToLeftEdge);
      } else if (distToRightEdge < minDistanceToRight) {
        clusterCentroidInPixels.x -= (minDistanceToRight - distToRightEdge);
      }

      //y axis offset
      const distToTopEdge = clusterCentroidInPixels.y - pixels.bottomRight.y;
      const distToBottomEdge = pixels.topLeft.y - clusterCentroidInPixels.y;
      if (distToTopEdge <= minDistanceToTop) {
        clusterCentroidInPixels.y += (minDistanceToTop - distToTopEdge);
      } else if (distToBottomEdge <= minDistanceToBottom) {
        clusterCentroidInPixels.y -= (minDistanceToBottom - distToBottomEdge);
      }

      return clusterCentroidInPixels;
    },
    getMarkerClusteringPrecision: function (currentZoom) {
      const clusteringPrecisionBasedOnZoom = {
        0: 1,
        1: 1,
        2: 1,
        3: 1,
        4: 2,
        5: 2,
        6: 3,
        7: 3,
        8: 3,
        9: 4,
        10: 4,
        11: 5,
        12: 5,
        13: 5,
        14: 5,
        15: 5,
        16: 5,
        17: 6,
        18: 6,
        19: 6,
        20: 6,
        21: 6
      };
      return clusteringPrecisionBasedOnZoom[currentZoom];
    },
    processAggRespForMarkerClustering: function (aggChartData, geoFilter, limit, geoField) {
      const docFilters = {
        bool: {
          should: []
        }
      };

      let aggFeatures;
      let totalNumberOfDocsToRetrieve = 0;
      if (_.get(aggChartData, 'geoJson.features')) {
        aggFeatures = aggChartData.geoJson.features;
        totalNumberOfDocsToRetrieve = aggFeatures.length;
        for (let i = aggFeatures.length - 1; i >= 0; i--) {
          const documentsInCurrentFeature = aggFeatures[i].properties.value;
          if ((totalNumberOfDocsToRetrieve + documentsInCurrentFeature) <= limit) {

            const rectangle = aggFeatures[i].properties.rectangle;
            const topLeft = { lat: rectangle[3][0], lon: rectangle[3][1] };
            const bottomRight = { lat: rectangle[1][0], lon: rectangle[1][1] };

            const geoBoundingBoxFilter = geoFilter.rectFilter(geoField, 'geo_point', topLeft, bottomRight);
            docFilters.bool.should.push(geoBoundingBoxFilter);
            totalNumberOfDocsToRetrieve += documentsInCurrentFeature;
            aggFeatures.splice(i, 1);
          }
        }
      }
      return { aggFeatures, docFilters };
    }
  };
});
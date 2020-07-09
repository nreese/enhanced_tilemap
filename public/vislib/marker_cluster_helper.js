import _ from 'lodash';

const offsetMarkerCluster = function (pixels, clusterCentroidInPixels, count) {
  //function to offset the center of the geoHash so that the marker cluster will fit in geohash
  const minDistToRight = {
    1: 14,
    2: 18,
    3: 23,
    4: 28,
    5: 31,
    6: 35,
    7: 40,
    8: 46,
    9: 52,
    10: 56
  };

  const minDistanceToLeft = 34;
  const minDistanceToBottom = 24;
  const minDistanceToRight = minDistToRight[count.toString().length];
  const minDistanceToTop = 14;

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
};

const getMarkerClusteringPrecision = function (currentZoom) {
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
    14: 6,
    15: 6,
    16: 6,
    17: 7,
    18: 7,
    19: 7,
    20: 7,
    21: 7
  };
  return clusteringPrecisionBasedOnZoom[currentZoom];
};
const processAggRespForMarkerClustering = function (aggChartData, geoFilter, limit, geoField) {
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
};



export {
  offsetMarkerCluster,
  getMarkerClusteringPrecision,
  processAggRespForMarkerClustering
};
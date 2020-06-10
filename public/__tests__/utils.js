import expect from 'expect.js';
// eslint-disable-next-line import/default
import utils from './../utils';
import { find } from 'lodash';

import {
  aggChartDataLargeGeoHashTest,
  expectedAggFeaturesLargeGeoHashTest,
  aggChartDataTwoGeoHashTest,
  expectedAggFeaturesTwoGeoHashTest,
  aggChartDataSmallGeohashTest,
  expectedAggFeaturesSmallGeohashTest
} from './fakeAggFeatures';

import {
  startingState,
  zoomInFromStartingState,
  zoomOutFromStartingState,
  panOutsideOfStartingStateCollar
} from './fakeUtilDrawLayerInputs';

import {
  expectedZoomInFromStartingState
} from './expectedUtilDrawLayer';


import geoFilterHelper from './../vislib/geoFilterHelper';

describe('Kibi Enhanced Tilemap', () => {

  describe('utils', () => {
    describe('offsetMarkerCluster', () => {

      const pixels = {
        topLeft: {
          x: 0,
          y: 1000
        },
        bottomRight: {
          x: 1000,
          y: 0
        }
      };

      const count = 1;

      it('should not offset as the centroid is within the bounds of the geohash', () => {
        const clusterCentroidInPixels = {
          x: 500,
          y: 500
        };
        utils.offsetMarkerCluster(pixels, clusterCentroidInPixels, count);
        expect(clusterCentroidInPixels.x).to.be(500);
        expect(clusterCentroidInPixels.y).to.be(500);
      });

      it('should offset as centroid is to the top and left of the geohash', () => {
        const clusterCentroidInPixels = {
          x: 0,
          y: 1000
        };

        utils.offsetMarkerCluster(pixels, clusterCentroidInPixels, count);
        expect(clusterCentroidInPixels.x).to.be(5);
        expect(clusterCentroidInPixels.y).to.be(976);
      });

      it('should offset as centroid is to the top and right of the geohash', () => {
        const clusterCentroidInPixels = {
          x: 1000,
          y: 1000
        };

        utils.offsetMarkerCluster(pixels, clusterCentroidInPixels, count);
        expect(clusterCentroidInPixels.x).to.be(969);
        expect(clusterCentroidInPixels.y).to.be(976);
      });

      it('should offset as centroid is to the bottom and right of the geohash', () => {
        const clusterCentroidInPixels = {
          x: 1000,
          y: 0
        };
        utils.offsetMarkerCluster(pixels, clusterCentroidInPixels, count);
        expect(clusterCentroidInPixels.x).to.be(969);
        expect(clusterCentroidInPixels.y).to.be(7);
      });

      it('should offset as centroid is to the bottom and left of the geohash', () => {
        const clusterCentroidInPixels = {
          x: 0,
          y: 0
        };
        utils.offsetMarkerCluster(pixels, clusterCentroidInPixels, count);
        expect(clusterCentroidInPixels.x).to.be(5);
        expect(clusterCentroidInPixels.y).to.be(7);
      });

      it('should offset based on different number of digits', () => {
        const clusterCentroidInPixels = {
          x: 1000,
          y: 1000
        };

        const expectedOffset = {
          1: 969,
          2: 965,
          3: 957,
          4: 950,
          5: 942,
          6: 935,
          7: 930,
          8: 924,
          9: 918,
          y: 976
        };

        let count = '2';
        for (let i = 1; i <= 9; i++) {
          if (i !== 1) count += '2';
          const offsetCentroid = utils.offsetMarkerCluster(pixels, clusterCentroidInPixels, Number(count));
          expect(offsetCentroid.x).to.be(expectedOffset[i]);
          expect(offsetCentroid.y).to.be(expectedOffset.y);
        }
      });
    });
    describe('getMarkerClusteringPrecision', () => {
      it('should return correct precision based on zoom level', () => {
        const expectedPrecision = {
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
          16: 6,
          17: 6,
          18: 6,
          19: 6,
          20: 6,
          21: 6
        };

        for (let i = 0; i <= 21; i++) {
          const precision = utils.getMarkerClusteringPrecision(i);
          expect(precision).to.be(expectedPrecision[i]);
        }
      });
    });

    describe('processAggRespForMarkerClustering', () => {
      it('No Aggregations are less than limit - should return same geohash and NO filters for search query', () => {
        const processedAggResp = utils.processAggRespForMarkerClustering(aggChartDataLargeGeoHashTest);
        expect(processedAggResp).to.eql(expectedAggFeaturesLargeGeoHashTest);
      });

      it('Some of Aggregation count less than limit - should return 1 geohash and one filter for search query', () => {
        const limit = 3;
        const geoField = 'geometry';
        const fakeGeoFilter = {
          rectFilter: geoFilterHelper.rectFilter
        };
        const processedAggResp = utils.processAggRespForMarkerClustering(aggChartDataTwoGeoHashTest, fakeGeoFilter, limit, geoField);
        expect(processedAggResp).to.eql(expectedAggFeaturesTwoGeoHashTest);
      });

      it('Aggregation count less than limit - should return no geohash features and convert all into filters for search query', () => {
        const limit = 999999;
        const geoField = 'geometry';
        const fakeGeoFilter = {
          rectFilter: geoFilterHelper.rectFilter
        };
        const processedAggResp = utils.processAggRespForMarkerClustering(aggChartDataSmallGeohashTest, fakeGeoFilter, limit, geoField);
        expect(processedAggResp).to.eql(expectedAggFeaturesSmallGeohashTest);
      });
    });

    describe('drawLayerCheck', () => {
      const aggPrecisions = require('ui/kibi/agg_types/buckets/agg_precision_types');
      const enabledOptions = [true, false];
      const layerTypeOptions = [
        'es_ref_shape',
        'es_ref_point',
        'poi_point',
        'poi_shape',
        'agg'
      ];

      const zoomOptions = [];
      const clusteringPrecision = [];
      const aggPrecision = [];
      const createZoomAndPrecisionOptions = () => {
        for (let zoom = 0; zoom <= 18; zoom++) {
          zoomOptions.push(zoom);
          clusteringPrecision.push(utils.getMarkerClusteringPrecision(zoom));
          aggPrecision.push(aggPrecisions.performance[zoom]);
        }
        return zoomOptions;
      };
      createZoomAndPrecisionOptions();

      it('should return true AND false for layer enabled AND not enabled', () => {
        const _currentMapBounds = startingState.mapBounds; // the new zoomed in map extent
        const _currentZoom = 4; // zoom has changed, but that is not important for point or agg layer types
        const _currentPrecision = 3; // precision has changed since previous layer render - THIS WILL CAUSE REDRAW
        const layerParams = startingState.layerParams; // this layer bounds covers the zoomed in area
        layerParams.type = 'agg';

        enabledOptions.forEach((enabled) => {
          layerParams.enabled = enabled;
          const redrawLayerResultEnabled = utils.drawLayerCheck(layerParams, _currentMapBounds, _currentZoom, _currentPrecision);
          expect(redrawLayerResultEnabled).to.be(enabled);
        });
      });

      it('zoomed IN map bounds check for zoom and precision', () => {
        const layerParams = zoomInFromStartingState.layerParams; // layer parameters including zoom, precision and map bounds of the last successful fetch
        const _currentMapBounds = zoomInFromStartingState.mapBounds; // the new zoomed in map extent is INSIDE the bounds that the layer has data fetched for
        layerParams.enabled = true; // always enabled, this way the other factors determine the result

        for (let layerTypeIndex = 0; layerTypeIndex <= layerTypeOptions.length - 1; layerTypeIndex++) {
          for (let zoom = 0; zoom <= zoomOptions.length - 1; zoom++) {
            layerParams.type = layerTypeOptions[layerTypeIndex];
            let precision;
            if (layerTypeOptions[layerTypeIndex] !== 'agg') {
              precision = clusteringPrecision[zoom];
            } else {
              precision = aggPrecision[zoom];
            }
            const result = utils.drawLayerCheck(layerParams, _currentMapBounds, zoom, precision);

            const expectedResult = find(expectedZoomInFromStartingState, (item) => {
              return item.type === layerParams.type &&
                item.zoom === zoom &&
                item.precision === precision;
            }).result;
            expect(result).to.be(expectedResult);
          }
        }
      });

      it('should redraw because map zoomed outside of collar', () => {
        const layerParams = zoomOutFromStartingState.layerParams; // layer parameters including zoom, precision and map bounds of the last successful fetch
        const _currentMapBounds = zoomOutFromStartingState.mapBounds; // the new zoomed in map extent is INSIDE the bounds that the layer has data fetched for
        layerParams.enabled = true; // always enabled, this way the other factors determine the result
        layerParams.type = 'poi_shape';
        const zoom = 3;
        const precision = 3;

        const result = utils.drawLayerCheck(layerParams, _currentMapBounds, zoom, precision);

        expect(result).to.be(true);
      });

      it('should redraw becase map is panned outside of current map bounds check', () => {
        const layerParams = panOutsideOfStartingStateCollar.layerParams; // layer parameters including zoom, precision and map bounds of the last successful fetch
        const _currentMapBounds = panOutsideOfStartingStateCollar.mapBounds; // the new zoomed in map extent is INSIDE the bounds that the layer has data fetched for
        layerParams.enabled = true; // always enabled, this way the other factors determine the result
        layerParams.type = 'poi_point';
        const zoom = 3;
        const precision = 3;

        const result = utils.drawLayerCheck(layerParams, _currentMapBounds, zoom, precision);

        expect(result).to.be(true);
      });
    });
  });
});
import expect from 'expect.js';
// eslint-disable-next-line import/default
import utils from './../utils';

import {
  aggChartDataLargeGeoHashTest,
  expectedAggFeaturesLargeGeoHashTest,
  aggChartDataTwoGeoHashTest,
  expectedAggFeaturesTwoGeoHashTest,
  aggChartDataSmallGeohashTest,
  expectedAggFeaturesSmallGeohashTest
} from './fakeAggFeatures';

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
          16: 5,
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

  });
});
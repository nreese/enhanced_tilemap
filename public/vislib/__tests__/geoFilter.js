const expect = require('expect.js');

// const fakeVectorSimplePolygon = require('./fakeGeoFilterObjects/fakeVectorSimplePolygon');
// const fakeVectorSimpleDonutPolygon = require('./fakeGeoFilterObjects/fakeVectorSimplePolygonWithDonut');
// const fakeVectorMultiPolygon = require('./fakeGeoFilterObjects/fakeVectorMultiPolygon');
// const fakeVectorMultiPolygonWithDonut = require('./fakeGeoFilterObjects/fakeVectorMultiPolygonWithDonut');

define(function (require) {
  return function geoFilterTest(Private) {

    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));


    describe('geoFilter', () => {

      describe('rectFilter', () => {

        it(`should produce geo_bounding_box geoFilter type from geo_point input`, () => {

          const fieldname = 'location';
          const fieldType = 'geo_point';
          const topLeft = [139, 36];
          const bottomRight = [140, 35];

          const result = geoFilter.rectFilter(fieldname, fieldType, topLeft, bottomRight);

          const expectedPolygonFilter = [{
            geo_polygon: {
              location: {
                points:
                  [
                    [50.810108, 24.754743],
                    [50.743911, 25.482424],
                    [51.013352, 26.006992],
                    [51.286462, 26.114582],
                    [51.589079, 25.801113],
                    [51.6067, 25.21567],
                    [51.389608, 24.627386],
                    [51.112415, 24.556331],
                    [50.810108, 24.754743]
                  ]
              }
            }
          }];

          const expectedDonutsToExcludeLength = 0;
          expect(result.polygonsToFilter).to.eql(expectedPolygonFilter);
          expect(result.donutsToExclude.length).to.eql(expectedDonutsToExcludeLength);

        });
      });
    });
  };
});

const expect = require('expect.js');

const geoFilterHelper = require('../geoFilterHelper');
const fakeVectorSimplePolygon = require('./fakeGeoFilterObjects/fakeVectorSimplePolygon');
const fakeVectorSimpleDonutPolygon = require('./fakeGeoFilterObjects/fakeVectorSimplePolygonWithDonut');
const fakeVectorMultiPolygon = require('./fakeGeoFilterObjects/fakeVectorMultiPolygon');
const fakeVectorMultiPolygonWithDonut = require('./fakeGeoFilterObjects/fakeVectorMultiPolygonWithDonut');

describe('Kibi Enhanced Tilemap', () => {

  describe('geoFilterHelper', () => {

    describe('_analyseSimplePolygon', () => {

      it(`should produce correct object for geo-filtering of simple polygon type`, () => {

        const result = geoFilterHelper.analyseSimplePolygon(fakeVectorSimplePolygon.newFilter, fakeVectorSimplePolygon.field);

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

      it(`should produce correct object for geo-filtering of polygon with donut`, () => {

        const result = geoFilterHelper.analyseSimplePolygon(fakeVectorSimpleDonutPolygon.newFilter, fakeVectorSimpleDonutPolygon.field);

        const expectedPolygonFilter = [{
          geo_polygon: {
            location: {
              points:
                [
                  [0, 0],
                  [101, 0],
                  [101, 90],
                  [0, 90],
                  [0, 0]
                ]
            }
          }
        }];

        const expectedDonutsToExclude = [{
          geo_polygon: {
            location: {
              points:
                [
                  [25, 20],
                  [75, 20],
                  [75, 70],
                  [25, 70],
                  [25, 20]
                ]
            }
          }
        }];

        expect(result.polygonsToFilter).to.eql(expectedPolygonFilter);
        expect(result.donutsToExclude).to.eql(expectedDonutsToExclude);

      });

    });

    describe('_analyseMultiPolygon', () => {
      it(`should produce correct object for geo-filtering of multipolygon type`, () => {

        const result = geoFilterHelper.analyseMultiPolygon(fakeVectorMultiPolygon.polygons, fakeVectorMultiPolygon.field);

        const expectedPolygonFilter = [
          {
            geo_polygon: {
              location: {
                points:
                  [
                    [176.885824, -40.065978],
                    [176.508017, -40.604808],
                    [176.01244, -41.289624],
                    [175.239568, -41.688308],
                    [175.067898, -41.425895],
                    [174.650973, -41.281821],
                    [175.22763, -40.459236],
                    [174.900157, -39.908933],
                    [173.824047, -39.508854],
                    [173.852262, -39.146602],
                    [174.574802, -38.797683],
                    [174.743474, -38.027808],
                    [174.697017, -37.381129],
                    [174.292028, -36.711092],
                    [174.319004, -36.534824],
                    [173.840997, -36.121981],
                    [173.054171, -35.237125],
                    [172.636005, -34.529107],
                    [173.007042, -34.450662],
                    [173.551298, -35.006183],
                    [174.329391, -35.265496],
                    [174.612009, -36.156397],
                    [175.336616, -37.209098],
                    [175.357596, -36.526194],
                    [175.808887, -36.798942],
                    [175.95849, -37.555382],
                    [176.763195, -37.881253],
                    [177.438813, -37.961248],
                    [178.010354, -37.579825],
                    [178.517094, -37.695373],
                    [178.274731, -38.582813],
                    [177.97046, -39.166343],
                    [177.206993, -39.145776],
                    [176.939981, -39.449736],
                    [177.032946, -39.879943],
                    [176.885824, -40.065978],
                  ]
              }
            }
          },
          {
            geo_polygon: {
              location: {
                points:
                  [
                    [169.667815, -43.555326],
                    [170.52492, -43.031688],
                    [171.12509, -42.512754],
                    [171.569714, -41.767424],
                    [171.948709, -41.514417],
                    [172.097227, -40.956104],
                    [172.79858, -40.493962],
                    [173.020375, -40.919052],
                    [173.247234, -41.331999],
                    [173.958405, -40.926701],
                    [174.247587, -41.349155],
                    [174.248517, -41.770008],
                    [173.876447, -42.233184],
                    [173.22274, -42.970038],
                    [172.711246, -43.372288],
                    [173.080113, -43.853344],
                    [172.308584, -43.865694],
                    [171.452925, -44.242519],
                    [171.185138, -44.897104],
                    [170.616697, -45.908929],
                    [169.831422, -46.355775],
                    [169.332331, -46.641235],
                    [168.411354, -46.619945],
                    [167.763745, -46.290197],
                    [166.676886, -46.219917],
                    [166.509144, -45.852705],
                    [167.046424, -45.110941],
                    [168.303763, -44.123973],
                    [168.949409, -43.935819],
                    [169.667815, -43.555326]
                  ]
              }
            }
          }
        ];

        const expectedDonutsToExcludeLength = 0;
        expect(result.polygonsToFilter).to.eql(expectedPolygonFilter);
        expect(result.donutsToExclude.length).to.eql(expectedDonutsToExcludeLength);

      });

      it(`should produce correct object for geo-filtering of multipolygon with donut`, () => {

        const result = geoFilterHelper.analyseMultiPolygon(fakeVectorMultiPolygonWithDonut.polygons, fakeVectorMultiPolygonWithDonut.field);

        const expectedPolygonFilter = [
          {
            geo_polygon: {
              location: {
                points:
                  [
                    [102, 2],
                    [103, 2],
                    [103, 3],
                    [102, 3],
                    [102, 2]
                  ]
              }
            }
          },
          {
            geo_polygon: {
              location: {
                points:
                  [
                    [0, 0],
                    [101, 0],
                    [101, 90],
                    [0, 90],
                    [0, 0]
                  ]
              }
            }
          }
        ];

        const expectedDonutsToExclude = [{
          geo_polygon: {
            location: {
              points:
                [
                  [25, 20],
                  [75, 20],
                  [75, 70],
                  [25, 70],
                  [25, 20]
                ]
            }
          }
        }];

        expect(result.polygonsToFilter).to.eql(expectedPolygonFilter);
        expect(result.donutsToExclude).to.eql(expectedDonutsToExclude);
      });
    });
  });
});
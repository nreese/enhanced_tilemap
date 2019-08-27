const _ = require('lodash');

const expect = require('expect.js');
const ngMock = require('ng_mock');
const sinon = require('sinon');

const CallbacksFactory = require('../../callbacks');
const fakePolygonObjects = require('./fakePolygonObjects.js');

describe('Kibi Enhanced Tilemap', () => {

  describe('callbacks', () => {
    let geoFilter;
    let callbacksFactory;

    beforeEach(() => {
      ngMock.module('kibana');
      ngMock.inject(function (Private, courier, config) {
        callbacksFactory = new CallbacksFactory(Private, courier, config);
        geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
      });
    });

    describe('polygon', () => {

      it(`the first set of coordinates should be equal to the last to produce a closed polygon`, () => {
        const geoFilterSpy = sinon.spy(geoFilter, 'add');

        let calledCount = 1;
        _.each(fakePolygonObjects, fakePolygonObject => {

          callbacksFactory.polygon(fakePolygonObject);
          const resultingPolygon = geoFilterSpy.getCall(0).args[0].geo_shape.geo_shape_polygon.shape.coordinates[0];

          const expectedPolygon = [
            [102, 2],
            [120, 2],
            [120, 20],
            [102, 20],
            [102, 2]
          ];

          sinon.assert.callCount(geoFilterSpy, calledCount);
          expect(resultingPolygon).to.eql(expectedPolygon);

          calledCount += 1;
        });
      });
    });
  });
});
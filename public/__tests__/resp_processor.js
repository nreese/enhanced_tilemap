import expect from 'expect.js';
import sinon from 'sinon';
import RespProcessor from '../resp_processor';

describe('Kibi Enhanced Tilemap - respProcessor', function () {

  it('should not call utils.getGeoExtents when empty buckets and geoJson.properties not available', function () {
    const getGeoExtentsSpy = sinon.spy();

    const fakeVis = {
      isHierarchical: function () {
        return true;
      }
    }

    const fakeUtils = {
      getGeoExtents: getGeoExtentsSpy
    };
    const fakeBuildChartData = function (data) {
      return data;
    }
    const fakeResp = {
      aggregations: {
        2: {
          filtered_geohash: {
            buckets: []
          }
        }
      }
    };

    const expectedData = {
      aggregations: {
        '2': {
          buckets: []
        }
      }
    };

    const respProcessor = new RespProcessor(fakeVis, fakeBuildChartData, fakeUtils);
    const chartData = respProcessor.process(fakeResp);

    sinon.assert.notCalled(getGeoExtentsSpy);
    expect(chartData).to.eql(expectedData);
  });

})


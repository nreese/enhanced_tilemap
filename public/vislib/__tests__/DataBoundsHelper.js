
import ngMock from 'ng_mock';
import sinon from 'sinon';
const expect = require('expect.js');

import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
const RespProcessor = require('plugins/enhanced_tilemap/resp_processor');

const fakeVis = {
  type: {
    schemas: {
      metrics: [{ name: 'testmetricname' }],
      all: {
        byName: {
          testmetricname: {}
        }
      }
    },
    responseConverter: () => {
    }
  },
  requesting: () => { },
  isHierarchical: () => { },
  aggs: [{ id: '1' }, { id: '2' }]
};
fakeVis.aggs.toDsl = function () {
  return {
    '2': {
      filter: {
        geo_bounding_box: {
          location: {
            top_left: {
              lat: 23.747745000000002,
              lon: -55.371095000000004
            },
            bottom_right: {
              lat: 0.5044849999999999,
              lon: -4.218755
            }
          }
        }
      }
    }
  };
};
fakeVis.aggs.bySchemaGroup = { metrics: '' };
fakeVis.aggs.getResponseAggs = () => { return []; };


const fakeChartData = {
  geoJson: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [36.5625, -73.125]
        },
        properties: {
          rectangle: [
            [33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]
          ]
        }
      }
    ]
  }
};

describe('Kibi Enhanced Tilemap', () => {
  describe('DataBoundsHelper', () => {

    let BoundsHelper;
    let SearchSource;

    beforeEach(ngMock.module('kibana'));
    beforeEach(() => {

      ngMock.inject(function (Private) {
        const SearchSourceStub = createSearchSourceStubProvider();
        Private.stub(SearchSourceProvider, SearchSourceStub);
        SearchSource = new SearchSourceStub();

        BoundsHelper = Private(require('plugins/enhanced_tilemap/vislib/DataBoundsHelper'));
        sinon.stub(RespProcessor.prototype, 'process').returns(fakeChartData);

      });
    });

    it('should have correct agg dsl and process max bounds correctly', function (done) {
      const field = 'location';
      const boundsHelper = new BoundsHelper(SearchSource, field);

      boundsHelper.getBoundsOfEntireDataSelection(fakeVis)
        .then((entireBounds) => {

          const expectedEntireBounds = {
            _southWest: {
              lat: 33.75,
              lng: -78.75
            },
            _northEast: {
              lat: 39.375,
              lng: -67.5
            }
          };

          const expectedAggsDsl = {
            geo_bounding_box: {
              [field]: {
                bottom_right: { lat: -90, lon: 180 },
                top_left: { lat: 90, lon: -180 }
              }
            }
          };

          const callBackOfAggs = SearchSource.aggs.getCalls()[0].args[0];
          const dsl = callBackOfAggs();

          expect(entireBounds).to.eql(expectedEntireBounds);
          expect(dsl[2].filter).to.eql(expectedAggsDsl);
          done();
        }).catch(done);

    });

    function createSearchSourceStubProvider() {
      const searchSourceStub = {};
      searchSourceStub.aggs = sinon.stub();
      searchSourceStub.filter = sinon.stub().returns(searchSourceStub);
      searchSourceStub.fetch = sinon.stub().resolves({});
      searchSourceStub.inherits = sinon.stub().returns(searchSourceStub);
      return function SearchSourceStubProvider() {
        return searchSourceStub;
      };
    }
  });
});
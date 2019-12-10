
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
const RespProcessor = require('plugins/enhanced_tilemap/resp_processor');
const expect = require('expect.js');

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
    responseConverter: (vis, table) => {

    }
  },
  isHierarchical: () => { },
  aggs: [
    {
      id: "1",
      enabled: true,
      type: "count",
      schema: "metric",
      params: {}
    },
    {
      id: "2",
      enabled: true,
      type: "geohash_grid",
      schema: "segment",
      params: {
        field: "location",
        autoPrecision: true,
        aggPrecisionType: "Performance",
        useGeocentroid: true,
        precision: 2
      }
    }],
};
fakeVis.aggs.bySchemaGroup = { metrics: '' };
fakeVis.aggs.getResponseAggs = () => { return []; };
fakeVis.aggs.toDsl = function () {
  return {
    "2": {
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
      },
      aggs: {
        filtered_geohash: {
          geohash_grid: {
            field: "location",
            precision: 3
          },
          aggs: {
            "3": {
              geo_centroid: {
                field: "location"
              }
            }
          }
        }
      }
    }
  };
};

const fakeSearchResponses = {
  "took": 30,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": 3,
    "max_score": 0,
    "hits": {
    }
  },
  "aggregations": {
    "2": {}
  },
  "planner": {
    "node": "t7t_5TgYSDG0mwyZIDlZGA",
    "took_in_millis": 31,
    "timestamp": {
      "start_in_millis": 1575991613435,
      "stop_in_millis": 1575991613466,
      "took_in_millis": 31
    },
    "is_pruned": false
  },
  "status": 200
};

const fakeChartData = {
  "title": null,
  "geohashGridAgg": {
    "id": "2",
    "enabled": true,
    "type": "geohash_grid",
    "schema": "segment",
    "params": {
      "field": "location",
      "autoPrecision": true,
      "aggPrecisionType": "Performance",
      "useGeocentroid": true,
      "precision": 2
    }
  },
  "geoJson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [
            177,
            -87
          ]
        }
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [
            -176,
            86
          ]
        }
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [
            -0,
            0
          ]
        }
      }
    ]
  },
  "hits": 26923
};

describe('DataBoundsHelper', () => {

  let aggSpy;
  let BoundsHelper;
  let SearchSource;
  let testAggs;
  //const vis = {};

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {

    ngMock.inject(function (Private) {
      SearchSource = Private(SearchSourceProvider);
      BoundsHelper = Private(require('plugins/enhanced_tilemap/vislib/DataBoundsHelper'));


      // SearchSource.prototype.aggs = cb => testAggs = cb();
      // sinon.stub(SearchSource.prototype, 'aggs').callsFake(cb => testAggs = cb());
      sinon.stub(SearchSource.prototype, 'fetch').returns(Promise.resolve(fakeSearchResponses));
      sinon.stub(RespProcessor.prototype, 'process').returns(fakeChartData);

    });
  });


  it('should have correct agg dsl and process max bounds correctly', function (done) {
    const params = {
      SearchSource,
      field: 'location'
    };

    const boundsHelper = new BoundsHelper(params);
    sinon.stub(SearchSource.prototype, 'aggs').callsFake(cb => testAggs = cb());

    // aggSpy = sinon.spy('aggs');
    // boundsHelper.searchSource.aggSpy()
    //   .then(d => { console.log('edwin ', d); });

    boundsHelper.getBoundsOfEntireDataSelection(fakeVis)
      .then((entireBounds) => {

        console.log(testAggs);

        const expectedEntireBounds = {
          _southWest: {
            lat: -87,
            lng: -176
          },
          _northEast: {
            lat: 86,
            lng: 177
          }
        };

        const expectedAggsDsl = {
          geo_bounding_box: {
            [params.field]: {
              bottom_right: { lat: -90, lon: 180 },
              top_left: { lat: 90, lon: -180 }
            }
          }
        };

        expect(entireBounds).to.eql(expectedEntireBounds);
        expect(expectedAggsDsl).to.eql(expectedAggsDsl);

        done();
      }).catch(done);

  });
});

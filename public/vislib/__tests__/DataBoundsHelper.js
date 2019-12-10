
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

const fakeVis = require('./fakesForDataBoundsHelper').vis;
const fakeSearchResponse = require('./fakesForDataBoundsHelper').fakeSearchResponse;

describe('DataBoundsHelper', () => {

  let aggs;
  let searchResp;
  let BoundsHelper;
  let SearchSource;
  //const vis = {};

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {

    ngMock.inject(function (Private) {
      SearchSource = Private(SearchSourceProvider);
      BoundsHelper = Private(require('plugins/enhanced_tilemap/vislib/DataBoundsHelper'));
      console.log(SearchSource);

      SearchSource.prototype.aggs = cb => aggs = cb();
      // sinon.stub(SearchSource.prototype, 'aggs').callsFake(cb => aggs = cb());
      sinon.stub(SearchSource.prototype, 'fetch').returns(Promise.resolve(fakeSearchResponse));
    });


  });


  it('should send correct query', function () {
    const params = {
      SearchSource,
      field: 'location'
    };
    const boundsHelper = new BoundsHelper(params);
    boundsHelper.getBoundsOfEntireDataSelection(fakeVis);
    console.log(searchResp);
    console.log(aggs);


    // const vis = {
    //   requesting: () => {},
    //   aggs: {
    //     toDsl: () => {}
    //   }
    // };


    // console.log(respFromBoundsHelper);


    // const addSearchSourceFetchSpy = sinon.spy(searchSource, 'fetch');



    // console.log(addSearchSourceFetchSpy);


    // searchSource.crankResults(results);
    // $scope.$digest();

    // const expectedFilters = [{
    //   query: {
    //     ids: {
    //       type: 'apache',
    //       values: ['61']
    //     }
    //   },
    //   meta: {
    //     index: 'index-pattern:logstash-*'
    //   }
    // }];

    // // check on next tick
    // setTimeout(function () {
    //   expect($scope.timeline.itemsData.length).to.be(1);
    //   simulateClickOnItem($elem);
    //   sinon.assert.calledOnce(addFilterSpy);
    //   sinon.assert.calledWith(addFilterSpy, expectedFilters);
    //   done();
    // }, 200);
  });
});

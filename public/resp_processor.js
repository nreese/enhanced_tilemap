import _ from 'lodash';

export default class RespProcessor {
	constructor(vis, buildChartData, utils) {
		this.buildChartData = buildChartData;
    this.utils = utils;
    this.vis = vis;
	}

  process(resp) {
    const respClone = _.cloneDeep(resp);
    const aggs = respClone.aggregations;
    _.keys(aggs).forEach(function (key) {
      if (_.has(aggs[key], 'filtered_geohash')) {
        aggs[key].buckets = aggs[key].filtered_geohash.buckets;
        delete aggs[key].filtered_geohash;
      }
    });

    const chartData = this.buildChartData(respClone);
    if (_.get(chartData, 'geoJson.properties')) {
      const geoMinMax = this.utils.getGeoExtents(chartData);
      chartData.geoJson.properties.allmin = geoMinMax.min;
      chartData.geoJson.properties.allmax = geoMinMax.max;
    }
    return chartData;
  }
}

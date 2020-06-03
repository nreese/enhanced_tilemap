
const L = require('leaflet');
const _ = require('lodash');
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { VislibVisTypeBuildChartDataProvider } from 'ui/vislib_vis_type/build_chart_data';
import { onDashboardPage } from 'ui/kibi/utils/on_page';

define(function () {
  return function BoundsHelperFactory(Private) {

    const SearchSource = Private(SearchSourceProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const buildChartData = Private(VislibVisTypeBuildChartDataProvider);
    const RespProcessor = require('plugins/enhanced_tilemap/resp_processor');
    const utils = require('plugins/enhanced_tilemap/utils');

    class BoundsHelper {
      constructor(searchSource, field) {
        this.searchSource = searchSource;
        this.field = field;
      }

      getBoundsOfEntireDataSelection(vis) {
        const respProcessor = new RespProcessor(vis, buildChartData, utils);
        //retrieving hits from all over map extent, even those outside of the current map extent
        let maxLat = -90;
        let maxLon = -180;
        let minLat = 90;
        let minLon = 180;

        const searchSource = new SearchSource();
        // inherits from the savedSearch search source instead of main
        searchSource.inherits(this.searchSource);
        //_siren from main searchSource is used
        searchSource._siren = this.searchSource._siren;
        //uses query filter if in vis edit mode
        if (!onDashboardPage()) {
          searchSource.filter(queryFilter.getFilters());
        }

        searchSource.aggs(() => {
          vis.requesting();
          const dsl = vis.aggs.toDsl();
          //Replacing the map canvas geo filter with bounds of entire world for request
          dsl[2].filter = {
            geo_bounding_box: {
              [this.field]: {
                bottom_right: { lat: -90, lon: 180 },
                top_left: { lat: 90, lon: -180 }
              }
            }
          };
          return dsl;
        });

        return searchSource.fetch()
          .then(searchResp => {
            const chartData = respProcessor.process(searchResp);
            if (_.has(chartData, 'geoJson.features') >= 1) {
              chartData.geoJson.features.forEach(feature => {
                const geohashRect = _.get(feature, 'properties.rectangle');
                const currentTopLeftLat = geohashRect[3][0];
                const currentTopLeftLon = geohashRect[3][1];
                const currentBottomRightLat = geohashRect[1][0];
                const currentBottomRightLon = geohashRect[1][1];

                if (currentTopLeftLat > maxLat) maxLat = currentTopLeftLat;
                if (currentBottomRightLon > maxLon) maxLon = currentBottomRightLon;
                if (currentBottomRightLat < minLat) minLat = currentBottomRightLat;
                if (currentTopLeftLon < minLon) minLon = currentTopLeftLon;
              });


              const topLeft = L.latLng(maxLat, minLon);
              const bottomRight = L.latLng(minLat, maxLon);
              return L.latLngBounds(topLeft, bottomRight);
            } else {
              console.warn('Unable to fit bounds as no data were detected');
            }
          });
      }
    }
    return BoundsHelper;
  };
});

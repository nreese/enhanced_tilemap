const _ = require('lodash');
const L = require('leaflet');
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

define(function () {
  return function BoundsHelperFactory(
    Private, savedSearches) {

    const SearchSource = Private(SearchSourceProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);

    class BoundsHelper {
      constructor(params) {
        this.searchSource = params.searchSource;
        this.field = params.field;
      };

      getBoundsOfEntireDataSelection() {
        //retrieving hits from all over map extent, even those outside of the current map extent
        let maxLat = -90;
        let maxLon = -180;
        let minLat = 90;
        let minLon = 180;

        return savedSearches.get(this.savedSearchId)
          .then(savedSearch => {
            const searchSource = new SearchSource();
            searchSource.inherits(this.searchSource);
            searchSource.filter(queryFilter.getFilters());
            searchSource.size(500);

            return searchSource.fetch()
              .then(searchResp => {
                searchResp.hits.hits.forEach(hit => {


                  if (hit && hit._source && hit._source[this.field]) {
                    const coordinates = hit._source[this.field].split(',');
                    const currentLon = Number(coordinates[1]);
                    const currentLat = Number(coordinates[0]);

                    if (currentLat > maxLat) maxLat = currentLat;
                    if (currentLon > maxLon) maxLon = currentLon;
                    if (currentLat < minLat) minLat = currentLat;
                    if (currentLon < minLon) minLon = currentLon;
                  };
                });

                const topRight = L.latLng(maxLat, maxLon);
                const bottomLeft = L.latLng(minLat, minLon);
                return L.latLngBounds(topRight, bottomLeft);
              });
          });
      };
    }
    return BoundsHelper;
  };
});